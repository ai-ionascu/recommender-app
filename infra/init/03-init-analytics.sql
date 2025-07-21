-- 03-init-analytics.sql
\connect analytics_db

GRANT CONNECT ON DATABASE analytics_db TO analytics_admin, analytics_reader;
GRANT USAGE ON SCHEMA public TO analytics_admin, analytics_reader;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO analytics_reader;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO analytics_admin;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO analytics_admin, analytics_reader;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO analytics_reader;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO analytics_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO analytics_admin, analytics_reader;
