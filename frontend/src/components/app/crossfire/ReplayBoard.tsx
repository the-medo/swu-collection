import { PracticeControls } from './PracticeControls.tsx';
import { BookmarkControls } from './BookmarkControls.tsx';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '@tanstack/react-store';
import { MotionConfig } from 'motion/react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Copy,
  MessagesSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import { getConnectionTicket } from '@/api/crossfire/getConnectionTicket.ts';
import { crossfireWsUrl } from '@/lib/crossfireWsUrl.ts';
import type { CrossfireLobby } from '../../../../../shared/types/crossfire.ts';
import type { ReplaySeek } from '../../../../../play/view/types.ts';
import { GameCatalog } from './gameCatalog.ts';
import { CrossfireLogo } from './CrossfireLogo.tsx';
import { CrossfireConnection } from './connection.ts';
import { BoardPosition } from './BoardPosition.tsx';
import { words } from './presentation.ts';
import './board.css';
import './replay.css';

export default function ReplayBoard({
  lobby,
  initialPosition,
  initialBranch,
  practiceRequest,
}: {
  lobby: CrossfireLobby;
  initialPosition?: string;
  initialBranch?: string;
  practiceRequest?: string;
}) {
  const [logOpen, setLogOpen] = useState(false),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1),
    [follow, setFollow] = useState(false);
  const [bottom, setBottom] = useState(lobby.mySeat ?? 'p1'),
    [copied, setCopied] = useState(false);
  const [scrub, setScrub] = useState<{ value: number; anchor: object | null } | null>(null),
    scrubTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const role = lobby.mySeat ? 'player' : 'spectator',
    gameId = lobby.gameId!;
  const connection = useMemo(
    () =>
      new CrossfireConnection(
        gameId,
        role,
        {
          ticket: signal => getConnectionTicket(lobby.id, role, signal, 'replay'),
          socket: id => new WebSocket(crossfireWsUrl(id)),
        },
        { replay: true, position: initialPosition, branch: initialBranch },
      ),
    [gameId, role, lobby.id, initialPosition, initialBranch],
  );
  useEffect(() => {
    connection.start();
    return () => {
      connection.stop();
      clearTimeout(scrubTimer.current);
    };
  }, [connection]);
  const state = useStore(connection.store),
    position = state.replay;
  const { data: catalog } = useCardList();
  const ready = state.status === 'connected';
  const advancing = playing && !(position?.atEnd && !position.live);
  useEffect(() => {
    if (!advancing || !ready || state.pending || !position || position.atEnd) return;
    const timer = setTimeout(() => connection.seek({ kind: 'step', offset: 1 }), 1000 / speed);
    return () => clearTimeout(timer);
  }, [advancing, ready, state.pending, position, speed, connection]);
  useEffect(() => {
    if (follow && ready) connection.seek({ kind: 'end' });
  }, [follow, ready, state.liveProgress, connection]);
  const navigate = (seek: ReplaySeek) => {
    clearTimeout(scrubTimer.current);
    setScrub(null);
    setPlaying(false);
    setFollow(false);
    connection.seek(seek);
  };
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !ready ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        (event.target as HTMLElement)?.closest('input, textarea, select, button, [role="dialog"]')
      )
        return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        setPlaying(false);
        setFollow(false);
        connection.seek({
          kind: 'step',
          offset: event.key === 'ArrowLeft' ? (event.shiftKey ? -5 : -1) : event.shiftKey ? 5 : 1,
        });
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [ready, connection]);
  return (
    <MotionConfig reducedMotion="always">
      <GameCatalog.Provider value={catalog?.cards}>
        <div className="cf-game cf-replay" data-testid="crossfire-replay">
          <Helmet>
            <title>Crossfire replay | SWUBASE</title>
          </Helmet>
          <header className="cf-header">
            <div className="flex items-center gap-3">
              <CrossfireLogo dark className="cf-header-logo h-7 w-12" />
              <h1 className="cf-wordmark">
                CROSSFIRE<small>REPLAY</small>
              </h1>
              <span className="cf-header-phase">
                {state.view
                  ? `Round ${state.view.round} · ${words(state.view.phase)}`
                  : 'Connecting'}
              </span>
            </div>
            <div className="cf-header-controls">
              <BookmarkControls connection={connection} />
              <BookmarkControls connection={connection} report />
              <Button
                variant="ghost"
                size="sm"
                className="cf-log-toggle"
                aria-label="Toggle game log"
                onClick={() => setLogOpen(!logOpen)}
              >
                <MessagesSquare size={17} />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!position}
                aria-label="Copy replay position link"
                onClick={() => {
                  if (!position) return;
                  const url = new URL(`/crossfire/replay/${lobby.id}`, window.location.origin);
                  url.searchParams.set('cfPosition', position.position);
                  url.searchParams.set('cfBranch', position.branch);
                  void navigator.clipboard.writeText(url.href).then(
                    () => setCopied(true),
                    () => setCopied(false),
                  );
                }}
              >
                <Copy size={15} />
                <span className="cf-control-label">{copied ? 'Copied' : 'Copy position'}</span>
              </Button>
              <Link to="/crossfire/$lobbyId" params={{ lobbyId: lobby.id }} className="cf-leave">
                Game
              </Link>
              <Link to="/crossfire" className="cf-leave">
                Your games
              </Link>
            </div>
          </header>
          {practiceRequest && (
            <PracticeControls connection={connection} requestId={practiceRequest} />
          )}
          <div className="cf-replay-controls" aria-label="Replay controls">
            <div className="cf-replay-transport">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Go to start"
                disabled={!ready || position?.atStart}
                onClick={() => navigate({ kind: 'start' })}
              >
                <SkipBack size={17} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Five steps back"
                disabled={!ready || position?.atStart}
                onClick={() => navigate({ kind: 'step', offset: -5 })}
              >
                <ChevronsLeft size={17} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Previous step"
                disabled={!ready || position?.atStart}
                onClick={() => navigate({ kind: 'step', offset: -1 })}
              >
                <ChevronLeft size={19} />
              </Button>
              <Button
                size="icon"
                aria-label={advancing ? 'Pause replay' : 'Play replay'}
                disabled={!ready || (position?.atEnd && !position.live)}
                onClick={() => setPlaying(!advancing)}
              >
                {advancing ? <Pause size={17} /> : <Play size={17} />}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Next step"
                disabled={!ready || position?.atEnd}
                onClick={() => navigate({ kind: 'step', offset: 1 })}
              >
                <ChevronRight size={19} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Five steps forward"
                disabled={!ready || position?.atEnd}
                onClick={() => navigate({ kind: 'step', offset: 5 })}
              >
                <ChevronsRight size={17} />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Go to latest position"
                disabled={!ready || position?.atEnd}
                onClick={() => navigate({ kind: 'end' })}
              >
                <SkipForward size={17} />
              </Button>
            </div>
            <input
              className="cf-replay-scrubber"
              type="range"
              min={0}
              max={1000}
              step={1}
              aria-label="Replay position"
              disabled={!ready}
              value={scrub?.anchor === position ? scrub.value : (position?.progress ?? 0) * 1000}
              onChange={e => {
                const value = Number(e.target.value);
                setScrub({ value, anchor: position });
                setPlaying(false);
                setFollow(false);
                clearTimeout(scrubTimer.current);
                scrubTimer.current = setTimeout(
                  () => connection.seek({ kind: 'fraction', value: value / 1000 }),
                  120,
                );
              }}
            />
            <div className="cf-replay-options">
              <Button
                size="sm"
                variant="ghost"
                disabled={!ready || position?.atStart}
                onClick={() => navigate({ kind: 'action', direction: -1 })}
              >
                Previous action
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={!ready || position?.atEnd}
                onClick={() => navigate({ kind: 'action', direction: 1 })}
              >
                Next action
              </Button>
              <select
                aria-label="Playback speed"
                value={speed}
                onChange={e => setSpeed(Number(e.target.value))}
              >
                {[0.5, 1, 2, 4].map(n => (
                  <option key={n} value={n}>
                    {n}× speed
                  </option>
                ))}
              </select>
              <select
                aria-label="Replay branch"
                value={position?.branch ?? ''}
                disabled={!ready}
                onChange={e => navigate({ kind: 'branch', branch: e.target.value })}
              >
                {position?.branches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Replay perspective"
                value={state.perspective}
                disabled={!ready}
                onChange={e => {
                  setPlaying(false);
                  connection.seek({ kind: 'refresh' }, e.target.value as 'own' | 'public');
                }}
              >
                <option value="own">{role === 'player' ? 'My view' : 'Spectator view'}</option>
                <option value="public">Public table</option>
              </select>
              <select
                aria-label="Player at bottom"
                value={bottom}
                onChange={e => setBottom(e.target.value as 'p1' | 'p2')}
              >
                <option value="p1">Player 1 below</option>
                <option value="p2">Player 2 below</option>
              </select>
              {position?.live && (
                <label className="cf-replay-follow">
                  <input
                    type="checkbox"
                    checked={follow}
                    onChange={e => {
                      setFollow(e.target.checked);
                      setPlaying(false);
                    }}
                  />
                  Follow live
                </label>
              )}
            </div>
          </div>
          {state.notice && (
            <p className="cf-notice" role="alert">
              {state.notice}
            </p>
          )}
          {!state.view ? (
            <div className="space-y-4 p-8">
              <p role="status">
                {state.status === 'stopped'
                  ? 'Replay connection stopped.'
                  : 'Loading this position…'}
              </p>
              {state.status === 'stopped' && (
                <Button onClick={() => connection.reconnect()}>Reconnect</Button>
              )}
            </div>
          ) : (
            <BoardPosition
              key={state.view.epoch}
              view={state.view}
              seat={state.viewer?.role === 'player' ? state.viewer.seat : undefined}
              bottomSeat={bottom}
              readOnly
              pending={state.pending}
              connection={connection}
              logOpen={logOpen}
              closeLog={() => setLogOpen(false)}
            />
          )}
        </div>
      </GameCatalog.Provider>
    </MotionConfig>
  );
}
