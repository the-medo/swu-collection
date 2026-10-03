import type { AppClientMessage, AppSubscription } from '../../../shared/types/notifications.ts';

export type AppEvent = { type: string; [key: string]: unknown };
type Listener = (event: AppEvent) => void;
const terminalCodes = new Set([4400, 4401, 4403]);

/** One transport per signed-in tab; page consumers only add/remove subscriptions. */
export class AppRealtimeConnection {
  private socket: WebSocket | undefined;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private probe: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private stopped = true;
  private blocked = false;
  private ready = false;
  private attempts = 0;
  private lastMessage = 0;
  private listeners = new Set<Listener>();
  private subscriptions = new Map<symbol, AppSubscription>();

  constructor(
    private readonly url: string,
    private readonly onAuthFailure: () => void,
    private readonly createSocket = (url: string) => new WebSocket(url),
  ) {}

  start() {
    if (!this.stopped) return;
    this.stopped = false;
    this.blocked = false;
    this.connect();
    this.heartbeat = setInterval(() => {
      if (Date.now() - this.lastMessage > 90_000 && this.socket && this.socket.readyState < 2)
        this.socket.close();
      else this.send({ v: 1, type: 'ping' });
    }, 30_000);
  }
  stop() {
    this.stopped = true;
    this.ready = false;
    clearTimeout(this.retry);
    clearInterval(this.heartbeat);
    clearTimeout(this.probe);
    this.probe = undefined;
    const socket = this.socket;
    this.socket = undefined;
    socket?.close(1000, 'Session changed');
  }
  focus = () => {
    if (this.stopped || this.blocked) return;
    if (!this.socket || this.socket.readyState === 3) {
      clearTimeout(this.retry);
      this.connect();
    } else if (Date.now() - this.lastMessage > 45_000 && !this.probe) {
      // Background timer throttling is normal. Probe before replacing a socket.
      const socket = this.socket,
        lastMessage = this.lastMessage;
      this.send({ v: 1, type: 'ping' });
      this.probe = setTimeout(() => {
        this.probe = undefined;
        if (
          this.stopped ||
          this.blocked ||
          this.socket !== socket ||
          this.lastMessage !== lastMessage
        )
          return;
        this.socket = undefined;
        this.ready = false;
        socket.close();
        clearTimeout(this.retry);
        this.connect();
      }, 5000);
    }
  };
  listen(listener: Listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  subscribe(subscription: AppSubscription) {
    const token = Symbol(subscription.topic);
    const previous = this.activeSubscription(subscription.topic);
    this.subscriptions.set(token, subscription);
    if (JSON.stringify(previous) !== JSON.stringify(subscription))
      this.send({ v: 1, type: 'subscribe', subscription });
    return () => {
      const current = this.activeSubscription(subscription.topic);
      if (!this.subscriptions.delete(token)) return;
      const next = this.activeSubscription(subscription.topic);
      if (JSON.stringify(current) === JSON.stringify(next)) return;
      this.send(
        next
          ? { v: 1, type: 'subscribe', subscription: next }
          : { v: 1, type: 'unsubscribe', subscription },
      );
    };
  }
  // The server has one active scope per topic. Nested consumers temporarily
  // select their scope; releasing it restores the previous consumer's scope.
  private activeSubscription(topic: AppSubscription['topic']) {
    let active: AppSubscription | undefined;
    for (const value of this.subscriptions.values()) if (value.topic === topic) active = value;
    return active;
  }
  private send(message: AppClientMessage) {
    if (this.ready && this.socket?.readyState === 1) this.socket.send(JSON.stringify(message));
  }
  private connect() {
    if (this.stopped || this.blocked || (this.socket && this.socket.readyState < 2)) return;
    this.ready = false;
    this.lastMessage = Date.now();
    let socket: WebSocket;
    try {
      socket = this.createSocket(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.onmessage = message => {
      if (this.socket !== socket || this.stopped) return;
      let event: AppEvent;
      try {
        const value: unknown = JSON.parse(String(message.data));
        if (
          !value ||
          typeof value !== 'object' ||
          !('type' in value) ||
          typeof value.type !== 'string'
        )
          return;
        event = value as AppEvent;
      } catch {
        return;
      }
      this.lastMessage = Date.now();
      clearTimeout(this.probe);
      this.probe = undefined;
      if (event.type === 'app.connected' && event.v === 1) {
        this.ready = true;
        this.attempts = 0;
        const active = new Map([...this.subscriptions.values()].map(value => [value.topic, value]));
        for (const subscription of active.values())
          this.send({ v: 1, type: 'subscribe', subscription });
      }
      if (!this.ready) return;
      for (const listener of this.listeners) listener(event);
    };
    socket.onclose = event => {
      if (this.socket !== socket || this.stopped) return;
      this.socket = undefined;
      this.ready = false;
      clearTimeout(this.probe);
      this.probe = undefined;
      if (terminalCodes.has(event.code)) {
        this.blocked = true;
        if (event.code === 4401 || event.code === 4403) this.onAuthFailure();
        return;
      }
      this.scheduleReconnect(event.code === 4429 ? 60_000 : 0);
    };
    socket.onerror = () => {
      /* onclose owns recovery. */
    };
  }
  private scheduleReconnect(minimumDelay = 0) {
    if (this.stopped || this.blocked) return;
    clearTimeout(this.retry);
    this.retry = setTimeout(
      () => this.connect(),
      Math.max(minimumDelay, Math.min(30_000, 1000 * 2 ** Math.min(this.attempts++, 5))) +
        Math.random() * 500,
    );
  }
}
