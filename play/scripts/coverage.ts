import type { Abilities } from '../cards/definition.ts';
import { coverage, supportedCards } from '../cards/registry.ts';
import { versions } from '../engine/model.ts';
const catalog = await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json();
console.log(
  JSON.stringify(
    {
      versions,
      officialCatalogCards: Object.keys(catalog).length,
      implementedCards: coverage.length,
      unsupportedCatalogCards: Object.keys(catalog).filter(
        id => !coverage.some(card => card.cardId === id),
      ).length,
      cards: [...supportedCards]
        .sort((a, b) => a.cardId.localeCompare(b.cardId))
        .map(card => ({
          cardId: card.cardId,
          name: card.name,
          kind: card.kind,
          token: card.kind === 'upgrade' && card.token,
          keywords:
            card.kind === 'leader'
              ? Object.values<Abilities | undefined>(card.faces).flatMap(
                  face => face?.keywords ?? [],
                )
              : (card.keywords ?? []),
          replacement: card.kind === 'upgrade' ? (card.replacement?.kind ?? null) : null,
          abilityIds: [
            ...(card.kind === 'leader'
              ? Object.values<Abilities | undefined>(card.faces).flatMap(face => [
                  ...(face?.actions ?? []).map(a => a.id),
                  ...(face?.triggers ?? []).map(t => t.id),
                ])
              : (card.triggers ?? []).map(trigger => trigger.id)),
          ],
        })),
      scope:
        'Registered card behavior in two-player core-practice only; no competitive deck legality or full rules coverage claim.',
    },
    null,
    2,
  ),
);
