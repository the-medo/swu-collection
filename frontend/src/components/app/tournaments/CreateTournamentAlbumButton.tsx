import { useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { AlbumForm } from '@/components/app/user-albums/AlbumForm.tsx';

export function CreateTournamentAlbumButton({
  tournamentId,
  tournamentName,
  compact = false,
}: {
  tournamentId: string;
  tournamentName: string;
  compact?: boolean;
}) {
  const viewer = useUser();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);
  const createButton = useRef<HTMLButtonElement>(null);
  const action = (
    <Button
      ref={createButton}
      variant={compact ? 'outline' : 'default'}
      size={compact ? 'sm' : 'default'}
      className={
        compact
          ? 'h-8 w-full gap-1.5 text-xs'
          : 'rounded-xl bg-[#dce7a0] text-[#17352e] shadow-none hover:bg-[#edf3c5]'
      }
      onClick={viewer ? () => setCreating(true) : undefined}
    >
      <Plus className={compact ? 'size-3.5' : 'size-4'} /> Create album
    </Button>
  );
  return (
    <>
      {viewer ? action : <SignIn trigger={action} />}
      {creating && viewer && (
        <AlbumForm
          key={`${tournamentId}:${viewer.id}`}
          tournament={{ id: tournamentId, name: tournamentName }}
          onClose={() => setCreating(false)}
          onRestoreFocus={() => createButton.current?.focus()}
          onSaved={id => {
            setCreating(false);
            void navigate({
              to: '/settings',
              search: { page: 'uploads', uploadView: 'albums', album: id },
            });
          }}
        />
      )}
    </>
  );
}
