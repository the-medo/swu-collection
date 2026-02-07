INSERT INTO "format" (id, name, description) VALUES
     (6, 'Eternal', 'Constructed format with all sets allowed.'),
     (7, 'Next Set Preview - Premier', 'Constructed format with Premier rules - used during preview season (new set not released yet, but cards are spoiled)'),
     (8, 'Next Set Preview - Eternal', 'Constructed format with Eternal rules - used during preview season (new set not released yet, but cards are spoiled)')
ON CONFLICT (id) DO NOTHING;