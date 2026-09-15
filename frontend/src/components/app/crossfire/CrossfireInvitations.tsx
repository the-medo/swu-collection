import { invalidateCrossfireGames } from '@/api/crossfire/useLeaveGame.ts';
import { crossfireInvitationEventSchema } from '../../../../../shared/types/crossfire.ts';
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
  const { data: session, refetch } = useSession();
  const sessionId = session?.session.id ?? '';
  const query = useInvitations(sessionId);
  const client = useQueryClient();
  const location = useLocation();
  const [now, setNow] = useState(Date.now);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const played = useRef(new Set<string>());
  const audio = useRef<HTMLAudioElement | null>(null);
  const invitations = (query.data ?? []).filter(i => new Date(i.expiresAt).getTime() > now);
  const incoming = invitations.filter(i => i.direction === 'incoming');
  const newest = incoming.find(i => !dismissed.has(i.lobbyId));
  const available = query.data !== undefined;
  useEffect(() => {
    const active = new Set(query.data?.map(i => i.lobbyId) ?? []);
    for (const id of played.current) if (!active.has(id)) played.current.delete(id);
    setDismissed(previous => {
      const retained = new Set([...previous].filter(id => active.has(id)));
      return retained.size === previous.size ? previous : retained;
    });
  }, [query.data]);

  useEffect(() => {
    if (!query.data?.length) return;
    setNow(Date.now());
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(clock);
  }, [query.data]);
  useEffect(() => {
    played.current.clear();
    setDismissed(new Set());
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
    if (!sessionId || !available) return;
    let stopped = false,
      socket: WebSocket | undefined,
      retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    let lastMessage = Date.now();
    const refresh = (lobbyId?: string) => {
      void client.invalidateQueries({ queryKey: invitationsKey(sessionId) });
      if (lobbyId)
        void client.invalidateQueries({ queryKey: crossfireKeys.lobby(sessionId, lobbyId) });
      else
        void client.invalidateQueries({ queryKey: [...crossfireKeys.session(sessionId), 'lobby'] });
    };
    const connect = () => {
      if (stopped) return;
      const url = new URL('/api/ws/invitations/crossfire', window.location.origin);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(url);
      lastMessage = Date.now();
      socket.onmessage = event => {
        let data;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }
        const parsed = crossfireInvitationEventSchema.safeParse(data);
        if (!parsed.success) return;
        lastMessage = Date.now();
        data = parsed.data;
        if (data.type === 'crossfire.connected') {
          attempts = 0;
          refresh();
          void invalidateCrossfireGames(client, sessionId);
        } else if (data.type === 'crossfire.game') {
          void invalidateCrossfireGames(client, sessionId);
        } else if (data.type === 'crossfire.invitation' && typeof data.lobbyId === 'string')
          refresh(data.lobbyId);
      };
      socket.onclose = event => {
        if (!stopped && [4401, 4403].includes(event.code)) {
          client.setQueryData(invitationsKey(sessionId), []);
          void refetch();
        }
        if (stopped || [4401, 4403, 4404, 4429].includes(event.code)) return;
        retry = setTimeout(
          connect,
          Math.min(30_000, 1000 * 2 ** Math.min(attempts++, 5)) + Math.random() * 500,
        );
      };
    };
    connect();
    const heartbeat = setInterval(() => {
      if (Date.now() - lastMessage > 45_000 && socket && socket.readyState < WebSocket.CLOSING)
        socket.close();
      else if (socket?.readyState === WebSocket.OPEN) socket.send('ping');
    }, 15_000);
    const focus = () => {
      refresh();
      if (socket?.readyState === WebSocket.CLOSED) {
        clearTimeout(retry);
        connect();
      }
    };
    window.addEventListener('focus', focus);
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearInterval(heartbeat);
      window.removeEventListener('focus', focus);
      socket?.close();
    };
  }, [sessionId, available, client, refetch]);
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
              onClick={() => setDismissed(previous => new Set(previous).add(newest.lobbyId))}
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
