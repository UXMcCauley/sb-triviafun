-- Optional one-time cleanup for databases that had:
--   create extension pgcrypto;
-- in public (Neon / scanner: "Extension pgcrypto is installed in the public schema").
--
-- Preconditions:
--   - PostgreSQL 13+ (Neon default is 15+): built-in gen_random_uuid() exists.
--   - No code relies on other pgcrypto functions (digest, crypt, etc.).
--
-- Run manually against your branch when ready:
--   psql "$DATABASE_URL" -f db/migrations/drop_pgcrypto_if_unused.sql

drop extension if exists pgcrypto cascade;
