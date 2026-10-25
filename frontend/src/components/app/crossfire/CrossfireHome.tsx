import { BrowseHeader, BrowsePage } from '@/components/app/global/BrowsePage/BrowsePage.tsx';
import { PortalThemeProvider } from '@/components/ui/portal-theme.ts';
import { workspaceTheme } from '@/components/app/global/WorkspacePage/workspaceStyles.ts';
import { CrossfireLogo } from './CrossfireLogo.tsx';
import { crossfireHomeStyles as styles } from './crossfireHomeStyles.ts';
import { Link, Navigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowUpRight, Bookmark, Clock3, Flag, History } from 'lucide-react';
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
import { InvitationMatchup } from './InvitationMatchup.tsx';
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
    <aside className={styles.aside}>
      <RunningGames sessionId={sessionId} />
      <InvitationSidebar sessionId={sessionId} controls={controls} />
      <PracticeInvitations sessionId={sessionId} />
    </aside>
  );
  if (lobby?.status === 'started')
    return <Navigate to="/crossfire/$lobbyId" params={{ lobbyId: lobby.id }} replace />;
  const ready = !invitationId || lobby?.status === 'waiting';
  return (
    <PortalThemeProvider value={workspaceTheme}>
      <BrowsePage className={styles.page}>
        <Helmet>
          <title>Crossfire | SWUBASE</title>
        </Helmet>
        <BrowseHeader
          eyebrow="Your practice table"
          title="Crossfire"
          description="Put your deck to the test. Play a friend, try a new matchup, and revisit every move."
          icon={CrossfireLogo}
        >
          <Button asChild variant="outline" size="sm">
            <Link to="/decks/your">
              Your decks <ArrowUpRight className="size-4" />
            </Link>
          </Button>
          <span className="rounded-full border border-[color:var(--workspace-border)] bg-[var(--workspace-soft)] px-3 py-1.5 text-xs text-primary">
            Two-player practice
          </span>
        </BrowseHeader>
        {invitationId && !ready ? (
          <section className={`${styles.panel} space-y-3`}>
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
          <div className={styles.layout}>
            <WaitingInvitation lobby={lobby} sessionId={sessionId} />
            {aside({ invite: () => {}, canInvite: false, pending: false })}
          </div>
        ) : (
          <>
            {lobby && (
              <section className={styles.banner} aria-label="Invitation details">
                <div className="flex min-w-0 flex-1 flex-col items-start gap-3">
                  <span className={styles.eyebrow}>An opponent is waiting</span>
                  <h2 className="m-0! border-0! p-0! text-xl! font-semibold! leading-snug! tracking-tight! wrap-anywhere sm:text-2xl!">
                    {lobby.host?.name ?? 'Your opponent'} invited you to Crossfire
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Best of {lobby.bestOf ?? 1}
                    {lobby.bestOf === 3 && ' · Sideboarding between games'}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {lobby.expiresAt && (
                      <span className="flex items-center gap-1.5 rounded-full border border-[color:var(--workspace-border)] bg-card px-2.5 py-1.5 text-[11px] text-muted-foreground">
                        <Clock3 className="size-3.5" aria-hidden />
                        Expires in <InvitationCountdown expiresAt={lobby.expiresAt} />
                      </span>
                    )}
                    <Button
                      asChild
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                    >
                      <Link to="/crossfire" search={{}}>
                        Leave invitation
                      </Link>
                    </Button>
                  </div>
                </div>
                <InvitationMatchup
                  leaderId={lobby.host?.leaderId}
                  baseId={lobby.host?.baseId}
                  className="w-full shrink-0 sm:w-96"
                />
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
        <div className={styles.activity}>
          <section className={styles.panel} aria-label="Recent games">
            <h2 className={`${styles.heading} flex items-center gap-2`}>
              <History size={16} />
              Recent games
            </h2>
            <p className="mb-4 mt-1 text-xs text-muted-foreground">
              Pick up a game or review how it played out.
            </p>
            <GameHistory key={sessionId} sessionId={sessionId} embedded />
          </section>
          <Tabs defaultValue="bookmarks" className={`${styles.panel} cf-saved-activity`}>
            <TabsList aria-label="Saved Crossfire activity" className={styles.tabs}>
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
      </BrowsePage>
    </PortalThemeProvider>
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
