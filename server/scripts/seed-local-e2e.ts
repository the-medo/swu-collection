import { and, eq, inArray } from 'drizzle-orm';
import { auth } from '../auth/auth.ts';
import { db } from '../db';
import { user as userTable } from '../db/schema/auth-schema.ts';
import { deckBranch } from '../db/schema/deck_branch.ts';
import { deckChangeRequest } from '../db/schema/deck_change_request.ts';
import { deckChangeRequestEvent } from '../db/schema/deck_change_request_event.ts';
import { deck } from '../db/schema/deck.ts';
import { deckCard } from '../db/schema/deck_card.ts';
import { deckInformation } from '../db/schema/deck_information.ts';
import { team } from '../db/schema/team.ts';
import { teamDeck } from '../db/schema/team_deck.ts';
import { teamMember } from '../db/schema/team_member.ts';
import { getDeckSnapshot } from '../lib/decks/deckBranchSnapshot.ts';
import { updateDeckInformation } from '../lib/decks/updateDeckInformation.ts';

const testPassword = 'local-test-password';
const teamShortcut = 'codex-test-team';
const seedDeckName = 'Codex Data Vault Review Seed Deck';
const seedBranchDeckName = 'Data Vault Branch: 60 Card Review';
const oldSeedDeckNames = ['Codex Branch Review Seed Deck', seedDeckName, seedBranchDeckName];

const testUsers = [
  {
    email: 'owner@swubase.local',
    password: testPassword,
    name: 'Test Owner',
    displayName: 'test-owner',
  },
  {
    email: 'member@swubase.local',
    password: testPassword,
    name: 'Test Member',
    displayName: 'test-member',
  },
];

const baseCards = [
  { cardId: 'viper-probe-droid', board: 1, quantity: 3, note: 'Main: remove in branch' },
  { cardId: 'superlaser-technician', board: 1, quantity: 3, note: 'Main: ramp package' },
  { cardId: 'force-choke', board: 1, quantity: 3, note: 'Main: removal suite' },
  { cardId: 'overwhelming-barrage', board: 1, quantity: 3, note: 'Main: event top end' },
  { cardId: 'death-star-stormtrooper', board: 1, quantity: 3, note: 'Main: early board' },
  { cardId: 'cell-block-guard', board: 1, quantity: 3, note: 'Main: ground sentinel' },
  { cardId: 'emperor-palpatine--master-of-the-dark-side', board: 1, quantity: 3, note: 'Main: late value' },
  { cardId: 'rukh--thrawn-s-assassin', board: 1, quantity: 3, note: 'Main: pressure unit' },
  { cardId: 'academy-defense-walker', board: 1, quantity: 3, note: 'Main: stabilize' },
  { cardId: 'seasoned-shoretrooper', board: 1, quantity: 3, note: 'Main: efficient unit' },
  { cardId: 'devastator--inescapable', board: 1, quantity: 3, note: 'Main: closer' },
  { cardId: 'avenger--hunting-star-destroyer', board: 1, quantity: 3, note: 'Main: space finisher' },
  { cardId: 'resupply', board: 1, quantity: 3, note: 'Main: resource plan' },
  { cardId: 'command', board: 1, quantity: 3, note: 'Main: command event' },
  { cardId: 'strike-true', board: 1, quantity: 3, note: 'Main: combat trick' },
  { cardId: 'surprise-strike', board: 1, quantity: 3, note: 'Main: burst damage' },
  { cardId: 'entrenched', board: 1, quantity: 3, note: 'Main: protection' },
  { cardId: 'superlaser-blast', board: 1, quantity: 3, note: 'Main: reset button' },
  { cardId: 'scout-bike-pursuer', board: 1, quantity: 3, note: 'Main: aggression test' },
  { cardId: 'pyke-sentinel', board: 1, quantity: 3, note: 'Main: underworld body' },
  { cardId: 'confiscate', board: 2, quantity: 2, note: 'Sideboard: anti-upgrade' },
  { cardId: 'vanquish', board: 2, quantity: 2, note: 'Sideboard: remove in branch' },
  { cardId: 'power-of-the-dark-side', board: 2, quantity: 2, note: 'Sideboard: control mirror' },
  { cardId: 'takedown', board: 2, quantity: 2, note: 'Sideboard: unit answers' },
  { cardId: 'no-good-to-me-dead', board: 2, quantity: 2, note: 'Sideboard: exhaust package' },
  { cardId: 'bazine-netal--spy-for-the-first-order', board: 3, quantity: 1, note: 'Maybe: change quantity' },
  { cardId: 'swoop-racer', board: 3, quantity: 2, note: 'Maybe: early pressure' },
  { cardId: 'mercenary-company', board: 3, quantity: 2, note: 'Maybe: remove in branch' },
  { cardId: 'cartel-spacer', board: 3, quantity: 1, note: 'Maybe: space option' },
  { cardId: 'privateer-crew', board: 3, quantity: 1, note: 'Maybe: top-end option' },
];

