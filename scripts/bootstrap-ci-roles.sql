-- CI stand-in for the Infra bootstrap. These passwords are not production secrets.
-- gym_easy_migrator owns the database and is not a superuser.
-- CREATEROLE is required so 0010's CREATE ROLE sees duplicate_object
-- (without it Postgres raises permission denied before the duplicate check).
-- ADMIN OPTION lets that role re-apply the GRANT statements inside 0010.

CREATE ROLE gym_easy_migrator LOGIN PASSWORD 'migrator'
  NOSUPERUSER NOCREATEDB CREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE gym_easy_app LOGIN PASSWORD 'app' CONNECTION LIMIT 30
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE gym_easy_purge NOLOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT gym_easy_purge TO gym_easy_app;
GRANT gym_easy_app TO gym_easy_migrator WITH ADMIN OPTION;
GRANT gym_easy_purge TO gym_easy_migrator WITH ADMIN OPTION;

CREATE DATABASE gym_easy OWNER gym_easy_migrator;

REVOKE ALL ON DATABASE gym_easy FROM PUBLIC;
GRANT CONNECT ON DATABASE gym_easy TO gym_easy_migrator;
GRANT CONNECT ON DATABASE gym_easy TO gym_easy_app;

\connect gym_easy

REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO gym_easy_migrator;
GRANT USAGE ON SCHEMA public TO gym_easy_app;

ALTER DEFAULT PRIVILEGES FOR ROLE gym_easy_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO gym_easy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_easy_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO gym_easy_app;
ALTER DEFAULT PRIVILEGES FOR ROLE gym_easy_migrator IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO gym_easy_app;
