import { invalidateCrossfireGames } from '@/api/crossfire/useLeaveGame.ts';
import { useAppRealtime } from '@/components/app/realtime/context.ts';
import './invitations.css';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { hasCrossfireAccess } from '../../../../../shared/lib/auth/roles.ts';
import { useSession } from '@/lib/auth-client.ts';
import { invitationsKey, useInvitations } from '@/api/crossfire/useInvitations.ts';
import { crossfireKeys } from '@/api/crossfire/queryKeys.ts';
import { Button } from '@/components/ui/button.tsx';
import { InvitationContext } from './invitationContext.ts';
import { CrossfireLogo } from './CrossfireLogo.tsx';
import { InvitationPortraits } from './InvitationPortraits.tsx';

export const invitationSoundUrl =
  'https://images.swubase.com/crossfire/audio/invitation-58d0bda22ed0.wav';
export function InvitationCountdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1000));
  return (
    <span className="cf-invite-countdown">
      {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, '0')}
    </span>
  );
}

export function CrossfireInvitations({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  if (!session || !hasCrossfireAccess(session.user.role)) return children;
  return <MemberInvitations key={session.session.id}>{children}</MemberInvitations>;
}

function MemberInvitations({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const realtime = useAppRealtime();
  const sessionId = session?.session.id ?? '';
  const query = useInvitations(sessionId);
  const client = useQueryClient();
  const location = useLocation();
  const [now, setNow] = useState(Date.now);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const played = useRef(new Set<string>());
  const audio = useRef<HTMLAudioElement | null>(null);
  const invitations = (query.data ?? []).filter(
    i => new Date(i.expiresAt).getTime() > Math.max(now, query.dataUpdatedAt),
  );
  const incoming = invitations.filter(i => i.direction === 'incoming');
  const newest = incoming.find(i => !dismissed.has(i.lobbyId));
  useEffect(() => {
    const active = new Set(query.data?.map(i => i.lobbyId) ?? []);
    for (const id of played.current) if (!active.has(id)) played.current.delete(id);
  }, [query.data]);

  useEffect(() => {
    if (!query.data?.length) return;
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [query.data]);
  useEffect(() => {
    // The parent keys this component by session, resetting local state on login changes.
    if (!sessionId) return;
    return () => {
      void client.cancelQueries({ queryKey: invitationsKey(sessionId) });
      client.removeQueries({ queryKey: invitationsKey(sessionId) });
    };
  }, [sessionId, client]);
  useEffect(() => {
    const sound = new Audio(invitationSoundUrl);
    sound.preload = 'none';
    sound.volume = 0.35;
    audio.current = sound;
    const unlock = () => {
      sound.muted = true;
      void sound
        .play()
        .then(() => {
          sound.pause();
          sound.currentTime = 0;
          sound.muted = false;
        })
        .catch(() => {
          sound.muted = false;
        });
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      sound.pause();
      audio.current = null;
    };
  }, []);
  useEffect(() => {
    if (!newest || played.current.has(newest.lobbyId)) return;
    played.current.add(newest.lobbyId);
    const play = async () => {
      try {
        if (audio.current) {
          audio.current.currentTime = 0;
          await audio.current.play();
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch {
        /* Browser audio permissions must never block an invitation. */
      }
    };
    if (navigator.locks)
      void navigator.locks.request(
        `crossfire-sound-${newest.lobbyId}`,
        { ifAvailable: true },
        lock => (lock ? play() : undefined),
      );
    else void play();
  }, [newest]);
  useEffect(() => {
    if (!sessionId || !realtime) return;
    const refresh = (lobbyId?: string) => {
      void client
        .cancelQueries({ queryKey: invitationsKey(sessionId) })
        .then(() => client.invalidateQueries({ queryKey: invitationsKey(sessionId) }));
      void client.invalidateQueries({
        queryKey: lobbyId
          ? crossfireKeys.lobby(sessionId, lobbyId)
          : [...crossfireKeys.session(sessionId), 'lobby'],
      });
    };
    const unlisten = realtime.listen(data => {
      if (data.type === 'app.connected' || data.type === 'app.resync') {
        refresh();
        void invalidateCrossfireGames(client, sessionId);
      } else if (data.type === 'crossfire.game') {
        void invalidateCrossfireGames(client, sessionId);
      } else if (data.type === 'crossfire.invitation' && typeof data.lobbyId === 'string') {
        refresh(data.lobbyId);
      }
    });
    let lastFocus = 0;
    const focus = () => {
      if (Date.now() - lastFocus < 5000) return;
      lastFocus = Date.now();
      refresh();
    };
    window.addEventListener('focus', focus);
    return () => {
      unlisten();
      window.removeEventListener('focus', focus);
    };
  }, [sessionId, client, realtime]);
  const viewing =
    newest && location.pathname === '/crossfire' && location.search.cfInvite === newest.lobbyId;
  return (
    <InvitationContext.Provider value={{ invitations, count: incoming.length }}>
      {children}
      {newest && !viewing && (
        <section
          role="dialog"
          aria-modal="false"
          aria-label="Crossfire invitation"
          className="cf-invitation-toast"
        >
          <div className="flex items-center gap-2">
            <CrossfireLogo className="h-6 w-10" />
            <strong>Crossfire invitation</strong>
            <Button
              className="ml-auto h-7 w-7"
              variant="ghost"
              size="icon"
              aria-label="Dismiss invitation notification"
              onClick={() =>
                setDismissed(previous => {
                  const active = new Set(invitations.map(i => i.lobbyId));
                  return new Set([...previous].filter(id => active.has(id))).add(newest.lobbyId);
                })
              }
            >
              <X size={15} />
            </Button>
          </div>
          <p>
            <strong>{newest.player.name}</strong> invited you to play.{' '}
            <InvitationCountdown expiresAt={newest.expiresAt} />
          </p>
          <InvitationPortraits leaderId={newest.leaderId} baseId={newest.baseId} />
          <Button asChild className="w-full">
            <Link to="/crossfire" search={{ cfInvite: newest.lobbyId }}>
              Open invitation
            </Link>
          </Button>
        </section>
      )}
    </InvitationContext.Provider>
  );
}
