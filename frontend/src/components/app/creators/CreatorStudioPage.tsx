import { useNavigate, useSearch } from '@tanstack/react-router';
import CreatorStudio from './CreatorStudio.tsx';
import { studioPaths, type StudioSection } from './studioNavigation.ts';

export default function CreatorStudioPage({ section }: { section: StudioSection }) {
  const search = useSearch({ from: '/_authenticated/creator-studio' });
  const navigate = useNavigate({ from: '/creator-studio' });
  return (
    <CreatorStudio
      section={section}
      search={search}
      onVideoImported={(creatorId, creationId) => {
        void navigate({ to: studioPaths.videos, search: { creatorId, creationId } });
      }}
      onDraftCreated={creationId => {
        // Keep the editor mounted, including changes typed during its first save.
        void navigate({
          to: studioPaths[section],
          search: previous => ({ ...previous, creationId }),
          replace: true,
          resetScroll: false,
          ignoreBlocker: true,
        });
      }}
      onChange={patch => {
        void navigate({
          to: studioPaths[section],
          search: previous => ({
            ...previous,
            youtube: undefined,
            youtubeChannelId: undefined,
            youtubeClaimId: undefined,
            youtubeError: undefined,
            transferredDecks: undefined,
            ...patch,
          }),
          resetScroll: false,
        });
      }}
    />
  );
}
