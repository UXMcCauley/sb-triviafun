-- Neon / Postgres schema for Seinfeld Trivia

create extension if not exists pgcrypto;

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

-- Player stats
create table if not exists player_stats (
  phone text primary key,
  display_name text not null,
  games_played int not null default 0,
  games_won int not null default 0,
  total_score int not null default 0,
  best_score int not null default 0,
  correct_answers int not null default 0,
  total_answers int not null default 0,
  last_played_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

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

