import { Textarea } from '@/components/ui/textarea.tsx';
import { useEffect, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { useQueryClient } from '@tanstack/react-query';
import { BookmarkPlus, Bug } from 'lucide-react';
import { useSession } from '@/lib/auth-client.ts';
import { bookmarkKey } from '@/api/crossfire/useBookmarks.ts';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Label } from '@/components/ui/label.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './CrossfireDialog.tsx';
import type { CrossfireConnection } from './connection.ts';
import { ToolbarButton } from './ToolbarButton.tsx';
export function BookmarkControls({
  connection,
  report = false,
}: {
  connection: CrossfireConnection;
  report?: boolean;
}) {
  const state = useStore(connection.store),
    { data: session } = useSession(),
    query = useQueryClient();
  const [open, setOpen] = useState(false),
    [label, setLabel] = useState(''),
    [description, setDescription] = useState(''),
    [request, setRequest] = useState<string | null>(null);
  const saved = !!request && state.bookmark?.id === request;
  useEffect(() => {
    if (state.bookmark && session) {
      void query.invalidateQueries({ queryKey: bookmarkKey(session.session.id) });
      void query.invalidateQueries({ queryKey: ['crossfire-reports', session.session.id] });
    }
  }, [state.bookmark, session, query]);
  return (
    <>
      <ToolbarButton
        label={report ? 'Report a problem' : 'Bookmark'}
        tone={report ? 'report' : 'bookmark'}
        icon={report ? <Bug size={17} /> : <BookmarkPlus size={17} />}
        disabled={
          !state.view || state.status !== 'connected' || state.pending || state.bookmarkPending
        }
        onClick={() => {
          setOpen(true);
          setLabel('');
          setDescription('');
          setRequest(null);
        }}
      />
      <Dialog open={open && !saved} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{report ? 'Report a problem' : 'Bookmark this position'}</DialogTitle>
            <DialogDescription>
              {report
                ? 'Describe what happened and what you expected. Submitting saves the current game position and shares your note with the development team.'
                : 'Save the current committed position, including its branch, to your account.'}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={e => {
              e.preventDefault();
              const id = crypto.randomUUID();
              setRequest(id);
              connection.saveBookmark(id, label, report ? description : undefined);
            }}
          >
            <Label htmlFor={report ? 'cf-report-label' : 'cf-bookmark-label'}>
              {report ? 'Short title' : 'Label (optional)'}
            </Label>
            <Input
              id={report ? 'cf-report-label' : 'cf-bookmark-label'}
              value={label}
              maxLength={120}
              onChange={e => setLabel(e.target.value)}
              autoFocus
            />
            {report && (
              <>
                <Label htmlFor="cf-report-description">What went wrong?</Label>
                <Textarea
                  id="cf-report-description"
                  value={description}
                  minLength={10}
                  maxLength={3000}
                  required
                  rows={5}
                  onChange={event => setDescription(event.target.value)}
                />
              </>
            )}
            {request && !state.bookmarkPending && !saved && (
              <p role="alert">Could not save this position. Try again.</p>
            )}
            <Button
              type="submit"
              disabled={state.bookmarkPending || (report && description.trim().length < 10)}
            >
              {state.bookmarkPending ? 'Saving…' : report ? 'Submit report' : 'Save bookmark'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
