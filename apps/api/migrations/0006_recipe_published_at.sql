-- Migration number: 0006 	 2026-07-17
-- Real publication metadata for immutable recipe versions (SAV-129).
alter table recipe_versions add column published_at text;

-- Before lifecycle endpoints existed, local/manual data could already mark a
-- current recipe as published. Its recipe timestamp is the best available
-- publication time; all API-driven publications write the exact time directly.
update recipe_versions
set published_at = (
  select recipes.updated_at
  from recipes
  where recipes.current_version_id = recipe_versions.id
    and recipes.status = 'published'
)
where id in (
  select current_version_id
  from recipes
  where status = 'published' and current_version_id is not null
);
