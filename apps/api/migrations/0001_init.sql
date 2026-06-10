-- Migration number: 0001 	 2026-06-10
create table users (
  id text primary key,
  email text unique,
  display_name text,
  created_at text not null,
  updated_at text not null
);

create table sessions (
  id text primary key,
  user_id text not null references users(id),
  token_hash text not null unique,
  expires_at text not null,
  created_at text not null,
  last_used_at text,
  revoked_at text
);

create index idx_sessions_user on sessions(user_id);

create table recipes (
  id text primary key,
  owner_user_id text not null references users(id),
  visibility text not null check (visibility in ('private','unlisted','public')),
  status text not null check (status in ('draft','published','archived')),
  current_version_id text,
  created_at text not null,
  updated_at text not null
);

create index idx_recipes_owner_status on recipes(owner_user_id, status);

create table recipe_versions (
  id text primary key,
  recipe_id text not null references recipes(id),
  version_number integer not null,
  title text not null,
  servings real not null,
  -- Per-serving macros for this immutable version.
  calories real not null,
  protein_grams real not null,
  carbs_grams real not null,
  fat_grams real not null,
  fiber_grams real,
  sodium_milligrams real,
  created_at text not null,
  unique(recipe_id, version_number)
);

create index idx_recipe_versions_recipe on recipe_versions(recipe_id, version_number);

create table food_log_entries (
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
    (item_type = 'food' and food_id is not null and recipe_id is null and recipe_version_id is null)
  )
);

create index idx_food_logs_user_date on food_log_entries(user_id, log_date);
create index idx_food_logs_recipe_version on food_log_entries(recipe_version_id);

create table goals (
  id text primary key,
  user_id text not null references users(id),
  calories real not null,
  protein_grams real not null,
  carbs_grams real not null,
  fat_grams real not null,
  fiber_grams real,
  sodium_milligrams real,
  start_date text not null,
  end_date text,
  created_at text not null,
  updated_at text not null
);

create index idx_goals_user_dates on goals(user_id, start_date);
