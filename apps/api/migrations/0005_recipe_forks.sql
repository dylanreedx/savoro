-- Migration number: 0005 	 2026-06-11
alter table recipes add column forked_from_recipe_id text references recipes(id);
alter table recipes add column forked_from_version_id text references recipe_versions(id);
