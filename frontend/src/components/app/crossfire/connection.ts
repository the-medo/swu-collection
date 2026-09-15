import type { ChatMessage } from '../../../../../play/view/chat.ts';
import { chatTextSchema } from '../../../../../play/view/chat.ts';
import type { Bookmark } from '../../../../../play/view/bookmarks.ts';
import type { UndoPending } from '../../../../../play/view/undo.ts';
import { disclosureComplete } from '../../../../../play/view/types.ts';
import { Store } from '@tanstack/react-store';
import {
  applyViewDelta,
  clientMessageSchema,
  serverMessageSchema,
} from '../../../../../play/view/types.ts';
import type {
  ClientMessage,
  GameView,
  ServerMessage,
  ReplayPosition,
  ReplaySeek,
} from '../../../../../play/view/types.ts';

type Viewer = Extract<ServerMessage, { type: 'snapshot' }>['viewer'];
type Command = Extract<ClientMessage, { type: 'command' | 'concede' }>;
export type CrossfireConnectionState = {
  chat: ChatMessage[];
  chatReady: boolean;
  chatPending: boolean;
  chatError: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'resyncing' | 'stopped';
  view: GameView | null;
  viewer: Viewer | null;
  pending: boolean;
  notice: string | null;
  unavailableReason: 'incompatible' | 'closed' | null;
  showRevealedHands: boolean;
  replay: ReplayPosition | null;
  perspective: 'own' | 'public';
  liveProgress: number;
  undo: UndoPending | null;
  controlPending: boolean;
  bookmark: Bookmark | null;
  bookmarkPending: boolean;
  practice: { id: string; lobbyId: string } | null;
  practicePending: boolean;
};
type Socket = Pick<WebSocket, 'onopen' | 'onmessage' | 'onclose' | 'onerror' | 'send' | 'close'>;
export type ConnectionDependencies = {
  ticket: (signal: AbortSignal) => Promise<{ ticket: string; gameId: string }>;
  socket: (gameId: string) => Socket;
  schedule?: (callback: () => void, ms: number) => () => void;
  commandId?: () => string;
};
const initial = (): CrossfireConnectionState => ({
  chat: [],
  chatReady: false,
  chatPending: false,
  chatError: null,
  status: 'idle',
  view: null,
  viewer: null,
  pending: false,
  notice: null,
  unavailableReason: null,
  showRevealedHands: true,
  replay: null,
  perspective: 'own',
  liveProgress: 0,
  undo: null,
  controlPending: false,
  bookmark: null,
  bookmarkPending: false,
  practice: null,
  practicePending: false,
});
const denied: Record<number, string> = {
  4400: 'The game connection could not be understood. Refresh this page.',
  4401: 'Sign in again to reconnect to this game.',
  4403: 'You no longer have access to this game.',
  4409: 'This seat is open in another tab or device.',
};

/** One instance per mounted game/session. No tickets, hands, pending intent or
 * viewer handles are stored in Query, browser storage, URLs or telemetry. */
