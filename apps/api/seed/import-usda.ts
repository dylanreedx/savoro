#!/usr/bin/env bun
/**
 * Converts a local USDA FoodData Central SR Legacy CSV export into D1 SQL files.
 * This script never downloads data or connects to D1.
 */
import { createReadStream } from 'node:fs'
import { mkdir, readdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

const NUTRIENT_FIELDS = {
  '1008': 'calories',
  '1003': 'proteinGrams',
  '1005': 'carbsGrams',
  '1004': 'fatGrams',
  '1079': 'fiberGrams',
  '1093': 'sodiumMilligrams',
} as const

type NutrientField = (typeof NUTRIENT_FIELDS)[keyof typeof NUTRIENT_FIELDS]
type Nutrients = Partial<Record<NutrientField, number>>

interface SourceFood {
  fdcId: string
  name: string
  categoryId: string | null
}

interface SourcePortion {
  sourceId: string
  description: string
  gramWeight: number
  sortOrder: number
}

interface ImportedFood extends SourceFood {
  category: string | null
  nutrients: Required<Pick<Nutrients, 'calories' | 'proteinGrams' | 'carbsGrams' | 'fatGrams'>> &
    Pick<Nutrients, 'fiberGrams' | 'sodiumMilligrams'>
  portions: SourcePortion[]
}

interface Options {
  csvDirectory: string
  outputDirectory: string
  batchSize: number
}

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2))
  const files = requiredFiles(options.csvDirectory)

  console.log(`Reading SR Legacy CSV files from ${options.csvDirectory}`)
  const [categories, measureUnits, foods, nutrients] = await Promise.all([
    loadLookup(files.foodCategory, 'id', 'description'),
    loadLookup(files.measureUnit, 'id', 'name'),
    loadFoods(files.food),
    loadNutrients(files.foodNutrient),
  ])
  const eligibleIds = new Set(
    [...foods.values()]
      .filter((food) => hasCoreMacros(nutrients.get(food.fdcId)))
      .map((food) => food.fdcId),
  )
  const portions = await loadPortions(files.foodPortion, measureUnits, eligibleIds)

  const importedFoods: ImportedFood[] = []
  let skipped = 0
  for (const food of foods.values()) {
    const foodNutrients = nutrients.get(food.fdcId)
    if (!hasCoreMacros(foodNutrients)) {
      skipped++
      continue
    }
    importedFoods.push({
      ...food,
      category: food.categoryId === null ? null : categories.get(food.categoryId) ?? null,
      nutrients: foodNutrients,
      portions: portions.get(food.fdcId) ?? [],
    })
  }
  importedFoods.sort((a, b) => a.fdcId.localeCompare(b.fdcId, 'en', { numeric: true }))

  const filesWritten = await writeSqlBatches(importedFoods, options)
  const servingCount = importedFoods.reduce((total, food) => total + food.portions.length + 1, 0)
  console.log(
    `Wrote ${filesWritten} SQL batch(es): ${importedFoods.length} foods, ${servingCount} servings; ` +
      `${skipped} foods skipped for missing core macros.`,
  )
  console.log('No D1 command was run. Apply the generated files with Wrangler when ready.')
}

function parseOptions(args: string[]): Options {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'Usage: bun run seed/import-usda.ts <sr-legacy-csv-directory> ' +
        '[--output <directory>] [--batch-size <1-1000>]',
    )
    process.exit(0)
  }

  let csvDirectory: string | undefined
  let outputDirectory = path.resolve('seed/generated-usda')
  let batchSize = 200
  for (let index = 0; index < args.length; index++) {
    const argument = args[index]
    if (argument === '--output') {
      outputDirectory = path.resolve(requireOptionValue(args, ++index, '--output'))
    } else if (argument === '--batch-size') {
      const raw = requireOptionValue(args, ++index, '--batch-size')
      if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > 1000) {
        throw new Error('--batch-size must be an integer from 1 to 1000.')
      }
      batchSize = Number(raw)
    } else if (argument.startsWith('-')) {
      throw new Error(`Unknown option: ${argument}`)
    } else if (csvDirectory === undefined) {
      csvDirectory = path.resolve(argument)
    } else {
      throw new Error(`Unexpected argument: ${argument}`)
    }
  }

  if (csvDirectory === undefined) {
    throw new Error('A path to the extracted SR Legacy CSV directory is required. Use --help for usage.')
  }
  return { csvDirectory, outputDirectory, batchSize }
}

function requireOptionValue(args: string[], index: number, option: string): string {
  const value = args[index]
  if (!value || value.startsWith('-')) throw new Error(`${option} requires a value.`)
  return value
}

function requiredFiles(csvDirectory: string) {
  const file = (name: string) => path.join(csvDirectory, name)
  return {
    food: file('food.csv'),
    foodNutrient: file('food_nutrient.csv'),
    foodCategory: file('food_category.csv'),
    foodPortion: file('food_portion.csv'),
    measureUnit: file('measure_unit.csv'),
  }
}

