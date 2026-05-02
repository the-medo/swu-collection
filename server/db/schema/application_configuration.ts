import { pgTable, text, varchar } from 'drizzle-orm/pg-core';
import type { InferSelectModel } from 'drizzle-orm';

export const applicationConfiguration = pgTable('application_configuration', {
  key: varchar('key', { length: 255 }).primaryKey(),
  value: text('value').notNull(),
});

export const applicationConfigurationSchema = {
  applicationConfiguration,
};

export type ApplicationConfigurationSchema = InferSelectModel<typeof applicationConfiguration>;
