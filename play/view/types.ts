export { disclosureComplete } from './disclosure.ts';
// This entrypoint is browser-safe and must not import engine state or behavior.
export { applyViewDelta, diffViews } from './delta.ts';
export type { ViewDelta } from './delta.ts';
export { clientMessageSchema, viewCommandSchema, WIRE_VERSION } from './wire.ts';
export type { ClientMessage, ServerMessage } from './wire.ts';
export type { ReplayPosition, ReplaySeek } from './replay.ts';
export { gameViewSchema, serverMessageSchema } from './parse.ts';
import { PROTOCOL_VERSION } from './version.ts';
export { PROTOCOL_VERSION } from './version.ts';
export type VisibleCard = {
  id: string;
  face: {
    cardId: string;
    name: string;
    side: 'front' | 'back';
    printedKind: 'unit' | 'leader' | 'base' | 'upgrade' | 'event' | 'player-token';
    kind: 'base' | 'leader' | 'unit' | 'upgrade' | 'event' | 'player-token';
    token: boolean;
    traits: string[];
    leaderUnit: boolean;
    sentinel?: boolean;
    notes?: string[];
    warnings?: string[];
    power: number | null;
    hp: number | null;
  } | null;
  owner: string;
  controller: string;
  zone: 'base' | 'ground' | 'space' | 'hand' | 'resources' | 'discard' | 'captured';
  exhausted: boolean;
  damage: number;
  deployedAs: 'unit' | 'upgrade' | null;
  capturedBy: string | null;
  attachedTo: string | null;
  abilityUses: Record<string, number>;
  /** Printed leader/base game limits, including deployment after a face change.
   * Usage does not imply that an unused action is currently legal. */
  limitedActions: { id: string; max: number; used: number; deployment: boolean }[];
};
export type VisibleReference = {
  cardId: string;
  name: string;
  currentCardId: string | null;
  side?: 'front' | 'back';
};
export type VisibleEvent = {
  /** Counts only public facts; private commands cannot advance this counter. */
  order?: number;
  mode?: string;
  namedCard?: string;
  id: string;
  type: string;
  actor: string | null;
  amount: number | null;
  cards: VisibleReference[];
};
export type VisibleDecision = {
  presentation?: { title: string; text: string };
  resourcePlan?: { confirmed: boolean; cards: string[] } | null;
  inspectedCards: { id: string; face: NonNullable<VisibleCard['face']> }[];
  id: string;
  source: VisibleReference | null;
  effect: string | null;
  kind:
    | 'initiative'
    | 'mulligan'
    | 'resource'
    | 'action'
    | 'trigger-player'
    | 'trigger'
    | 'effect'
    | 'unique'
    | 'replacement'
    | 'search'
    | 'delayed-player'
    | 'delayed';
  options: {
    id: string;
    kind: string;
    cards: string[];
    playerId: string | null;
    piloting: string | null;
    plot?: { cost: number; useOtherResources: boolean };
    exploit: { maxUnits: number; costBeforeExploit: number } | null;
    smuggle: { cost: number; grantedBy: VisibleReference | null } | null;
    mode: string | null;
    delayed: { source: VisibleReference; target: VisibleReference | null } | null;
    tokenCardId: string | null;
    takeMulligan: boolean | null;
    action: {
      grantedBy: VisibleReference | null;
      id: string;
      limit: 'once-per-game' | 'once-per-round' | { per: 'game'; max: number } | null;
      deploymentAvailable: boolean;
      deploymentOnly?: boolean;
    } | null;
    ability: {
      id: string;
      source: VisibleReference;
      grantedBy: VisibleReference | null;
      timing?: string;
      index?: number;
    } | null;
  }[];
  selection: {
    cards: string[];
    min: number;
    max: number;
    budget?: {
      stat?: 'power' | 'cost' | 'remaining-hp';
      max: number;
      costs: Record<string, number>;
    };
    allocation?: { limits: Record<string, number>; quantum?: number };
    disclose?: { required: string[]; icons: Record<string, string[]> };
  } | null;
};
export type GameView = {
  privateDeckTop: { id: string; face: NonNullable<VisibleCard['face']> } | null;
  protocolVersion: typeof PROTOCOL_VERSION;
  gameId: string;
  epoch: string;
  revision: number;
  phase: 'setup' | 'action' | 'regroup' | 'ended';
  round: number;
  activePlayer: string;
  initiative: { holder: string; claimed: boolean };
  result: { winner: string | null; reason: 'base-defeat' | 'concession' | 'card-effect' } | null;
  players: { id: string; deckCount: number; handCount: number }[];
  cards: VisibleCard[];
  scheduled: {
    id: string;
    kind:
      | 'defeat-at-regroup'
      | 'bottom-at-regroup'
      | 'return-at-regroup'
      | 'rescue-at-regroup'
      | 'victory-at-regroup'
      | 'resources-at-regroup'
      | 'resources-at-action'
      | 'effects-at-action'
      | 'control-at-regroup'
      | 'control-on-departure';
    round: number;
    source: VisibleReference;
    target: VisibleReference | null;
    arena?: 'ground' | 'space';
    amount?: number;
  }[];
  events: VisibleEvent[];
  decision: VisibleDecision | null;
};
export type ViewCommand = {
  gameId: string;
  epoch: string;
  expectedRevision: number;
  decisionId: string;
  optionId: string;
  selections?: string[];
  namedCardId?: string;
  chosenNumber?: number;
};
