import './crossfire-home.css';
import { Link, Navigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Bookmark, Flag, History } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { useCrossfireLobby } from '@/api/crossfire/useCrossfireLobby.ts';
import type { ClientSession } from '@/lib/auth-client.ts';
import { CrossfireSession } from './CrossfireSession.tsx';
import { CrossfirePlayDesk } from './CrossfirePlayDesk.tsx';
import { RunningGames } from './RunningGames.tsx';
import { GameHistory } from './GameHistory.tsx';
import { Bookmarks } from './Bookmarks.tsx';
import { ProblemReports } from './ProblemReports.tsx';
import { PracticeInvitations } from './PracticeInvitations.tsx';
import { InvitationSidebar, type InviteControls } from './InvitationSidebar.tsx';
import { InvitationCountdown } from './CrossfireInvitations.tsx';
import { InvitationPortraits } from './InvitationPortraits.tsx';
import { WaitingInvitation } from './WaitingInvitation.tsx';
import { crossfireError } from './presentation.ts';

function Home({
  session,
  initialDeck,
  invitationId,
}: {
  session: ClientSession;
  initialDeck?: string;
  invitationId?: string;
}) {
  const sessionId = session.session.id;
  const query = useCrossfireLobby(sessionId, invitationId ?? '');
  const lobby = invitationId ? query.data : undefined;
  const aside = (controls: InviteControls) => (
    <aside className="cf-home-aside">
      <RunningGames sessionId={sessionId} />
      <InvitationSidebar sessionId={sessionId} controls={controls} />
      <PracticeInvitations sessionId={sessionId} />
    </aside>
  );
  if (lobby?.status === 'started')
    return <Navigate to="/crossfire/$lobbyId" params={{ lobbyId: lobby.id }} replace />;
  const ready = !invitationId || lobby?.status === 'waiting';
  return (
    <div className="crossfire cf-home">
      <Helmet>
        <title>Crossfire | SWUBASE</title>
      </Helmet>
      <h1 className="sr-only">Crossfire</h1>
      {invitationId && !ready ? (
        <section className="cf-home-card space-y-3 mb-2">
          <p role={query.isPending ? 'status' : 'alert'}>
            {query.isPending
              ? 'Opening invitation…'
              : query.isError
                ? crossfireError(query.error)
                : lobby?.status === 'expired'
                  ? 'This invitation has expired.'
                  : 'This invitation is no longer available.'}
          </p>
          <Button asChild variant="outline">
            <Link to="/crossfire" search={{}}>
              Back to Crossfire
            </Link>
          </Button>
        </section>
      ) : lobby?.mySeat ? (
        <div className="cf-home-grid">
          {aside({ invite: () => {}, canInvite: false, pending: false })}
          <WaitingInvitation lobby={lobby} sessionId={sessionId} />
        </div>
      ) : (
        <>
          {lobby && (
            <section className="cf-lobby-banner" aria-label="Invitation details">
              <InvitationPortraits leaderId={lobby.host?.leaderId} baseId={lobby.host?.baseId} />
              <div>
                <strong>{lobby.host?.name ?? 'Your opponent'} invited you to Crossfire</strong>
                <p>Choose your deck. Game settings are set by your opponent.</p>
              </div>
              {lobby.expiresAt && <InvitationCountdown expiresAt={lobby.expiresAt} />}
              <Button asChild size="sm" variant="ghost">
                <Link to="/crossfire" search={{}}>
                  Leave
                </Link>
              </Button>
            </section>
          )}
          <CrossfirePlayDesk
            key={`${invitationId ?? ''}:${initialDeck ?? ''}`}
            sessionId={sessionId}
            initialDeck={initialDeck}
            lobby={lobby ?? undefined}
            renderAside={aside}
          />
        </>
      )}
      <div className="cf-home-activity-grid">
        <section className="cf-home-card" aria-label="Recent games">
          <h2 className="mb-3 flex items-center gap-2">
            <History size={16} />
            Recent games
          </h2>
          <GameHistory sessionId={sessionId} embedded />
        </section>
        <Tabs defaultValue="bookmarks" className="cf-home-card cf-saved-activity">
          <TabsList aria-label="Saved Crossfire activity" className="cf-activity-tabs">
            <TabsTrigger value="bookmarks">
              <Bookmark size={15} />
              Bookmarks
            </TabsTrigger>
            <TabsTrigger value="reports">
              <Flag size={15} />
              Bug reports
            </TabsTrigger>
          </TabsList>
          <TabsContent value="bookmarks">
            <Bookmarks sessionId={sessionId} embedded />
          </TabsContent>
          <TabsContent value="reports">
            <ProblemReports sessionId={sessionId} embedded />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
export function CrossfireHome({
  initialDeck,
  invitationId,
}: {
  initialDeck?: string;
  invitationId?: string;
}) {
  return (
    <CrossfireSession>
      {session => <Home session={session} initialDeck={initialDeck} invitationId={invitationId} />}
    </CrossfireSession>
  );
}
