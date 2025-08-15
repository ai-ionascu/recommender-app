-- Logical group roles (NOLOGIN)
CREATE ROLE products_read;
CREATE ROLE products_write;

CREATE ROLE users_read;
CREATE ROLE users_write;

CREATE ROLE analytics_read;
CREATE ROLE analytics_write;

CREATE ROLE orders_read;
CREATE ROLE orders_write;

-- Login roles (inherit)
CREATE ROLE products_admin LOGIN PASSWORD 'admin' INHERIT;
CREATE ROLE products_reader LOGIN PASSWORD 'reader' INHERIT;

CREATE ROLE analytics_admin LOGIN PASSWORD 'admin' INHERIT;
CREATE ROLE analytics_reader LOGIN PASSWORD 'reader' INHERIT;

CREATE ROLE users_admin LOGIN PASSWORD 'admin' INHERIT;

-- Attach login roles to logical groups (optional semantics)
GRANT products_write TO products_admin;
GRANT products_read TO products_reader;
GRANT products_read TO products_admin;

GRANT users_read TO users_admin;
GRANT users_write TO users_admin;

GRANT analytics_write TO analytics_admin;
GRANT analytics_read TO analytics_reader;
GRANT analytics_read TO analytics_admin;

CREATE DATABASE products_db OWNER products_admin;
CREATE DATABASE users_db OWNER users_admin;
CREATE DATABASE analytics_db OWNER analytics_admin;