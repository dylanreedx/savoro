-- Migration number: 0004 	 2026-06-11
alter table users add column apple_sub text;
create unique index uq_users_apple_sub on users(apple_sub) where apple_sub is not null;
