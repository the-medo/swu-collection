import {
  creationDocumentSchema,
  languageSchema,
  type CreationDocument,
} from '../../../shared/creators/contracts.ts';
import { youtubeChapters } from '../../../shared/creators/youtube.ts';
import { emptyPostDocument } from '../../../shared/posts/content.ts';

export type VideoMetadata = {
  id: string;
  channelId: string;
  title: string;
  description: string;
  publishedAt: string;
  durationSeconds: number;
  language: string | null;
  thumbnail: string;
};
export function documentFromVideo(
  metadata: Pick<VideoMetadata, 'id' | 'title' | 'description' | 'language' | 'thumbnail'> & {
    durationSeconds?: number;
  },
  options: {
    fallbackLanguage: string;
    suggestedLanguage?: string;
    tags?: string[];
    references?: CreationDocument['references'];
    relevance?: CreationDocument['relevance'];
  },
) {
  const language = [metadata.language, options.suggestedLanguage, options.fallbackLanguage, 'en']
    .map(value => languageSchema.safeParse(value))
    .find(result => result.success && !['und', 'zxx'].includes(result.data));
  return creationDocumentSchema.parse({
    title: metadata.title,
    summary: metadata.description.slice(0, 1000),
    videoDescription: metadata.description,
    durationSeconds: metadata.durationSeconds ?? null,
    medium: 'video',
    body: emptyPostDocument(),
    coverUrl: metadata.thumbnail,
    sourceUrl: `https://www.youtube.com/watch?v=${metadata.id}`,
    language: language?.success ? language.data : 'en',
    tags: options.tags ?? [],
    references: options.references ?? [],
    chapters: youtubeChapters(metadata.description).filter(
      chapter =>
        metadata.durationSeconds === undefined || chapter.startSeconds < metadata.durationSeconds,
    ),
    relevance: options.relevance ?? 'primary',
  });
}
