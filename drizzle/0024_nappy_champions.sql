
-- reset of the meta seeding
SELECT setval(pg_get_serial_sequence('meta', 'id'), (SELECT MAX(id) FROM meta));
