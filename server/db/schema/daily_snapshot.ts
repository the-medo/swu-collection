import {
  pgTable,
  date,
  uuid,
  timestamp,
  primaryKey,
  index,
  text,
  foreignKey,
} from 'drizzle-orm/pg-core';
import { type InferSelectModel } from 'drizzle-orm';
import { tournamentGroup } from './tournament_group.ts';

// Daily Snapshot (one row per day)
export const dailySnapshot = pgTable(
  'daily_snapshot',
  {
    date: date('date').primaryKey(),
    tournamentGroupId: uuid('tournament_group_id'),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => {
    return {
      tournamentGroupIdIdx: index('ds-tournament_group_id_idx').on(table.tournamentGroupId),
      fk: foreignKey({
        name: 'ds_tournament_group_fk',
        columns: [table.tournamentGroupId],
        foreignColumns: [tournamentGroup.id],
      }).onDelete('no action'),
    };
  },
);

// Daily Snapshot Section (multiple sections per day)
export const dailySnapshotSection = pgTable(
  'daily_snapshot_section',
  {
    date: date('date').notNull(),
    section: text('section').notNull(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
    data: text('data').notNull(),
  },
  table => {
    return {
      pk: primaryKey({ columns: [table.date, table.section] }),
      dateIdx: index('dss-date_idx').on(table.date),
      sectionIdx: index('dss-section_idx').on(table.section),
    };
  },
);

export type DailySnapshot = InferSelectModel<typeof dailySnapshot>;
export type DailySnapshotSection = InferSelectModel<typeof dailySnapshotSection>;
