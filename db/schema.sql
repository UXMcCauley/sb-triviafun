-- Neon / Postgres schema for Seinfeld Trivia
--
-- Do not install pgcrypto in the public schema (security/Neon best practice).
-- `gen_random_uuid()` defaults use the built-in in PostgreSQL 13+; Neon runs PG 15+.
-- If you have an old DB with `public.pgcrypto`, see db/migrations/drop_pgcrypto_if_unused.sql

-- Packs
create table if not exists packs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text not null,
  description text not null,
  theme_color text not null,
  icon text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Questions
create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null unique,
  options jsonb not null,
  correct_answer_index int not null,
  category text null,
  difficulty text not null check (difficulty in ('easy','medium','hard')),
  season int null,
  episode text null,
  source jsonb not null,
  fun_fact text null,
  created_at timestamptz not null default now(),
  constraint questions_correct_answer_index_check check (correct_answer_index between 0 and 3)
);

-- Pack <-> Question mapping
create table if not exists pack_questions (
  pack_id uuid not null references packs(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  primary key (pack_id, question_id)
);

create index if not exists pack_questions_pack_id_idx on pack_questions(pack_id);
create index if not exists pack_questions_question_id_idx on pack_questions(question_id);

-- Games
create table if not exists games (
  id uuid primary key default gen_random_uuid(),
  game_code text not null unique,
  status text not null check (status in ('lobby','active','finished')),
  pack_ids uuid[] not null default '{}',
  question_ids uuid[] not null default '{}',
  shuffled_option_orders jsonb not null default '[]',
  shuffled_correct_answers jsonb not null default '[]',
  current_question_index int not null default 0,
  question_started_at bigint null,
  settings jsonb not null default '{}'::jsonb,
  series_id uuid null,
  series_index int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists games_game_code_idx on games(game_code);
create index if not exists games_status_idx on games(status);

-- Game players (one row per player per game)
create table if not exists game_players (
  game_id uuid not null references games(id) on delete cascade,
  player_id uuid not null,
  name text not null,
  score int not null default 0,
  answers jsonb not null default '[]',
  primary key (game_id, player_id)
);

create index if not exists game_players_game_id_idx on game_players(game_id);

-- Users (Google-linked identity + profile)
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  google_sub text not null unique,
  email text null,
  default_username text null,
  avatar_url text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on users(email);

-- Player stats
create table if not exists player_stats (
  phone text primary key,
  display_name text not null,
  user_id uuid null references users(id) on delete set null,
  games_played int not null default 0,
  games_won int not null default 0,
  total_score int not null default 0,
  best_score int not null default 0,
  correct_answers int not null default 0,
  total_answers int not null default 0,
  last_played_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Backfill older schemas (idempotent)
alter table if exists player_stats
  add column if not exists user_id uuid null;
alter table if exists player_stats
  add column if not exists last_played_at timestamptz not null default now();
alter table if exists player_stats
  add column if not exists updated_at timestamptz not null default now();
alter table if exists player_stats
  add column if not exists created_at timestamptz not null default now();

create index if not exists player_stats_user_id_idx on player_stats(user_id);

-- Emoji reactions (question + player)
create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references games(id) on delete cascade,
  target_type text not null check (target_type in ('question','player')),
  target_key text not null,
  emoji text not null,
  user_id uuid null references users(id) on delete set null,
  guest_id text null,
  created_at timestamptz not null default now()
);

create index if not exists reactions_game_target_idx
  on reactions(game_id, target_type, target_key, created_at);
create index if not exists reactions_user_id_idx on reactions(user_id);

-- Finished game results for global winners ticker
create table if not exists game_results (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null unique references games(id) on delete cascade,
  game_code text not null,
  winner_name text not null,
  winner_user_id uuid null references users(id) on delete set null,
  winner_score int not null,
  finished_at timestamptz not null default now(),
  region text null,
  created_at timestamptz not null default now()
);

create index if not exists game_results_finished_at_idx on game_results(finished_at desc);
create index if not exists game_results_region_finished_at_idx on game_results(region, finished_at desc);

-- Reports
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  reported_by text not null,
  game_code text not null,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists reports_question_id_idx on reports(question_id);
create index if not exists reports_game_code_idx on reports(game_code);

