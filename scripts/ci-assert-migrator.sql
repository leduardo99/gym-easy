-- Fails the CI bootstrap unless the migrator matches production least privilege.
DO $$
DECLARE
  "admins" integer;
  "membership" integer;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_roles
    WHERE rolname IN ('gym_easy_migrator', 'gym_easy_app', 'gym_easy_purge')
      AND (
        rolsuper
        OR rolcreaterole
        OR rolbypassrls
        OR (rolname = 'gym_easy_purge' AND rolcanlogin)
      )
  ) THEN
    RAISE EXCEPTION
      'bootstrap roles must be NOSUPERUSER NOCREATEROLE NOBYPASSRLS, and gym_easy_purge NOLOGIN';
  END IF;

  SELECT count(*)
  INTO "admins"
  FROM pg_catalog.pg_auth_members AS member_grant
  JOIN pg_catalog.pg_roles AS member_role ON member_role.oid = member_grant.member
  WHERE member_role.rolname = 'gym_easy_migrator'
    AND member_grant.admin_option;

  IF "admins" <> 0 THEN
    RAISE EXCEPTION
      'gym_easy_migrator must not have admin_option in pg_auth_members (% rows)',
      "admins";
  END IF;

  SELECT count(*)
  INTO "membership"
  FROM pg_catalog.pg_auth_members AS member_grant
  JOIN pg_catalog.pg_roles AS granted ON granted.oid = member_grant.roleid
  JOIN pg_catalog.pg_roles AS member_role ON member_role.oid = member_grant.member
  WHERE granted.rolname = 'gym_easy_purge'
    AND member_role.rolname = 'gym_easy_app';

  IF "membership" <> 1 THEN
    RAISE EXCEPTION 'bootstrap must GRANT gym_easy_purge TO gym_easy_app';
  END IF;
END
$$;
