-- Migration number: 0010 	 2026-07-21
-- Viewer-scoped social graph. Follows are asymmetric; friend requests resolve
-- into one canonical, mutual friendship row.
create table follows (
  id text primary key,
  follower_user_id text not null references users(id) on delete cascade,
  followed_user_id text not null references users(id) on delete cascade,
  created_at text not null,
  check (follower_user_id <> followed_user_id)
);

-- The unique pair makes duplicate follow inserts idempotent. Unfollow deletes
-- by (session viewer, target), so deleting an absent follow is also a no-op.
create unique index uq_follows_pair on follows(follower_user_id, followed_user_id);
create index idx_follows_followed on follows(followed_user_id, created_at);

create table friend_requests (
  id text primary key,
  requester_user_id text not null references users(id) on delete cascade,
  target_user_id text not null references users(id) on delete cascade,
  pair_user_one_id text not null references users(id) on delete cascade,
  pair_user_two_id text not null references users(id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'declined')),
  created_at text not null,
  updated_at text not null,
  check (requester_user_id <> target_user_id),
  check (pair_user_one_id < pair_user_two_id)
);

-- One pending request per unordered pair prevents duplicate/reverse races.
-- The API returns the existing row for same-direction duplicates, rejects a
-- reverse pending request, and permits a new request after a decline.
create unique index uq_friend_requests_pending_pair
  on friend_requests(pair_user_one_id, pair_user_two_id)
  where status = 'pending';
create index idx_friend_requests_target_status
  on friend_requests(target_user_id, status, created_at);
create index idx_friend_requests_requester_status
  on friend_requests(requester_user_id, status, created_at);

create table friendships (
  id text primary key,
  user_one_id text not null references users(id) on delete cascade,
  user_two_id text not null references users(id) on delete cascade,
  created_at text not null,
  check (user_one_id < user_two_id)
);

-- Acceptance writes this canonical pair with conflict-ignore semantics, so a
-- target retry cannot create duplicate friendships. Accept/decline ownership
-- is enforced in the API query by target_user_id; non-targets receive 404.
create unique index uq_friendships_pair on friendships(user_one_id, user_two_id);
create index idx_friendships_user_two on friendships(user_two_id, created_at);
