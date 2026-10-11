export const homepageModes = ['snapshot', 'today', 'live'] as const;
export type HomepageMode = (typeof homepageModes)[number];
export type UserHomepageMode = 'default' | HomepageMode;
