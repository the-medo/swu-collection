import type { CreationDocument, CreatorProfileInput } from '../../../shared/creators/contracts.ts';
import { assertPostAllowed, assertTextAllowed } from '../moderation/content.ts';

export function assertCreatorProfileAllowed(profile: CreatorProfileInput) {
  assertTextAllowed(profile.slug, 'slug', 'Creator address');
  assertTextAllowed(profile.name, 'name', 'Creator name');
  assertTextAllowed(profile.tagline, 'tagline', 'Creator tagline');
  assertTextAllowed(profile.introduction, 'introduction', 'Creator introduction');
  assertPostAllowed(profile.bio, 'Creator bio');
  profile.links.forEach((link, index) =>
    assertTextAllowed(link.label, `links.${index}.label`, 'Link label'),
  );
}

/** Drafts remain editable; every path to a public creation checks the same text. */
export function assertCreationTextAllowed(document: CreationDocument) {
  assertTextAllowed(document.title, 'title', 'Creation title');
  assertTextAllowed(document.summary, 'summary', 'Creation summary');
  assertTextAllowed(document.videoDescription, 'videoDescription', 'Video description');
  assertTextAllowed(document.series, 'series', 'Series name');
  assertTextAllowed(document.season, 'season', 'Season');
  assertTextAllowed(document.sponsorship, 'sponsorship', 'Sponsorship disclosure');
  assertPostAllowed(document.body, 'Creation content');
  document.chapters.forEach((chapter, index) =>
    assertTextAllowed(chapter.title, `chapters.${index}.title`, 'Chapter title'),
  );
}