export class CrossfireConnection {
  readonly store = new Store<CrossfireConnectionState>(initial());
  readonly #schedule: NonNullable<ConnectionDependencies['schedule']>;
  #socket?: Socket;
  #abort?: AbortController;
  #cancelTimer?: () => void;
  #cancelBookmark?: () => void;
  #cancelChat?: () => void;
  #chatPending?: Extract<ClientMessage, { type: 'chat-send' }>;
  #pending?: Command;
  #generation = 0;
  #attempts = 0;
  #running = false;
  #serverView?: GameView;
  #seekId?: string;
  #resume?: { position: string; branch?: string };
  #replayContext = '';
  #buffer = new Map<string, { view: GameView; position: ReplayPosition; viewer: Viewer }>();
  constructor(
    readonly gameId: string,
    readonly role: 'player' | 'spectator',
    private readonly dependencies: ConnectionDependencies,
    private readonly options: { replay?: boolean; position?: string; branch?: string } = {},
  ) {
    this.#schedule =
      dependencies.schedule ??
      ((callback, ms) => {
        const timer = setTimeout(callback, ms);
        return () => clearTimeout(timer);
      });
  }
  #patch(patch: Partial<CrossfireConnectionState>) {
    this.store.setState(state => ({ ...state, ...patch }));
  }
  #detach() {
    this.#generation++;
    this.#cancelChat?.();
    this.#cancelChat = undefined;
    this.#patch({ chat: [], chatReady: false });
    this.#cancelBookmark?.();
    this.#cancelBookmark = undefined;
    this.#serverView = undefined;
    this.#seekId = undefined;
    this.#buffer.clear();
    this.#replayContext = '';
    this.#cancelTimer?.();
    this.#cancelTimer = undefined;
    this.#abort?.abort();
    this.#abort = undefined;
    if (this.#socket) {
      const socket = this.#socket;
      this.#socket = undefined;
      socket.onopen = socket.onmessage = socket.onclose = socket.onerror = null;
      socket.close();
    }
  }
  start() {
    if (this.#running) return;
    this.#running = true;
    this.#attempts = 0;
    void this.#connect();
  }
  stop() {
    this.#running = false;
    this.#detach();
    this.#pending = undefined;
    this.#chatPending = undefined;
    this.store.setState(() => initial());
  }
  reconnect() {
    this.#running = true;
    this.#attempts = 0;
    void this.#connect();
  }
  #halt(notice: string, keepPending = false) {
    this.#running = false;
    this.#detach();
    if (!keepPending) this.#pending = undefined;
    this.#chatPending = undefined;
    this.#patch({
      chat: [],
      chatReady: false,
      chatPending: false,
      status: 'stopped',
      notice,
      view: null,
      viewer: null,
      replay: null,
      undo: null,
      controlPending: false,
      pending: !!this.#pending,
    });
  }
  #retry() {
    this.#detach();
    if (!this.#running) return;
    if (++this.#attempts > 5) {
      this.#halt('Connection interrupted. Reconnect when you are ready.', true);
      return;
    }
    this.#patch({
      status: 'reconnecting',
      view: null,
      viewer: null,
      notice: 'Reconnecting to your game…',
    });
    this.#cancelTimer = this.#schedule(
      () => {
        void this.#connect();
      },
      Math.min(1000 * 2 ** (this.#attempts - 1), 10_000),
    );
  }
  #timeout() {
    this.#cancelTimer?.();
    this.#cancelTimer = this.#schedule(() => this.#retry(), 10_000);
  }
  async #connect() {
    if (this.options.replay)
      this.#resume =
        this.store.state.replay ??
        (this.options.position
          ? { position: this.options.position, branch: this.options.branch }
          : undefined);
    this.#detach();
    if (!this.#running) return;
    const generation = this.#generation;
    const current = () => this.#running && generation === this.#generation;
    this.#patch({
      status: 'connecting',
      unavailableReason: null,
      view: null,
      viewer: null,
      notice: null,
      bookmarkPending: false,
      practicePending: false,
    });
    this.#abort = new AbortController();
    this.#timeout();
    try {
      const ticket = await this.dependencies.ticket(this.#abort.signal);
      if (!current()) return;
      if (ticket.gameId !== this.gameId || !/^[A-Za-z0-9_-]{43}$/.test(ticket.ticket)) {
        this.#halt('The game invitation has changed. Open it again.');
        return;
      }
      const socket = this.dependencies.socket(this.gameId);
      this.#socket = socket;
      socket.onopen = () => {
        if (current())
          this.#send({
            type: 'authenticate',
            wireVersion: 1,
            ticket: ticket.ticket,
            showRevealedHands: this.store.state.showRevealedHands,
          });
      };
      socket.onmessage = event => {
        if (current()) this.#receive(event.data);
      };
      socket.onclose = event => {
        if (!current()) return;
        if (denied[event.code]) this.#halt(denied[event.code]!);
        else this.#retry();
      };
      socket.onerror = () => {
        /* close or the watchdog handles browser network failures */
      };
    } catch (error) {
      if (!current()) return;
      const status = (error as { status?: number } | null)?.status;
      const reason = error instanceof Error ? error.message : '';
      if (
        (status === 409 && reason === 'incompatible') ||
        (status === 403 && reason === 'closed')
      ) {
        this.#halt(
          reason === 'incompatible'
            ? 'This game uses an older Crossfire version and cannot be resumed.'
            : 'This game has been closed. Its saved data has been kept.',
        );
        this.#patch({ unavailableReason: reason as 'incompatible' | 'closed' });
        return;
      }
      if (status && [400, 401, 403, 404, 409, 422].includes(status))
        this.#halt(
          status === 401 ? denied[4401]! : 'This game is no longer available to this session.',
        );
      else this.#retry();
    }
  }
  #send(message: ClientMessage) {
    if (!this.#socket) return false;
    try {
      this.#socket.send(JSON.stringify(clientMessageSchema.parse(message)));
      return true;
    } catch {
      this.#retry();
      return false;
    }
  }
  #receive(raw: unknown) {
    let message: ServerMessage;
    try {
      if (typeof raw !== 'string' || raw.length > 1024 * 1024) throw new Error();
      message = serverMessageSchema.parse(JSON.parse(raw));
    } catch {
      this.#halt('The game update could not be understood. Refresh this page.');
      return;
    }
    if (message.type === 'chat') {
      if (message.gameId !== this.gameId || this.role !== 'player' || this.options.replay) {
        this.#halt('Chat does not match your game access.');
        return;
      }
      const messages = new Map((message.replace ? [] : this.store.state.chat).map(m => [m.id, m]));
      for (const entry of message.messages) messages.set(entry.id, entry);
      const chat = [...messages.values()].sort((a, b) => a.sequence - b.sequence).slice(-100);
      if (this.#chatPending && chat.some(m => m.id === this.#chatPending!.id)) {
        this.#chatPending = undefined;
        this.#cancelChat?.();
        this.#cancelChat = undefined;
        this.#attempts = 0;
      }
      this.#patch({ chat, chatReady: true, chatPending: !!this.#chatPending, chatError: null });
      if (message.replace && this.#chatPending) this.#sendChatPending();
      return;
    }
    if (message.type === 'chat-error') {
      if (message.id !== this.#chatPending?.id) return;
      this.#chatPending = undefined;
      this.#cancelChat?.();
      this.#cancelChat = undefined;
      this.#patch({
        chatPending: false,
        chatError:
          message.code === 'rate-limited'
            ? 'Please wait a few seconds before sending again.'
            : message.code === 'chat-full'
              ? 'This game has reached its chat limit.'
              : 'That message could not be sent.',
      });
      return;
    }
    if (message.type === 'practice-created') {
      this.#patch({
        practice: { id: message.id, lobbyId: message.lobbyId },
        practicePending: false,
      });
      this.#cancelBookmark?.();
      this.#cancelBookmark = undefined;
      return;
    }
    if (message.type === 'bookmark-saved') {
      this.#cancelBookmark?.();
      this.#cancelBookmark = undefined;
      this.#patch({ bookmark: message.bookmark, bookmarkPending: false });
      return;
    }
    if (message.type === 'undo-state' && !this.options.replay) {
      this.#patch({ undo: message.pending, controlPending: false });
      if (!this.#pending && this.store.state.status === 'connected') {
        this.#cancelTimer?.();
        this.#cancelTimer = undefined;
      }
      return;
    }
    if (message.type === 'replay' && this.options.replay) {
      this.#receiveReplay(message);
      return;
    }
    if (message.type === 'replay-live' && this.options.replay) {
      this.#patch({ liveProgress: this.store.state.liveProgress + 1 });
      return;
    }
    if (message.type === 'snapshot' && !this.options.replay) {
      if (message.view.gameId !== this.gameId || message.viewer.role !== this.role) {
        this.#halt('The game update does not match this seat. Refresh this page.');
        return;
      }
      this.#cancelTimer?.();
      this.#cancelTimer = undefined;
      this.#patch({
        status: 'connected',
        view: message.view,
        viewer: message.viewer,
        notice: null,
      });
      if (this.#pending && this.#send(this.#pending)) this.#timeout();
    } else if (message.type === 'delta' && !this.options.replay) {
      if (this.store.state.status === 'resyncing') return;
      try {
        if (!this.store.state.view) throw new Error();
        this.#patch({ view: applyViewDelta(this.store.state.view, message.delta) });
      } catch {
        this.resync();
      }
    } else if (message.type === 'ack') {
      if (message.commandId !== this.#pending?.commandId) return;
      this.#pending = undefined;
      this.#cancelTimer?.();
      this.#cancelTimer = undefined;
      this.#attempts = 0;
      this.#patch({ pending: false, notice: null });
    } else if (message.type === 'error') {
      this.#cancelBookmark?.();
      this.#cancelBookmark = undefined;
      this.#patch({ bookmarkPending: false, practicePending: false });
      if (this.options.replay) {
        this.#seekId = undefined;
        this.#cancelTimer?.();
        this.#cancelTimer = undefined;
        this.#patch({
          pending: false,
          notice:
            message.code === 'busy'
              ? 'Replay is busy. Try that position again.'
              : 'This replay position is unavailable.',
        });
        return;
      }
      if (message.commandId && message.commandId !== this.#pending?.commandId) return;
      this.#pending = undefined;
      this.#patch({ pending: false, controlPending: false });
      this.resync();
      this.#patch({
        notice:
          message.code === 'undo-pending'
            ? 'Gameplay is paused for the undo request.'
            : message.code === 'busy'
              ? 'The game is busy. Choose your action again.'
              : 'The position changed. Choose your action again.',
      });
    } else {
      this.#halt('The game update does not match this connection. Refresh this page.');
    }
  }
  #receiveReplay(message: Extract<ServerMessage, { type: 'replay' }>) {
    if (message.viewer.role === 'player' && this.role !== 'player') {
      this.#halt('This replay does not match your access.');
      return;
    }
    let view: GameView;
    try {
      if (message.update.type === 'snapshot') view = message.update.view;
      else {
        if (!this.#serverView) throw new Error('Missing replay snapshot');
        view = message.update.delta
          ? applyViewDelta(this.#serverView, message.update.delta)
          : this.#serverView;
      }
      if (view.gameId !== this.gameId) throw new Error('Wrong replay');
    } catch {
      this.resync();
      return;
    }
    // Consume transport progress even when an obsolete request must not be displayed.
    this.#serverView = view;
    const context = JSON.stringify([view.epoch, message.position.branch, message.perspective]);
    if (context !== this.#replayContext) {
      this.#buffer.clear();
      this.#replayContext = context;
    }
    const key = JSON.stringify([message.position.position, context]);
    this.#buffer.delete(key);
    this.#buffer.set(key, { view, position: message.position, viewer: message.viewer });
    while (this.#buffer.size > 12) this.#buffer.delete(this.#buffer.keys().next().value!);
    if (message.requestId && message.requestId !== this.#seekId) return;
    this.#seekId = undefined;
    this.#cancelTimer?.();
    this.#cancelTimer = undefined;
    this.#attempts = 0;
    this.#patch({
      status: 'connected',
      pending: false,
      view,
      viewer: message.viewer,
      replay: message.position,
      perspective: message.perspective,
      notice: null,
    });
    if (this.#resume) {
      const resume = this.#resume;
      this.#resume = undefined;
      if (
        resume.position !== message.position.position ||
        resume.branch !== message.position.branch
      )
        this.seek({ kind: 'position', position: resume.position, branch: resume.branch });
    }
  }
  seek(request: ReplaySeek, perspective = this.store.state.perspective) {
    if (!this.options.replay || !this.#running || this.store.state.status !== 'connected')
      return false;
    const position = this.store.state.replay;
    if (request.kind === 'step' && position) {
      const target =
        request.offset === -5
          ? position.steps.backFive
          : request.offset === -1
            ? position.steps.previous
            : request.offset === 1
              ? position.steps.next
              : position.steps.forwardFive;
      if (!target) return false;
      request = { kind: 'position', position: target, branch: position.branch };
    }
    const requestId = (this.dependencies.commandId ?? (() => crypto.randomUUID()))();
    this.#seekId = requestId;
    this.#patch({ pending: true, notice: null });
    if (request.kind === 'position' && perspective === this.store.state.perspective) {
      const cached = this.#buffer.get(JSON.stringify([request.position, this.#replayContext]));
      if (cached && (!request.branch || cached.position.branch === request.branch))
        this.#patch({ view: cached.view, replay: cached.position, viewer: cached.viewer });
    }
    if (this.#send({ type: 'replay-seek', requestId, seek: request, perspective })) this.#timeout();
    return true;
  }
  resync() {
    if (!this.#socket || !this.#running) return;
    this.#patch({ status: 'resyncing', view: null });
    if (this.#send({ type: 'resync' })) this.#timeout();
  }
  concede() {
    const { view, status, viewer } = this.store.state;
    if (
      status !== 'connected' ||
      viewer?.role !== 'player' ||
      this.options.replay ||
      !view ||
      view.result ||
      this.#pending
    )
      return;
    this.#pending = {
      type: 'concede',
      commandId: this.dependencies.commandId?.() ?? crypto.randomUUID(),
    };
    this.#patch({ pending: true, notice: null });
    if (this.#send(this.#pending)) this.#timeout();
  }
  showHands(showRevealedHands: boolean) {
    if (this.store.state.status !== 'connected' || this.#pending) return;
    this.#patch({ showRevealedHands, status: 'resyncing', view: null });
    if (this.#send({ type: 'preferences', showRevealedHands })) this.#timeout();
  }
  acceptPractice(id: string) {
    if (
      !this.options.replay ||
      this.role !== 'player' ||
      this.store.state.status !== 'connected' ||
      this.store.state.practicePending ||
      this.store.state.bookmarkPending
    )
      return;
    this.#patch({ practicePending: true });
    if (this.#send({ type: 'practice-accept', id }))
      this.#cancelBookmark = this.#schedule(
        () =>
          this.#patch({
            practicePending: false,
            notice: 'No practice confirmation received. Check your invitations before retrying.',
          }),
        10_000,
      );
  }
  sendChat(text: string) {
    const parsed = chatTextSchema.safeParse(text);
    if (
      !parsed.success ||
      this.options.replay ||
      this.role !== 'player' ||
      this.store.state.status !== 'connected' ||
      !this.store.state.chatReady ||
      this.#chatPending
    )
      return false;
    this.#chatPending = {
      type: 'chat-send',
      id: this.dependencies.commandId?.() ?? crypto.randomUUID(),
      text: parsed.data,
    };
    this.#patch({ chatPending: true, chatError: null });
    return this.#sendChatPending();
  }
  #sendChatPending() {
    if (!this.#chatPending) return false;
    const sent = this.#send(this.#chatPending);
    if (sent) {
      this.#cancelChat?.();
      this.#cancelChat = this.#schedule(() => this.#retry(), 10_000);
    }
    return sent;
  }
  saveBookmark(id: string, label: string, report?: string) {
    const { view, status, pending, bookmarkPending } = this.store.state;
    if (
      !view ||
      status !== 'connected' ||
      pending ||
      bookmarkPending ||
      this.store.state.practicePending
    )
      return false;
    this.#patch({ bookmarkPending: true });
    const sent = this.#send({
      type: 'bookmark',
      ...(report === undefined ? {} : { report }),
      id,
      label,
      epoch: view.epoch,
      revision: view.revision,
    });
    if (sent)
      this.#cancelBookmark = this.#schedule(
        () =>
          this.#patch({
            bookmarkPending: false,
            notice: 'No bookmark confirmation received. Check your bookmarks before retrying.',
          }),
        10_000,
      );
    return sent;
  }
  undo(action: 'request' | 'approve' | 'decline' | 'cancel') {
    const { view, undo, status, controlPending } = this.store.state;
    if (
      this.options.replay ||
      this.role !== 'player' ||
      status !== 'connected' ||
      !view ||
      controlPending ||
      this.#pending
    )
      return;
    const message: ClientMessage =
      action === 'request'
        ? {
            type: 'undo',
            action,
            id: crypto.randomUUID(),
            epoch: view.epoch,
            revision: view.revision,
          }
        : { type: 'undo', action, id: undo?.id ?? '' };
    if (action !== 'request' && !undo) return;
    this.#patch({ controlPending: true });
    if (this.#send(message)) this.#timeout();
  }
  choose(
    optionId: string,
    selections: string[] = [],
    namedCardId?: string,
    chosenNumber?: number,
  ): boolean {
    const { view, status } = this.store.state;
    if (
      this.options.replay ||
      !!this.store.state.undo ||
      this.store.state.controlPending ||
      this.role !== 'player' ||
      status !== 'connected' ||
      this.#pending ||
      !view?.decision ||
      !view.decision.options.some(option => option.id === optionId)
    )
      return false;
    const declining =
      ['allocate-damage', 'disclose'].includes(view.decision.effect ?? '') &&
      view.decision.options.find(option => option.id === optionId)?.kind === 'decline-effect';
    if (view.decision.effect === 'name-card' ? !namedCardId : namedCardId !== undefined)
      return false;
    if (
      view.decision.effect === 'choose-number'
        ? !Number.isSafeInteger(chosenNumber) || chosenNumber! < 0
        : chosenNumber !== undefined
    )
      return false;
    const selection = declining ? null : view.decision.selection;
    if (
      !disclosureComplete(selection?.disclose, selections) ||
      (!selection?.allocation && new Set(selections).size !== selections.length) ||
      (selection?.allocation &&
        selections.some(
          id =>
            selections.filter(card => card === id).length >
              (selection.allocation!.limits[id] ?? 0) ||
            selections.filter(card => card === id).length % (selection.allocation!.quantum ?? 1) !==
              0,
        )) ||
      (selection
        ? selections.length < selection.min ||
          selections.length > selection.max ||
          selections.some(id => !selection.cards.includes(id))
        : selections.length > 0)
    )
      return false;
    this.#pending = {
      type: 'command',
      commandId: (this.dependencies.commandId ?? (() => crypto.randomUUID()))(),
      command: {
        gameId: view.gameId,
        epoch: view.epoch,
        expectedRevision: view.revision,
        decisionId: view.decision.id,
        optionId,
        selections: [...selections],
        ...(namedCardId !== undefined ? { namedCardId } : {}),
        ...(chosenNumber !== undefined ? { chosenNumber } : {}),
      },
    };
    this.#patch({ pending: true, notice: null });
    if (this.#send(this.#pending)) this.#timeout();
    return true;
  }
}
