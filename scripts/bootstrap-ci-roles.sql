-- CI stand-in for the Infra bootstrap. These passwords are not production secrets.
-- The superuser creates the roles and grants gym_easy_purge to gym_easy_app.
-- gym_easy_migrator owns the database. It is not a superuser, has no
-- CREATEROLE, and has no ADMIN OPTION on any role.

CREATE ROLE gym_easy_migrator LOGIN PASSWORD 'migrator'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE gym_easy_app LOGIN PASSWORD 'app' CONNECTION LIMIT 30
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE gym_easy_purge NOLOGIN
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;

GRANT gym_easy_purge TO gym_easy_app;

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
