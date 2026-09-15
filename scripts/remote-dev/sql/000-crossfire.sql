-- Always remove authoritative gameplay data, irrespective of sharing opt-ins.
-- Preserve empty DDL so the retained migration journal still matches the dump.
BEGIN;
DO $$
DECLARE
  tables text;
  entry record;
  has_rows boolean;
BEGIN
  SELECT string_agg(format('%I.%I', schemaname, tablename), ', ')
  INTO tables FROM pg_tables WHERE schemaname = 'play';
  IF tables IS NOT NULL THEN
    -- No CASCADE: a future dependency outside this schema must be reviewed.
    EXECUTE 'TRUNCATE TABLE ' || tables;
  END IF;
  FOR entry IN SELECT schemaname, tablename FROM pg_tables WHERE schemaname = 'play' LOOP
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM %I.%I)', entry.schemaname, entry.tablename)
      INTO has_rows;
    IF has_rows THEN
      RAISE EXCEPTION 'Private gameplay data remains after sanitization.';
    END IF;
  END LOOP;
END
$$;
-- The installed bundles are excluded too; the destination seeds its own release.
DELETE FROM public.application_configuration WHERE key = 'crossfire_card_bundle_version';
COMMIT;
