-- Small deterministic USDA-shaped fixture for endpoint tests and local development.
-- Macro values are representative per-100g values; this is not the deferred SR Legacy import.

insert into foods (
  id, source, source_id, name, brand, category,
  calories_per_100g, protein_grams_per_100g, carbs_grams_per_100g,
  fat_grams_per_100g, fiber_grams_per_100g, sodium_milligrams_per_100g
) values
  ('food_fixture_almonds', 'usda', 'fixture-almonds', 'Almonds, raw', null, 'Nut and Seed Products', 579, 21.15, 21.55, 49.93, 12.5, 1),
  ('food_fixture_avocado', 'usda', 'fixture-avocado', 'Avocados, raw, all commercial varieties', null, 'Vegetables and Vegetable Products', 160, 2, 8.53, 14.66, 6.7, 7),
  ('food_fixture_banana', 'usda', 'fixture-banana', 'Bananas, raw', null, 'Fruits and Fruit Juices', 89, 1.09, 22.84, 0.33, 2.6, 1),
  ('food_fixture_black_beans', 'usda', 'fixture-black-beans', 'Beans, black, mature seeds, cooked, boiled', null, 'Legumes and Legume Products', 132, 8.86, 23.71, 0.54, 8.7, 1),
  ('food_fixture_broccoli', 'usda', 'fixture-broccoli', 'Broccoli, raw', null, 'Vegetables and Vegetable Products', 34, 2.82, 6.64, 0.37, 2.6, 33),
  ('food_fixture_brown_rice', 'usda', 'fixture-brown-rice', 'Rice, brown, long-grain, cooked', null, 'Cereal Grains and Pasta', 123, 2.74, 25.58, 0.97, 1.6, 4),
  ('food_fixture_chicken_breast', 'usda', 'fixture-chicken-breast', 'Chicken, broilers or fryers, breast, meat only, roasted', null, 'Poultry Products', 165, 31.02, 0, 3.57, 0, 74),
  ('food_fixture_egg', 'usda', 'fixture-egg', 'Egg, whole, cooked, hard-boiled', null, 'Dairy and Egg Products', 155, 12.58, 1.12, 10.61, 0, 124),
  ('food_fixture_greek_yogurt', 'usda', 'fixture-greek-yogurt', 'Yogurt, Greek, plain, nonfat', null, 'Dairy and Egg Products', 59, 10.19, 3.6, 0.39, 0, 36),
  ('food_fixture_milk', 'usda', 'fixture-whole-milk', 'Milk, whole, 3.25% milkfat', null, 'Dairy and Egg Products', 61, 3.15, 4.8, 3.25, 0, 43),
  ('food_fixture_oats', 'usda', 'fixture-oats', 'Oats, regular and quick, dry', null, 'Cereal Grains and Pasta', 379, 13.15, 67.7, 6.52, 10.1, 6),
  ('food_fixture_salmon', 'usda', 'fixture-salmon', 'Salmon, Atlantic, farmed, cooked, dry heat', null, 'Finfish and Shellfish Products', 206, 22.1, 0, 12.35, 0, 61)
on conflict(source, source_id) do update set
  name = excluded.name,
  brand = excluded.brand,
  category = excluded.category,
  calories_per_100g = excluded.calories_per_100g,
  protein_grams_per_100g = excluded.protein_grams_per_100g,
  carbs_grams_per_100g = excluded.carbs_grams_per_100g,
  fat_grams_per_100g = excluded.fat_grams_per_100g,
  fiber_grams_per_100g = excluded.fiber_grams_per_100g,
  sodium_milligrams_per_100g = excluded.sodium_milligrams_per_100g;

insert into food_servings (id, food_id, source_id, description, gram_weight, is_default, sort_order) values
  ('fsv_fixture_almonds_100g', 'food_fixture_almonds', null, '100 g', 100, 1, 0),
  ('fsv_fixture_almonds_ounce', 'food_fixture_almonds', 'fixture-almonds-ounce', '1 oz', 28.35, 0, 1),
  ('fsv_fixture_avocado_100g', 'food_fixture_avocado', null, '100 g', 100, 1, 0),
  ('fsv_fixture_avocado_half', 'food_fixture_avocado', 'fixture-avocado-half', '1/2 avocado', 68, 0, 1),
  ('fsv_fixture_banana_100g', 'food_fixture_banana', null, '100 g', 100, 1, 0),
  ('fsv_fixture_banana_medium', 'food_fixture_banana', 'fixture-banana-medium', '1 medium', 118, 0, 1),
  ('fsv_fixture_black_beans_100g', 'food_fixture_black_beans', null, '100 g', 100, 1, 0),
  ('fsv_fixture_black_beans_cup', 'food_fixture_black_beans', 'fixture-black-beans-cup', '1 cup', 172, 0, 1),
  ('fsv_fixture_broccoli_100g', 'food_fixture_broccoli', null, '100 g', 100, 1, 0),
  ('fsv_fixture_broccoli_cup', 'food_fixture_broccoli', 'fixture-broccoli-cup', '1 cup, chopped', 91, 0, 1),
  ('fsv_fixture_brown_rice_100g', 'food_fixture_brown_rice', null, '100 g', 100, 1, 0),
  ('fsv_fixture_brown_rice_cup', 'food_fixture_brown_rice', 'fixture-brown-rice-cup', '1 cup', 195, 0, 1),
  ('fsv_fixture_chicken_breast_100g', 'food_fixture_chicken_breast', null, '100 g', 100, 1, 0),
  ('fsv_fixture_chicken_breast_piece', 'food_fixture_chicken_breast', 'fixture-chicken-breast-piece', '1 breast', 172, 0, 1),
  ('fsv_fixture_egg_100g', 'food_fixture_egg', null, '100 g', 100, 1, 0),
  ('fsv_fixture_egg_large', 'food_fixture_egg', 'fixture-egg-large', '1 large', 50, 0, 1),
  ('fsv_fixture_greek_yogurt_100g', 'food_fixture_greek_yogurt', null, '100 g', 100, 1, 0),
  ('fsv_fixture_greek_yogurt_container', 'food_fixture_greek_yogurt', 'fixture-yogurt-container', '1 container', 170, 0, 1),
  ('fsv_fixture_milk_100g', 'food_fixture_milk', null, '100 g', 100, 1, 0),
  ('fsv_fixture_milk_cup', 'food_fixture_milk', 'fixture-milk-cup', '1 cup', 244, 0, 1),
  ('fsv_fixture_oats_100g', 'food_fixture_oats', null, '100 g', 100, 1, 0),
  ('fsv_fixture_oats_half_cup', 'food_fixture_oats', 'fixture-oats-half-cup', '1/2 cup', 40, 0, 1),
  ('fsv_fixture_salmon_100g', 'food_fixture_salmon', null, '100 g', 100, 1, 0),
  ('fsv_fixture_salmon_fillet', 'food_fixture_salmon', 'fixture-salmon-fillet', '1 fillet', 154, 0, 1)
on conflict(id) do update set
  food_id = excluded.food_id,
  source_id = excluded.source_id,
  description = excluded.description,
  gram_weight = excluded.gram_weight,
  is_default = excluded.is_default,
  sort_order = excluded.sort_order;
