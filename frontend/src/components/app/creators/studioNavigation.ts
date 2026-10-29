export const studioPaths = {
  overview: '/creator-studio',
  articles: '/creator-studio/articles',
  videos: '/creator-studio/videos',
} as const;
export type StudioSection = keyof typeof studioPaths;
