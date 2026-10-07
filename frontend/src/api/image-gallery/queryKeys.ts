export const imageGalleryKeys = {
  all: ['image-gallery'] as const,
  list: (page: number) => ['image-gallery', page] as const,
};
