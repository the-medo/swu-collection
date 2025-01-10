import { index, json, pgTable, serial, varchar } from 'drizzle-orm/pg-core';

export const card = pgTable(
  'card',
  {
    id: serial('id').primaryKey(),
    name: varchar('name').unique(),
    definition: json('definition'),
  },
  table => {
    return {
      nameIdx: index('name_idx').on(table.name),
    };
  },
);
