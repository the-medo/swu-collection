import { useEffect, useImperativeHandle, useRef, type Ref } from 'react';
import { loadYouTubePlayerApi, type YouTubePlayer } from './youtubePlayerApi.ts';

export type CreationVideoHandle = { seekTo(seconds: number): void };

export function CreationVideo({
  videoId,
  title,
  enableNavigation,
  onNavigationUnavailable,
  ref,
}: {
  videoId: string;
  title: string;
  enableNavigation: boolean;
  onNavigationUnavailable(unavailable: boolean): void;
  ref?: Ref<CreationVideoHandle>;
}) {
  const container = useRef<HTMLDivElement>(null);
  const seek = useRef<((seconds: number) => void) | null>(null);

  useImperativeHandle(ref, () => ({ seekTo: seconds => seek.current?.(seconds) }), []);

  useEffect(() => {
    const host = container.current!;
    let active = true;
    let player: YouTubePlayer | undefined;
    let readyPlayer: YouTubePlayer | undefined;
    let pendingSeek: number | null = null;
    let readyTimeout: number | undefined;

    // YouTube's destroy() removes the iframe. Keep that DOM inside a React-owned
    // container so cleanup is also safe during StrictMode's effect replay.
    const iframe = document.createElement('iframe');
    const params = new URLSearchParams({
      enablejsapi: '1',
      playsinline: '1',
      origin: window.location.origin,
    });
    iframe.src = `https://www.youtube-nocookie.com/embed/${videoId}?${params}`;
    iframe.title = 'YouTube video';
    iframe.className = 'absolute inset-0 h-full w-full border-0';
    iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    host.append(iframe);

    const seekTo = (seconds: number) => {
      if (!readyPlayer) {
        pendingSeek = seconds;
        return;
      }
      readyPlayer.seekTo(seconds, true);
      readyPlayer.playVideo();
    };
    seek.current = seekTo;

    const navigationFailed = () => {
      window.clearTimeout(readyTimeout);
      pendingSeek = null;
      if (active) onNavigationUnavailable(true);
    };
    if (enableNavigation) {
      readyTimeout = window.setTimeout(navigationFailed, 15_000);
      void loadYouTubePlayerApi()
        .then(api => {
          if (!active) return;
          player = new api.Player(iframe, {
            events: {
              onReady: event => {
                if (!active) return;
                window.clearTimeout(readyTimeout);
                onNavigationUnavailable(false);
                readyPlayer = event.target;
                if (pendingSeek !== null) {
                  seekTo(pendingSeek);
                  pendingSeek = null;
                }
              },
            },
          });
        })
        .catch(navigationFailed);
    }

    return () => {
      active = false;
      window.clearTimeout(readyTimeout);
      seek.current = null;
      player?.destroy();
      host.replaceChildren();
    };
  }, [videoId, enableNavigation, onNavigationUnavailable]);

  useEffect(() => {
    const iframe = container.current?.querySelector('iframe');
    if (iframe) iframe.title = title;
  }, [videoId, title, enableNavigation]);

  return (
    <div
      ref={container}
      className="relative aspect-video min-h-[200px] w-full overflow-hidden rounded-[20px] border border-border bg-black"
    />
  );
}
