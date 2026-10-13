import { createHash } from 'node:crypto';
import { creationTags, normalizeTagIds } from '../../../../shared/creators/taxonomy.ts';
import { type EntityReference } from '../../../../shared/creators/contracts.ts';
import { documentFromVideo } from '../video.ts';
import { setInfo } from '../../../../lib/swu-resources/set-info.ts';
import type { CardList } from '../../../../lib/swu-resources/types.ts';
import { getDeckBuilderForLink } from '../../decks/deckBuilders.ts';
import type { DeckBuilderSource } from '../../../../types/DeckImport.ts';
import {
  type Analysis,
  type Classification,
  type VideoMetadata,
  MAX_DECK_LINKS,
} from './contracts.ts';

export const metadataHash = (metadata: VideoMetadata) =>
  createHash('sha256').update(JSON.stringify(metadata)).digest('hex');
export const normalizedText = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
const includesPhrase = (text: string, phrase: string) =>
  !!phrase && ` ${normalizedText(text)} `.includes(` ${normalizedText(phrase)} `);
export const metadataText = (metadata: VideoMetadata) =>
  `${metadata.title}\n${metadata.description}`;
export const quotedEvidence = (metadata: VideoMetadata, quote: string) =>
  quote.trim().length >= 3 && metadataText(metadata).includes(quote.trim());
export const allowedTags = creationTags.filter(
  t => t.dimension !== 'medium' && !['format:constructed', 'format:limited'].includes(t.id),
);

export function subjectCandidates(metadata: VideoMetadata, cards: CardList) {
  const text = metadataText(metadata);
  const leaders = Object.entries(cards).flatMap(([id, card]) =>
    card?.type === 'Leader' && includesPhrase(text, card.title || card.name)
      ? [{ id, name: card.title || card.name, subtitle: card.subtitle ?? '' }]
      : [],
  );
  const sets = Object.values(setInfo).filter(
    set =>
      includesPhrase(text, set.name) || new RegExp(`\\b${set.code.toUpperCase()}\\b`).test(text),
  );
  return { leaders: leaders.slice(0, 100), sets: sets.map(s => ({ id: s.code, name: s.name })) };
}

/** All destinations come from literal description links, never from model output. */
export function descriptionDeckLinks(description: string) {
  const links = new Map<string, { source: DeckBuilderSource; sourceDeckId: string; url: string }>();
  for (const match of description.matchAll(/https?:\/\/[^\s<>"\u200b]+/gi)) {
    try {
      const url = new URL(match[0].replace(/[),.;!\]}]+$/, ''));
      if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port)
        continue;
      const builder = getDeckBuilderForLink(url.href);
      if (!builder) continue;
      const sourceDeckId = builder.getDeckId(url.href);
      if (!/^[a-zA-Z0-9_-]{1,120}$/.test(sourceDeckId)) continue;
      links.set(`${builder.source}:${sourceDeckId}`, {
        source: builder.source,
        sourceDeckId,
        url: url.href,
      });
    } catch {
      /* Unknown hosts and incomplete/truncated URLs are not importable. */
    }
  }
  return {
    links: [...links.values()].slice(0, MAX_DECK_LINKS),
    overflow: links.size > MAX_DECK_LINKS,
  };
}

export function validatedClassification(
  result: Classification,
  metadata: VideoMetadata,
  cards: CardList,
): Classification {
  const validIds = new Set(allowedTags.map(t => t.id));
  const candidates = subjectCandidates(metadata, cards);
  return {
    ...result,
    // Contradictory negatives remain eligible rather than excluding a real SWU deck guide.
    relevance:
      result.relevance === 'unrelated' &&
      (candidates.sets.some(s => includesPhrase(metadata.title, s.name)) ||
        descriptionDeckLinks(metadata.description).links.length > 0)
        ? 'uncertain'
        : result.relevance,
    tags: result.tags.filter(t => validIds.has(t.id) && t.confidence >= 0.8),
    leaders: result.leaders.filter(ref => {
      if (!quotedEvidence(metadata, ref.evidence)) return false;
      const card = candidates.leaders.find(c => c.id === ref.id);
      if (!card || !includesPhrase(ref.evidence, card.name)) return false;
      // A character may have several leader printings. A name alone cannot choose one.
      return (
        candidates.leaders.filter(c => c.name === card.name).length === 1 ||
        (!!card.subtitle && includesPhrase(ref.evidence, card.subtitle))
      );
    }),
    sets: result.sets.filter(
      ref =>
        quotedEvidence(metadata, ref.evidence) &&
        candidates.sets.some(
          s =>
            s.id === ref.id &&
            (includesPhrase(ref.evidence, s.name) ||
              new RegExp(`\\b${s.id.toUpperCase()}\\b`).test(ref.evidence)),
        ),
    ),
  };
}

export function shouldPublish(analysis: Classification) {
  // Relevance uncertainty never holds a video for review. Tag/evidence validation
  // remains independent so publication does not invent unsupported SWU subjects.
  return !(analysis.relevance === 'unrelated' && analysis.confidence >= 0.9);
}

export function videoDocument(
  metadata: VideoMetadata,
  analysis: Analysis,
  fallbackLanguage: string,
  deckRefs: EntityReference[] = [],
) {
  const refs: EntityReference[] = [
    ...deckRefs,
    ...analysis.leaders.map(r => ({ type: 'leader' as const, id: r.id, startSeconds: null })),
    ...analysis.sets.map(r => ({ type: 'set' as const, id: r.id, startSeconds: null })),
  ];
  return documentFromVideo(metadata, {
    fallbackLanguage,
    suggestedLanguage: analysis.language,
    tags: normalizeTagIds(analysis.tags.map(tag => tag.id)),
    references: [...new Map(refs.map(ref => [`${ref.type}:${ref.id}`, ref])).values()].slice(0, 50),
    relevance: analysis.relevance === 'partial' ? 'partial' : 'primary',
  });
}
