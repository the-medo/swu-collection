import { pgTable, text, varchar } from 'drizzle-orm/pg-core';

export const applicationConfiguration = pgTable('application_configuration', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
});

export const applicationConfigurationSchema = {
  applicationConfiguration,
};
