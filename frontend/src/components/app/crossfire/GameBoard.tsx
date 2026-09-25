import { LeaveGameButton } from './LeaveGameButton.tsx';
import { MatchControls } from './MatchControls.tsx';
import { BookmarkControls } from './BookmarkControls.tsx';
import { UndoControls } from './UndoControls.tsx';
import { useEffect, useMemo, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { MotionConfig } from 'motion/react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { Eye, RefreshCw, ArrowLeft, MessagesSquare, History } from 'lucide-react';
import { CrossfireLogo } from './CrossfireLogo.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getConnectionTicket } from '@/api/crossfire/getConnectionTicket.ts';
import { crossfireWsUrl } from '@/lib/crossfireWsUrl.ts';
import type { CrossfireLobby } from '../../../../../shared/types/crossfire.ts';
import { GameCatalog } from './gameCatalog.ts';
import { CrossfireConnection } from './connection.ts';
import { BoardPosition } from './BoardPosition.tsx';
import { PlotRevealNotice } from './PlotRevealNotice.tsx';
import { words } from './presentation.ts';
import { ToolbarButton } from './ToolbarButton.tsx';
import './board.css';

export default function GameBoard({
  lobby,
  sessionId,
}: {
  lobby: CrossfireLobby;
  sessionId: string;
}) {
  const navigate = useNavigate();
  const abandoned = lobby.exit?.status === 'abandoned';
  const [logOpen, setLogOpen] = useState(false);
  const role = lobby.mySeat ? 'player' : 'spectator';
  const gameId = lobby.gameId!;
  const connection = useMemo(
    () =>
      new CrossfireConnection(gameId, role, {
        ticket: signal => getConnectionTicket(lobby.id, role, signal),
        socket: id => new WebSocket(crossfireWsUrl(id)),
      }),
    [gameId, role, lobby.id],
  );
  useEffect(() => {
    if (!abandoned) connection.start();
    return () => connection.stop();
  }, [connection, abandoned]);
  const state = useStore(connection.store);
  const { data: catalog } = useCardList();
  const seat = state.viewer?.role === 'player' ? state.viewer.seat : undefined;
  return (
    <MotionConfig reducedMotion="user">
      <GameCatalog.Provider value={catalog?.cards}>
        <div className="cf-game">
          <PlotRevealNotice key={gameId} view={state.view} seat={seat} />
          <Helmet>
            <title>Crossfire game | SWUBASE</title>
          </Helmet>
          <header className="cf-header">
            <div className="flex items-center gap-3">
              <CrossfireLogo dark className="cf-header-logo h-7 w-12" />
              <h1 className="cf-wordmark">
                CROSSFIRE
                <small>{lobby.ai ? 'AI PRACTICE' : lobby.practice ? 'PRACTICE' : 'SWUBASE'}</small>
              </h1>
              <span className="cf-header-phase">
                {state.view
                  ? `Round ${state.view.round} · ${words(state.view.phase)}`
                  : abandoned
                    ? 'Game closed'
                    : state.status === 'stopped'
                      ? 'Disconnected'
                      : 'Connecting'}
                {role === 'spectator' ? ' · Spectating' : ''}
              </span>
              <span className={`cf-connection cf-connection-${state.status}`} role="status">
                <span className="cf-status-dot" />
                {abandoned ? 'Closed' : words(state.status)}
              </span>
            </div>
            <div className="cf-header-controls">
              {!lobby.ai && <UndoControls connection={connection} />}
              <BookmarkControls connection={connection} />
              <Link
                to="/crossfire/replay/$lobbyId"
                params={{ lobbyId: lobby.id }}
                className="cf-leave cf-toolbar-icon"
                aria-label="Open replay"
                title="Open replay"
              >
                <History size={17} />
              </Link>
              {role === 'spectator' && lobby.policy.handsToSpectators && (
                <label className="cf-reveal-toggle">
                  <Eye className="h-4 w-4" />
                  <Checkbox
                    checked={state.showRevealedHands}
                    disabled={state.pending || state.status !== 'connected'}
                    onCheckedChange={v => connection.showHands(v === true)}
                  />
                  Show revealed hands
                </label>
              )}
              <ToolbarButton
                className="cf-log-toggle"
                label="Toggle game log"
                icon={<MessagesSquare size={17} />}
                aria-expanded={logOpen}
                onClick={() => setLogOpen(!logOpen)}
              />
              <div className="cf-toolbar-utilities">
                {lobby.mySeat && !lobby.ai && lobby.compatible !== false && !abandoned && (
                  <MatchControls
                    key={lobby.id}
                    sessionId={sessionId}
                    lobbyId={lobby.id}
                    ended={state.view?.phase === 'ended'}
                  />
                )}
                <ToolbarButton
                  label="Resync"
                  icon={<RefreshCw size={17} />}
                  disabled={state.status !== 'connected' || state.pending}
                  onClick={() => connection.resync()}
                />
                <BookmarkControls connection={connection} report />
                {lobby.mySeat && !abandoned && state.view?.phase !== 'ended' && (
                  <LeaveGameButton
                    sessionId={sessionId}
                    lobbyId={lobby.id}
                    bestOf={lobby.bestOf}
                    compatible={lobby.compatible}
                    exit={lobby.exit}
                    connection={connection}
                    compact
                    onLeft={() => void navigate({ to: '/crossfire' })}
                  />
                )}
                <Link
                  to="/crossfire"
                  className="cf-leave cf-toolbar-icon"
                  aria-label="Back to Crossfire"
                  title="Back to Crossfire"
                >
                  <ArrowLeft size={17} />
                </Link>
              </div>
            </div>
          </header>
          {lobby.ai && (
            <p
              role="status"
              className={lobby.ai.status === 'retrying' ? 'cf-notice' : 'cf-ai-opponent'}
            >
              Playing {lobby.ai.deckLabel} · {lobby.ai.releaseLabel}. This game does not affect your
              statistics.
              {lobby.ai.status === 'retrying' &&
                ' The AI is reconnecting. Your game is saved; it will resume automatically.'}
            </p>
          )}
          {state.notice && !abandoned && (
            <p role="alert" className="cf-notice">
              {state.notice}
            </p>
          )}
          {lobby.exit?.status === 'pending' && (
            <p role="status" className="cf-notice">
              Leaving the match… The request is saved and will finish when the game server is
              available.
            </p>
          )}
          {abandoned || !state.view ? (
            <div className="space-y-4 rounded-xl border p-8">
              <p role="status">
                {abandoned
                  ? 'Abandoned — incompatible version. No winner was assigned. The saved game data has been kept.'
                  : state.status === 'stopped'
                    ? 'Game connection stopped.'
                    : 'Connecting securely to the game…'}
              </p>
              <div className="flex flex-wrap gap-3">
                {state.status === 'stopped' &&
                  !abandoned &&
                  !state.unavailableReason &&
                  lobby.compatible !== false && (
                    <Button onClick={() => connection.reconnect()}>Reconnect</Button>
                  )}
                {lobby.mySeat && !abandoned && (
                  <LeaveGameButton
                    sessionId={sessionId}
                    lobbyId={lobby.id}
                    bestOf={lobby.bestOf}
                    compatible={lobby.compatible ?? state.unavailableReason !== 'incompatible'}
                    exit={lobby.exit}
                    onLeft={() => void navigate({ to: '/crossfire' })}
                  />
                )}
                <Button variant="outline" asChild>
                  <Link to="/crossfire">Back to Crossfire</Link>
                </Button>
              </div>
            </div>
          ) : (
            <BoardPosition
              key={state.view.epoch}
              view={state.view}
              seat={seat}
              pending={
                state.pending ||
                state.controlPending ||
                !!state.undo ||
                lobby.exit?.status === 'pending'
              }
              connection={connection}
              allowChat={!lobby.ai}
              logOpen={logOpen}
              closeLog={() => setLogOpen(false)}
            />
          )}
        </div>
      </GameCatalog.Provider>
    </MotionConfig>
  );
}
