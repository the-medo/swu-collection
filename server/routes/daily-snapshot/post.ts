import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { and, desc, eq, inArray, lte } from 'drizzle-orm';
import { dailySnapshot, dailySnapshotSection } from '../../db/schema/daily_snapshot.ts';

const zSectionsItem = z.object({
  section: z.string().min(1),
  lastUpdatedAt: z.iso.datetime().optional(),
});

// Accept sections as JSON body for POST
const zDailySnapshotBody = z.object({
  date: z.string().min(1),
  lastUpdatedAt: z.iso.datetime().optional(), // not used for filtering per requirements
  sections: z.array(zSectionsItem).optional().default([]),
});

export const dailySnapshotPostRoute = new Hono<AuthExtension>().post(
  '/',
  zValidator('json', zDailySnapshotBody),
  async c => {
    const { date, sections } = c.req.valid('json');

    // 1) Always fetch daily_snapshot row
    const dsRows = await db
      .select()
      .from(dailySnapshot)
      .where(lte(dailySnapshot.date, date as unknown as any))
      .orderBy(desc(dailySnapshot.date))
      .limit(1);
    const daily = dsRows[0] ?? null;
    const dateFromDaily = daily?.date ?? date;

    // 2) Compute sections to return
    let sectionRows: Array<{
      date: any;
      section: string;
      updatedAt: Date;
      data: string;
    }> = [];

    const wanted = sections ?? [];

    if (wanted.length === 0) {
      // If no sections specified, return all sections for the date
      sectionRows = await db
        .select()
        .from(dailySnapshotSection)
        .where(eq(dailySnapshotSection.date, dateFromDaily));
    } else {
      const names = [...new Set(wanted.map(s => s.section))];
      if (names.length > 0) {
        const dbRows = await db
          .select()
          .from(dailySnapshotSection)
          .where(
            and(
              eq(dailySnapshotSection.date, dateFromDaily),
              inArray(dailySnapshotSection.section, names),
            ),
          );

        // Include only if client's lastUpdatedAt is missing or older than DB updatedAt
        sectionRows = dbRows.filter(row => {
          const item = wanted.find(w => w.section === row.section);
          const clientLast = item?.lastUpdatedAt;
          if (!clientLast) return true; // client has no data -> send
          const clientDate = new Date(clientLast);
          const dbDate = new Date(row.updatedAt as unknown as any);
          return clientDate < dbDate; // only send if client is outdated
        });
      }
    }

    return c.json({
      data: {
        dailySnapshot: daily,
        sections: sectionRows,
      },
    });
  },
);
