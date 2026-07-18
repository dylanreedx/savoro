-- Migration number: 0011 	 2026-07-22
-- On-prem food reference data. Nutrition columns are always per 100 g;
-- household servings store only their gram conversion and are derived in DTOs.
create table foods (
  id text primary key,
  source text not null,
  source_id text not null,
  name text not null,
  brand text,
  category text,
  calories_per_100g real not null check (calories_per_100g >= 0),
  protein_grams_per_100g real not null check (protein_grams_per_100g >= 0),
  carbs_grams_per_100g real not null check (carbs_grams_per_100g >= 0),
  fat_grams_per_100g real not null check (fat_grams_per_100g >= 0),
  fiber_grams_per_100g real check (fiber_grams_per_100g >= 0),
  sodium_milligrams_per_100g real check (sodium_milligrams_per_100g >= 0),
  unique(source, source_id)
);

-- LIKE search is case-insensitive and ordered by name; this index also supports
-- deterministic cursor scans without adding an FTS dependency for the MVP.
create index idx_foods_name_search on foods(name collate nocase, id);

create table food_servings (
  id text primary key,
  food_id text not null references foods(id) on delete cascade,
  source_id text,
  description text not null,
  gram_weight real not null check (gram_weight > 0),
  is_default integer not null default 0 check (is_default in (0, 1)),
  sort_order integer not null default 0
);

create unique index uq_food_servings_source
  on food_servings(food_id, source_id)
  where source_id is not null;
create unique index uq_food_servings_default
  on food_servings(food_id)
  where is_default = 1;
create index idx_food_servings_food_order
  on food_servings(food_id, is_default desc, sort_order, id);
