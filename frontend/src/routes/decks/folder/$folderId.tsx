import { createFileRoute } from '@tanstack/react-router';
import SharedDeckFolderPage from '@/components/app/decks/DeckFolders/SharedDeckFolderPage.tsx';

export const Route = createFileRoute('/decks/folder/$folderId')({ component: FolderDecks });

function FolderDecks() {
  const { folderId } = Route.useParams();
  return <SharedDeckFolderPage folderId={folderId} />;
}