async function loadLookup(
  filePath: string,
  idColumn: string,
  valueColumn: string,
): Promise<Map<string, string>> {
  const lookup = new Map<string, string>()
  for await (const row of readCsv(filePath)) {
    const id = clean(row[idColumn])
    const value = clean(row[valueColumn])
    if (id && value) lookup.set(id, value)
  }
  return lookup
}

async function loadFoods(filePath: string): Promise<Map<string, SourceFood>> {
  const foods = new Map<string, SourceFood>()
  for await (const row of readCsv(filePath)) {
    const fdcId = clean(row.fdc_id)
    const name = clean(row.description)
    if (!fdcId || !name) continue
    foods.set(fdcId, {
      fdcId,
      name,
      categoryId: clean(row.food_category_id) || null,
    })
  }
  return foods
}

async function loadNutrients(filePath: string): Promise<Map<string, Nutrients>> {
  const nutrients = new Map<string, Nutrients>()
  for await (const row of readCsv(filePath)) {
    const field = NUTRIENT_FIELDS[clean(row.nutrient_id) as keyof typeof NUTRIENT_FIELDS]
    if (!field) continue
    const fdcId = clean(row.fdc_id)
    const amount = finiteNumber(row.amount)
    if (!fdcId || amount === undefined || amount < 0) continue
    const values = nutrients.get(fdcId) ?? {}
    values[field] = amount
    nutrients.set(fdcId, values)
  }
  return nutrients
}

async function loadPortions(
  filePath: string,
  measureUnits: Map<string, string>,
  eligibleFoodIds: Set<string>,
): Promise<Map<string, SourcePortion[]>> {
  const portions = new Map<string, SourcePortion[]>()
  for await (const row of readCsv(filePath)) {
    const fdcId = clean(row.fdc_id)
    if (!eligibleFoodIds.has(fdcId)) continue
    const sourceId = clean(row.id)
    const gramWeight = finiteNumber(row.gram_weight)
    if (!sourceId || gramWeight === undefined || gramWeight <= 0) continue

    const list = portions.get(fdcId) ?? []
    list.push({
      sourceId,
      description: portionDescription(row, measureUnits),
      gramWeight,
      sortOrder: positiveInteger(row.seq_num) ?? list.length + 1,
    })
    portions.set(fdcId, list)
  }
  for (const list of portions.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder || a.sourceId.localeCompare(b.sourceId))
  }
  return portions
}

function portionDescription(row: Record<string, string>, measureUnits: Map<string, string>): string {
  const provided = clean(row.portion_description)
  if (provided) return provided

  const amount = finiteNumber(row.amount)
  const unit = measureUnits.get(clean(row.measure_unit_id)) ?? 'serving'
  const modifier = clean(row.modifier)
  return [amount === undefined ? null : formatNumber(amount), unit, modifier || null]
    .filter((part): part is string => part !== null)
    .join(' ')
}

async function writeSqlBatches(foods: ImportedFood[], options: Options): Promise<number> {
  await mkdir(options.outputDirectory, { recursive: true })
  const existingSql = (await readdir(options.outputDirectory)).filter((name) => name.endsWith('.sql'))
  if (existingSql.length > 0) {
    throw new Error(
      `Output directory already contains SQL files (${options.outputDirectory}). ` +
        'Remove them or choose another --output directory.',
    )
  }

  let filesWritten = 0
  for (let start = 0; start < foods.length; start += options.batchSize) {
    const batch = foods.slice(start, start + options.batchSize)
    const lines = [
      '-- Generated locally by seed/import-usda.ts from USDA SR Legacy CSV files.',
      '-- Idempotent deterministic upserts; apply only after D1 migrations.',
      'pragma foreign_keys = on;',
    ]
    for (const food of batch) lines.push(...foodStatements(food))

    filesWritten++
    const fileName = `${String(filesWritten).padStart(4, '0')}.sql`
    await writeFile(path.join(options.outputDirectory, fileName), `${lines.join('\n')}\n`, 'utf8')
  }
  return filesWritten
}

