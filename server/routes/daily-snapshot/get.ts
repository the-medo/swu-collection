import { Hono } from 'hono';
import type { AuthExtension } from '../../auth/auth.ts';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { and, eq, inArray } from 'drizzle-orm';
import { dailySnapshot, dailySnapshotSection } from '../../db/schema/daily_snapshot.ts';

const zSectionsItem = z.object({
  section: z.string().min(1),
  lastUpdatedAt: z.string().datetime().optional(),
});

// Accept sections as JSON string in query for GET, parse to array
const zDailySnapshotQuery = z.object({
  date: z.string().min(1),
  lastUpdatedAt: z.string().datetime().optional(), // not used for filtering per requirements
  sections: z
    .string()
    .optional()
    .transform(val => {
      if (!val) return [] as Array<z.infer<typeof zSectionsItem>>;
      try {
        const parsed = JSON.parse(val);
        return z.array(zSectionsItem).parse(parsed);
      } catch {
        // If malformed, treat as empty -> fetch all
        return [] as Array<z.infer<typeof zSectionsItem>>;
      }
    }),
});

export const dailySnapshotGetRoute = new Hono<AuthExtension>().get(
  '/',
  zValidator('query', zDailySnapshotQuery),
  async c => {
    const { date, sections } = c.req.valid('query');

    // 1) Always fetch daily_snapshot row
    const dsRows = await db
      .select()
      .from(dailySnapshot)
      .where(eq(dailySnapshot.date, date as unknown as any))
      .limit(1);
    const daily = dsRows[0] ?? null;

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
        .where(eq(dailySnapshotSection.date, date as unknown as any));
    } else {
      const names = [...new Set(wanted.map(s => s.section))];
      if (names.length > 0) {
        const dbRows = await db
          .select()
          .from(dailySnapshotSection)
          .where(
            and(
              eq(dailySnapshotSection.date, date as unknown as any),
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
