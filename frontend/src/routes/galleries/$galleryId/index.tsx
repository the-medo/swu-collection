import { createFileRoute, redirect } from '@tanstack/react-router';

// Preserve links shared before user galleries were renamed to albums.
export const Route = createFileRoute('/galleries/$galleryId/')({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: '/albums/$albumId',
      params: { albumId: params.galleryId },
      replace: true,
    });
  },
});
