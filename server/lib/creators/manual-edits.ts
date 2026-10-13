import { isDeepStrictEqual } from 'node:util';
import type { CreationDocument, CreationField } from '../../../shared/creators/contracts.ts';

/** Sticky, per-field ownership: restoring an old value is still a deliberate edit. */
export function trackManualEdits(
  previous: CreationDocument,
  next: CreationDocument,
  protectedFields: CreationField[],
): CreationField[] {
  return [
    ...new Set([
      ...protectedFields,
      ...(Object.keys(next) as CreationField[]).filter(
        field =>
          !isDeepStrictEqual(
            previous[field] ?? (field === 'videoDescription' ? '' : undefined),
            next[field],
          ),
      ),
    ]),
  ];
}
