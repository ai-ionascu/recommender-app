-- 01-init-products.sql
\connect products_db

-- Ensure public schema usage
GRANT CONNECT ON DATABASE products_db TO products_admin, products_reader;
GRANT USAGE ON SCHEMA public TO products_admin, products_reader;

-- Default privileges for future tables/sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO products_reader;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO products_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO products_admin, products_reader;

-- (When migrations have already created tables, we also grant on existing)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO products_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO products_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO products_admin, products_reader;
