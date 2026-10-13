export type YouTubePlayer = {
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  playVideo(): void;
  destroy(): void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLIFrameElement,
    options: { events: { onReady(event: { target: YouTubePlayer }): void } },
  ) => YouTubePlayer;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let loading: Promise<YouTubeApi> | undefined;

export function loadYouTubePlayerApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const previousReady = window.onYouTubeIframeAPIReady;
    const cleanup = () => {
      window.clearTimeout(timeout);
      script.onerror = null;
      if (window.onYouTubeIframeAPIReady === onReady)
        window.onYouTubeIframeAPIReady = previousReady;
    };
    const fail = () => {
      cleanup();
      script.remove();
      loading = undefined;
      reject(new Error('YouTube player API could not load.'));
    };
    const onReady = () => {
      if (!window.YT?.Player) return;
      cleanup();
      resolve(window.YT);
      previousReady?.();
    };
    const timeout = window.setTimeout(fail, 15_000);
    window.onYouTubeIframeAPIReady = onReady;
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = fail;
    document.head.append(script);
  });
  return loading;
}
