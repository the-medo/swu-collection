import { useRef, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { PenLine } from 'lucide-react';
import { useSaveCreation } from '@/api/creators';
import { useUser } from '@/hooks/useUser.ts';
import { Button } from '@/components/ui/button.tsx';
import type { TournamentStringDate } from '../../../../../types/Tournament.ts';
import type { CreationDocument } from '../../../../../shared/creators/contracts.ts';
import { TournamentWritingDialog } from './TournamentWritingDialog.tsx';

type Props = { tournament: TournamentStringDate };

export function CreateTournamentReportButton({ tournament }: Props) {
  const viewer = useUser();
  return <ReportButton key={`${tournament.id}:${viewer?.id ?? 'guest'}`} tournament={tournament} />;
}

function ReportButton({ tournament }: Props) {
  const save = useSaveCreation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  async function openDraft(document: CreationDocument) {
    // Reuse the saved draft if navigation fails, rather than creating another on retry.
    const draft = save.data ?? (await save.mutateAsync({ creatorId: null, document }));
    await navigate({ to: '/creator-studio', search: { creationId: draft.id } });
  }

  return (
    <>
      <Button ref={trigger} className="w-full rounded-xl" onClick={() => setOpen(true)}>
        <PenLine className="size-4" aria-hidden="true" />
        Write a report or article
      </Button>
      {open && (
        <TournamentWritingDialog
          tournament={tournament}
          draftSaved={!!save.data}
          onOpenDraft={openDraft}
          onClose={() => setOpen(false)}
          onReturnFocus={() => trigger.current?.focus({ preventScroll: true })}
        />
      )}
    </>
  );
}
