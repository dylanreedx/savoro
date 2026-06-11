-- Migration number: 0002 	 2026-06-10
-- Recipe create/edit (SAV-127): slug on recipes, description on versions,
-- and per-version ingredient/step content tables.

alter table recipes add column slug text not null default '';

-- Backfill any pre-existing rows so the unique index below can be created.
update recipes set slug = id where slug = '';

create unique index uq_recipes_owner_slug on recipes(owner_user_id, slug);

alter table recipe_versions add column description text;

create table recipe_ingredients (
  id text primary key,
  recipe_version_id text not null references recipe_versions(id),
  food_id text,
  serving_id text,
  quantity real,
  unit text not null,
  label text not null,
  note text,
  sort_order integer not null
);

create index idx_recipe_ingredients_version on recipe_ingredients(recipe_version_id, sort_order);

create table recipe_steps (
  id text primary key,
  recipe_version_id text not null references recipe_versions(id),
  body text not null,
  sort_order integer not null
);

create index idx_recipe_steps_version on recipe_steps(recipe_version_id, sort_order);