const branchCards = [
  ...baseCards.filter(
    card =>
      !(
        (card.board === 1 && card.cardId === 'viper-probe-droid') ||
        (card.board === 2 && card.cardId === 'vanquish') ||
        (card.board === 3 && card.cardId === 'mercenary-company')
      ),
  ),
]
  .map(card => {
    if (card.board === 1 && card.cardId === 'superlaser-technician') {
      return { ...card, quantity: 2, note: 'Main: trimmed ramp after testing' };
    }
    if (card.board === 1 && card.cardId === 'force-choke') {
      return { ...card, note: 'Main: removal suite, keep all three' };
    }
    if (card.board === 2 && card.cardId === 'confiscate') {
      return { ...card, quantity: 1, note: 'Sideboard: one copy after upgrade meta cooled' };
    }
    if (card.board === 2 && card.cardId === 'power-of-the-dark-side') {
      return { ...card, note: 'Sideboard: preferred control mirror answer' };
    }
    if (card.board === 3 && card.cardId === 'bazine-netal--spy-for-the-first-order') {
      return { ...card, quantity: 2, note: 'Maybe: test second copy for hand pressure' };
    }
    if (card.board === 3 && card.cardId === 'swoop-racer') {
      return { ...card, note: 'Maybe: still watching aggro performance' };
    }
    return card;
  })
  .concat([
    { cardId: 'battlefield-marine', board: 1, quantity: 2, note: 'Main add: cheaper ground pressure' },
    { cardId: 'at-st', board: 1, quantity: 2, note: 'Main add: replaces probe droids at top end' },
    { cardId: 'waylay', board: 2, quantity: 2, note: 'Sideboard add: tempo answer' },
    { cardId: 'relentless-pursuit', board: 2, quantity: 1, note: 'Sideboard add: closing reach' },
    { cardId: 'outer-rim-headhunter', board: 3, quantity: 1, note: 'Maybe add: space curve test' },
    { cardId: 'ruthless-raider', board: 3, quantity: 1, note: 'Maybe add: threat density test' },
  ]);

async function ensureTestUsers() {
  for (const testUser of testUsers) {
    try {
      await auth.api.signUpEmail({ body: testUser });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!message.toLowerCase().includes('already')) {
        console.warn(`Skipping sign-up for ${testUser.email}: ${message}`);
      }
    }
  }

  const users = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, testUsers[0].email));
  const members = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, testUsers[1].email));

  const owner = users[0];
  const member = members[0];

  if (!owner || !member) {
    throw new Error('Local test users were not created correctly.');
  }

  return { owner, member };
}

