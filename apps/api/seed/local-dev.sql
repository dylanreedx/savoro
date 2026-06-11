-- Local-only deterministic seed data for Phase 1 integration.
-- Safe to re-run with: bun run db:seed:local
-- Dev bearer token for usr_dev_alice: dev-alice-token

insert into users (id, email, display_name, created_at, updated_at)
values ('usr_dev_alice', 'dev-alice@example.local', 'Dev Alice', '2026-06-10T00:00:00Z', '2026-06-10T00:00:00Z')
on conflict(id) do update set
  email = excluded.email,
  display_name = excluded.display_name,
  updated_at = excluded.updated_at;

insert into sessions (id, user_id, token_hash, expires_at, created_at, last_used_at, revoked_at)
values (
  'ses_dev_alice',
  'usr_dev_alice',
  '295db0545046da79fb81ee057c7054213df2e3dc2a9a83e5e13e65398596d3e2',
  '2099-01-01T00:00:00Z',
  '2026-06-10T00:00:00Z',
  null,
  null
)
on conflict(id) do update set
  user_id = excluded.user_id,
  token_hash = excluded.token_hash,
  expires_at = excluded.expires_at,
  revoked_at = null;

insert into goals (id, user_id, calories, protein_grams, carbs_grams, fat_grams, fiber_grams, sodium_milligrams, start_date, end_date, created_at, updated_at)
values (
  'goal_dev_alice_current',
  'usr_dev_alice',
  2200,
  150,
  240,
  70,
  30,
  2300,
  '2026-01-01',
  null,
  '2026-06-10T00:00:00Z',
  '2026-06-10T00:00:00Z'
)
on conflict(id) do update set
  calories = excluded.calories,
  protein_grams = excluded.protein_grams,
  carbs_grams = excluded.carbs_grams,
  fat_grams = excluded.fat_grams,
  fiber_grams = excluded.fiber_grams,
  sodium_milligrams = excluded.sodium_milligrams,
  start_date = excluded.start_date,
  end_date = excluded.end_date,
  updated_at = excluded.updated_at;

insert into recipes (id, owner_user_id, slug, visibility, status, current_version_id, created_at, updated_at)
values (
  'rec_dev_bowl',
  'usr_dev_alice',
  'dev-burrito-bowl',
  'public',
  'published',
  'rcv_dev_bowl_v1',
  '2026-06-10T00:00:00Z',
  '2026-06-10T00:00:00Z'
)
on conflict(id) do update set
  owner_user_id = excluded.owner_user_id,
  slug = excluded.slug,
  visibility = excluded.visibility,
  status = excluded.status,
  current_version_id = excluded.current_version_id,
  updated_at = excluded.updated_at;

insert into recipe_versions (
  id,
  recipe_id,
  version_number,
  title,
  servings,
  calories,
  protein_grams,
  carbs_grams,
  fat_grams,
  fiber_grams,
  sodium_milligrams,
  created_at
)
values (
  'rcv_dev_bowl_v1',
  'rec_dev_bowl',
  1,
  'Dev Burrito Bowl',
  1,
  520,
  38,
  58,
  18,
  9,
  760,
  '2026-06-10T00:00:00Z'
)
on conflict(id) do update set
  recipe_id = excluded.recipe_id,
  version_number = excluded.version_number,
  title = excluded.title,
  servings = excluded.servings,
  calories = excluded.calories,
  protein_grams = excluded.protein_grams,
  carbs_grams = excluded.carbs_grams,
  fat_grams = excluded.fat_grams,
  fiber_grams = excluded.fiber_grams,
  sodium_milligrams = excluded.sodium_milligrams;
