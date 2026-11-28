import { z } from 'zod';

export const pqConstructedFormats = [
  { id: 1, name: 'Premier' },
  { id: 6, name: 'Eternal' },
] as const;

export const zPQMetaReassignmentRequest = z
  .object({
    fromDate: z.iso.date(),
    targets: z
      .array(
        z
          .object({
            formatId: z.union([z.literal(1), z.literal(6)]),
            metaId: z.number().int().positive(),
          })
          .strict(),
      )
      .min(1)
      .max(2)
      .refine(
        targets => new Set(targets.map(target => target.formatId)).size === targets.length,
        'Select each format only once.',
      ),
  })
  .strict();

export const zPQMetaReassignmentApplyRequest = zPQMetaReassignmentRequest.extend({
  previewToken: z.string().regex(/^[a-f0-9]{64}$/),
});

export type PQMetaReassignmentRequest = z.infer<typeof zPQMetaReassignmentRequest>;
export type PQMetaReassignmentApplyRequest = z.infer<typeof zPQMetaReassignmentApplyRequest>;

export interface PQMetaChange {
  id: string;
  name: string;
  formatId: number;
  fromMetaId: number | null;
  fromMetaName: string | null;
  toMetaId: number;
  toMetaName: string;
}

export interface PQMetaReassignmentPreview {
  previewToken: string;
  tournaments: (PQMetaChange & { date: string; imported: boolean })[];
  groups: (PQMetaChange & { fromDate: string; toDate: string; tournamentCount: number })[];
  weekendGroups: (PQMetaChange & { weekendId: string; weekendName: string; date: string })[];
  formats: {
    formatId: number;
    metaName: string;
    tournaments: number;
    alreadyAssigned: number;
    groups: number;
    weekendGroups: number;
  }[];
  sealedCount: number;
  conflicts: { groupId: string; name: string; message: string }[];
}

export interface PQMetaReassignmentResult {
  tournamentIds: string[];
  groupCount: number;
  weekendGroupCount: number;
  warnings: string[];
}
