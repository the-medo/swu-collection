import { z } from 'zod';

// The runtime schema validates JSON recursively. Keep the open object type opaque
// so Hono's JSON serialization types do not expand an infinitely recursive union.
export type TournamentAdditionalInfo = Record<string, unknown>;

// Additional info is public tournament data. Keep arbitrary JSON values intact.
export const zTournamentAdditionalInfo: z.ZodType<
  TournamentAdditionalInfo,
  TournamentAdditionalInfo
> = z
  .record(
    z
      .string()
      .trim()
      .min(1)
      .max(100)
      .refine(key => !['__proto__', 'constructor', 'prototype'].includes(key)),
    z.json(),
  )
  .refine(
    value => new TextEncoder().encode(JSON.stringify(value)).byteLength <= 32_768,
    'Additional info must fit within 32 KB.',
  );

// PostgreSQL point uses x/y: longitude first, latitude second.
export const zTournamentCoordinates = z.object({
  x: z.number().min(-180).max(180),
  y: z.number().min(-90).max(90),
});
export type TournamentCoordinates = z.infer<typeof zTournamentCoordinates>;

export const zTournamentAdditionalInfoRequest = z.object({
  additionalInfo: zTournamentAdditionalInfo,
  expectedAdditionalInfo: zTournamentAdditionalInfo,
});

export const zTournamentCoordinatesRequest = z.object({ force: z.boolean().default(false) });

export interface TournamentLocationData {
  id: string;
  name: string;
  location: string;
  date: string;
  coordinates: TournamentCoordinates | null;
  additionalInfo: TournamentAdditionalInfo;
}

export interface TournamentCoordinatesResult {
  status: 'updated' | 'skipped';
  tournament: TournamentLocationData;
}