async function ensureTeam(ownerId: string, memberId: string) {
  const [existingTeam] = await db.select().from(team).where(eq(team.shortcut, teamShortcut)).limit(1);

  const [seedTeam] = existingTeam
    ? await db
        .update(team)
        .set({
          name: 'Codex E2E Test Team',
          description: 'Local seeded team for deck branching and change-request testing.',
          privacy: 'private',
          autoAddDeck: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(team.id, existingTeam.id))
        .returning()
    : await db
        .insert(team)
        .values({
          name: 'Codex E2E Test Team',
          shortcut: teamShortcut,
          description: 'Local seeded team for deck branching and change-request testing.',
          privacy: 'private',
          autoAddDeck: false,
        })
        .returning();

  await db
    .insert(teamMember)
    .values([
      { teamId: seedTeam.id, userId: ownerId, role: 'owner', autoAddDeck: false },
      { teamId: seedTeam.id, userId: memberId, role: 'member', autoAddDeck: false },
    ])
    .onConflictDoUpdate({
      target: [teamMember.teamId, teamMember.userId],
      set: {
        autoAddDeck: false,
      },
    });

  await db
    .update(teamMember)
    .set({ role: 'owner' })
    .where(and(eq(teamMember.teamId, seedTeam.id), eq(teamMember.userId, ownerId)));
  await db
    .update(teamMember)
    .set({ role: 'member' })
    .where(and(eq(teamMember.teamId, seedTeam.id), eq(teamMember.userId, memberId)));

  return seedTeam;
}

async function clearSeedDecks(teamId: string, ownerId: string, memberId: string) {
  const existingBranches = await db
    .select({ branchDeckId: deckBranch.branchDeckId })
    .from(deckBranch)
    .where(eq(deckBranch.teamId, teamId));
  const branchDeckIds = existingBranches.map(branch => branch.branchDeckId);

  await db.delete(deckChangeRequest).where(eq(deckChangeRequest.teamId, teamId));
  await db.delete(deckBranch).where(eq(deckBranch.teamId, teamId));

  const oldDecks = await db
    .select({ id: deck.id })
    .from(deck)
    .where(and(inArray(deck.name, oldSeedDeckNames), inArray(deck.userId, [ownerId, memberId])));
  const deckIds = [...new Set([...oldDecks.map(row => row.id), ...branchDeckIds])];

  if (deckIds.length === 0) return;

  await db.delete(deckCard).where(inArray(deckCard.deckId, deckIds));
  await db.delete(deckInformation).where(inArray(deckInformation.deckId, deckIds));
  await db.delete(deck).where(inArray(deck.id, deckIds));
}

async function ensureDeck(ownerId: string, teamId: string) {
  const deckValues = {
    userId: ownerId,
    format: 1,
    name: seedDeckName,
    description:
      'Seeded local Data Vault deck with 60 main cards, 10 sideboard cards, and a maybeboard for branch review testing.',
    leaderCardId1: 'darth-vader--dark-lord-of-the-sith',
    leaderCardId2: null,
    baseCardId: 'data-vault',
    public: 0,
    cardPoolId: null,
    updatedAt: new Date(),
  };

  const [seedDeck] = await db.insert(deck).values(deckValues).returning();

  await db.delete(deckCard).where(eq(deckCard.deckId, seedDeck.id));
  await db.insert(deckCard).values(baseCards.map(card => ({ ...card, deckId: seedDeck.id })));

  await db
    .insert(teamDeck)
    .values({ teamId, deckId: seedDeck.id })
    .onConflictDoNothing({ target: [teamDeck.teamId, teamDeck.deckId] });

  await updateDeckInformation(seedDeck.id);

  return seedDeck;
}

async function ensureChangeRequest(teamId: string, baseDeckId: string, memberId: string, ownerId: string) {
  const baseSnapshot = await getDeckSnapshot(baseDeckId);
  if (!baseSnapshot) {
    throw new Error('Could not snapshot seeded base deck.');
  }

  const [branchDeck] = await db
    .insert(deck)
    .values({
      userId: memberId,
      format: baseSnapshot.deck.format,
      name: seedBranchDeckName,
      description:
        'Branch proposal seeded with add/change/remove examples across main deck, sideboard, and maybeboard.',
      leaderCardId1: 'iden-versio--inferno-squad-commander',
      leaderCardId2: baseSnapshot.deck.leaderCardId2,
      baseCardId: 'energy-conversion-lab',
      public: 2,
      cardPoolId: null,
      updatedAt: new Date(),
    })
    .returning();

  await db.insert(deckCard).values(branchCards.map(card => ({ ...card, deckId: branchDeck.id })));
  await updateDeckInformation(branchDeck.id);

  const [branch] = await db
    .insert(deckBranch)
    .values({
      teamId,
      baseDeckId,
      branchDeckId: branchDeck.id,
      creatorUserId: memberId,
      baseSnapshot,
      status: 'open',
    })
    .returning();

  const [request] = await db
    .insert(deckChangeRequest)
    .values({
      teamId,
      branchId: branch.id,
      baseDeckId,
      branchDeckId: branchDeck.id,
      authorUserId: memberId,
      title: 'Review Data Vault 60-card branch',
      description:
        'Seeded stress case: main deck, sideboard, and maybeboard each include added cards, changed quantities, and removals.',
      status: 'open',
    })
    .returning();

  await db.insert(deckChangeRequestEvent).values([
    {
      changeRequestId: request.id,
      actorUserId: memberId,
      type: 'submitted',
      payload: { seeded: true },
    },
    {
      changeRequestId: request.id,
      actorUserId: ownerId,
      type: 'commented',
      payload: {
        changeKey: 'card:superlaser-technician::1',
        body: 'Please sanity-check the ramp trim against the new Data Vault curve.',
      },
    },
  ]);

  return { branchDeck, request };
}

async function main() {
  if (process.env.ENVIRONMENT !== 'local') {
    throw new Error('Refusing to seed E2E data unless ENVIRONMENT=local.');
  }

  const { owner, member } = await ensureTestUsers();
  const seedTeam = await ensureTeam(owner.id, member.id);
  await clearSeedDecks(seedTeam.id, owner.id, member.id);
  const seedDeck = await ensureDeck(owner.id, seedTeam.id);
  const { branchDeck, request } = await ensureChangeRequest(
    seedTeam.id,
    seedDeck.id,
    member.id,
    owner.id,
  );

  console.log('Local E2E seed ready:');
  console.log(`  Owner:  ${owner.email}`);
  console.log(`  Member: ${member.email}`);
  console.log(`  Team:   http://localhost:5173/teams/${seedTeam.shortcut}`);
  console.log(`  Deck:   http://localhost:5173/decks/${seedDeck.id}`);
  console.log(`  Branch: http://localhost:5173/decks/${branchDeck.id}`);
  console.log(`  Request: ${request.id}`);
}

try {
  await main();
  process.exit(0);
} catch (error) {
  console.error(error);
  process.exit(1);
}
