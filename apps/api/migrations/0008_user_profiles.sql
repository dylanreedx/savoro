-- Migration number: 0008 	 2026-07-18
-- Public profile fields (SAV-133) are folded into users, matching the existing
-- small-schema style while keeping email and other account data DTO-separated.
alter table users add column username text;
alter table users add column bio text;
alter table users add column avatar_url text;
alter table users add column website_url text;
alter table users add column instagram_url text;
alter table users add column tiktok_url text;
alter table users add column profile_visibility text not null default 'private'
  check (profile_visibility in ('private', 'public'));

create unique index uq_users_username on users(username) where username is not null;
