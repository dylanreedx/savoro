-- Migration number: 0007 	 2026-07-17
-- Viewer-scoped cookbook saves (SAV-131). The composite primary key makes
-- repeated saves idempotent without creating duplicate rows.
create table saved_recipes (
  user_id text not null references users(id),
  recipe_id text not null references recipes(id),
  created_at text not null,
  primary key (user_id, recipe_id)
);

create index idx_saved_recipes_user_created on saved_recipes(user_id, created_at);
