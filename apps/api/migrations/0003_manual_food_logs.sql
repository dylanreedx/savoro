-- Migration number: 0003 	 2026-06-10
-- Manual food logging (SAV-124): allow item_type='food' rows with no food
-- database row when source_type='manual'. SQLite cannot alter a CHECK
-- constraint, so the table is rebuilt in place. No table references
-- food_log_entries, so the drop/rename is safe. Synthesizing fake food rows
-- instead (the WIP-branch pattern) is explicitly rejected by ADR 0001.

PRAGMA defer_foreign_keys = true;

create table food_log_entries_new (
  id text primary key,
  user_id text not null references users(id),
  log_date text not null,
  meal_type text not null check (meal_type in ('breakfast','lunch','dinner','snack')),

  item_type text not null check (item_type in ('food','recipe')),
  food_id text,
  serving_id text,
  recipe_id text references recipes(id),
  recipe_version_id text references recipe_versions(id),

  quantity real not null,
  quantity_unit text not null,

  -- Frozen nutrition snapshot captured at write time. Historical totals
  -- read these columns only, never current recipe_versions rows.
  snapshot_display_name text not null,
  snapshot_calories real not null,
  snapshot_protein_grams real not null,
  snapshot_carbs_grams real not null,
  snapshot_fat_grams real not null,
  snapshot_fiber_grams real,
  snapshot_sodium_milligrams real,
  snapshot_source_label text,
  snapshot_captured_at text not null,

  source_type text not null,
  privacy_domain text not null default 'private_user_data',

  created_at text not null,
  updated_at text not null,

  check (
    (item_type = 'recipe' and recipe_id is not null and recipe_version_id is not null and food_id is null and serving_id is null)
    or
    (item_type = 'food' and (food_id is not null or source_type = 'manual') and recipe_id is null and recipe_version_id is null)
  )
);

insert into food_log_entries_new select * from food_log_entries;

drop table food_log_entries;

alter table food_log_entries_new rename to food_log_entries;

create index idx_food_logs_user_date on food_log_entries(user_id, log_date);
create index idx_food_logs_recipe_version on food_log_entries(recipe_version_id);