function foodStatements(food: ImportedFood): string[] {
  const foodId = `food_usda_${identifierPart(food.fdcId)}`
  const n = food.nutrients
  const statements = [
    `insert into foods (` +
      `id, source, source_id, name, brand, category, calories_per_100g, ` +
      `protein_grams_per_100g, carbs_grams_per_100g, fat_grams_per_100g, ` +
      `fiber_grams_per_100g, sodium_milligrams_per_100g` +
      `) values (` +
      [
        sqlText(foodId),
        sqlText('usda'),
        sqlText(food.fdcId),
        sqlText(food.name),
        'null',
        sqlText(food.category),
        sqlNumber(n.calories),
        sqlNumber(n.proteinGrams),
        sqlNumber(n.carbsGrams),
        sqlNumber(n.fatGrams),
        sqlNumber(n.fiberGrams),
        sqlNumber(n.sodiumMilligrams),
      ].join(', ') +
      `) on conflict(id) do update set ` +
      `source = excluded.source, source_id = excluded.source_id, name = excluded.name, ` +
      `brand = excluded.brand, category = excluded.category, ` +
      `calories_per_100g = excluded.calories_per_100g, ` +
      `protein_grams_per_100g = excluded.protein_grams_per_100g, ` +
      `carbs_grams_per_100g = excluded.carbs_grams_per_100g, ` +
      `fat_grams_per_100g = excluded.fat_grams_per_100g, ` +
      `fiber_grams_per_100g = excluded.fiber_grams_per_100g, ` +
      `sodium_milligrams_per_100g = excluded.sodium_milligrams_per_100g;`,
    servingStatement({
      id: `fsv_usda_${identifierPart(food.fdcId)}_100g`,
      foodId,
      sourceId: null,
      description: '100 g',
      gramWeight: 100,
      isDefault: true,
      sortOrder: 0,
    }),
  ]

  for (const portion of food.portions) {
    statements.push(
      servingStatement({
        id: `fsv_usda_${identifierPart(food.fdcId)}_${identifierPart(portion.sourceId)}`,
        foodId,
        sourceId: portion.sourceId,
        description: portion.description,
        gramWeight: portion.gramWeight,
        isDefault: false,
        sortOrder: portion.sortOrder,
      }),
    )
  }
  return statements
}

function servingStatement(serving: {
  id: string
  foodId: string
  sourceId: string | null
  description: string
  gramWeight: number
  isDefault: boolean
  sortOrder: number
}): string {
  return (
    `insert into food_servings (` +
    `id, food_id, source_id, description, gram_weight, is_default, sort_order` +
    `) values (` +
    [
      sqlText(serving.id),
      sqlText(serving.foodId),
      sqlText(serving.sourceId),
      sqlText(serving.description),
      sqlNumber(serving.gramWeight),
      serving.isDefault ? '1' : '0',
      String(serving.sortOrder),
    ].join(', ') +
    `) on conflict(id) do update set ` +
    `food_id = excluded.food_id, source_id = excluded.source_id, ` +
    `description = excluded.description, gram_weight = excluded.gram_weight, ` +
    `is_default = excluded.is_default, sort_order = excluded.sort_order;`
  )
}

async function* readCsv(filePath: string): AsyncGenerator<Record<string, string>> {
  let headers: string[] | undefined
  for await (const values of csvRows(filePath)) {
    if (headers === undefined) {
      headers = values.map((value, index) => (index === 0 ? value.replace(/^\uFEFF/, '') : value))
      continue
    }
    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index] ?? ''
    })
    yield row
  }
}

/** Streaming RFC 4180 parser, including escaped quotes and quoted newlines. */
async function* csvRows(filePath: string): AsyncGenerator<string[]> {
  const stream = createReadStream(filePath, { encoding: 'utf8' })
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let pendingQuote = false

  for await (const chunk of stream) {
    for (const character of chunk) {
      let current: string | undefined = character
      while (current !== undefined) {
        if (inQuotes) {
          if (pendingQuote) {
            if (current === '"') {
              field += '"'
              pendingQuote = false
              current = undefined
            } else {
              inQuotes = false
              pendingQuote = false
            }
          } else if (current === '"') {
            pendingQuote = true
            current = undefined
          } else {
            field += current
            current = undefined
          }
          continue
        }

        if (current === '"' && field === '') {
          inQuotes = true
        } else if (current === ',') {
          row.push(field)
          field = ''
        } else if (current === '\n') {
          row.push(field)
          field = ''
          if (row.some((value) => value !== '')) yield row
          row = []
        } else if (current !== '\r') {
          field += current
        }
        current = undefined
      }
    }
  }

  if (inQuotes && !pendingQuote) throw new Error(`Unterminated quoted CSV field in ${filePath}`)
  if (field !== '' || row.length > 0) {
    row.push(field)
    yield row
  }
}

function hasCoreMacros(
  nutrients: Nutrients | undefined,
): nutrients is ImportedFood['nutrients'] {
  return (
    nutrients?.calories !== undefined &&
    nutrients.proteinGrams !== undefined &&
    nutrients.carbsGrams !== undefined &&
    nutrients.fatGrams !== undefined
  )
}

function finiteNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function positiveInteger(value: string | undefined): number | undefined {
  const parsed = finiteNumber(value)
  return parsed !== undefined && Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, '').replace(/\.$/, '')
}

function clean(value: string | undefined): string {
  return value?.trim() ?? ''
}

function identifierPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_')
}

function sqlText(value: string | null): string {
  return value === null ? 'null' : `'${value.replace(/\0/g, '').replace(/'/g, "''")}'`
}

function sqlNumber(value: number | undefined): string {
  return value === undefined ? 'null' : String(value)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
