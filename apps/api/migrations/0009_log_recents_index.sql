-- Migration number: 0009 	 2026-07-18
-- Supports owner-scoped newest-first reads for the recent log-again list.
create index idx_food_logs_user_created on food_log_entries(user_id, created_at, id);
