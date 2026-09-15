import { listenForCardBundles } from '../../play/storage/card-bundles.ts';
import { CrossfireExits } from '../lib/crossfire/exits.ts';
import { CrossfireInvitationRealtime } from '../lib/crossfire/invitationRealtime.ts';
import { CrossfireDecks } from '../lib/crossfire/decks.ts';
import { CrossfireMatches } from '../lib/crossfire/matches.ts';
import { CrossfirePractice } from '../lib/crossfire/practice.ts';
import { CrossfireBookmarks } from '../lib/crossfire/bookmarks.ts';
import postgres from 'postgres';
import cards from '../db/json/card-list.json';
import { CrossfireLobbies } from '../lib/crossfire/lobbies.ts';
import { CrossfireConnections } from '../lib/crossfire/connections.ts';
import { CrossfireHistory } from '../lib/crossfire/history.ts';
import { createCrossfireRouter } from './crossfire/createRouter.ts';
import { userHasAdminAccess } from '../lib/utils/userHasAdminAccess.ts';

let services:
  | {
      exits: CrossfireExits;
      invitations: CrossfireInvitationRealtime;
      decks: CrossfireDecks;
      lobbies: CrossfireLobbies;
      matches: CrossfireMatches;
      connections: CrossfireConnections;
      history: CrossfireHistory;
      bookmarks: CrossfireBookmarks;
      practice: CrossfirePractice;
    }
  | undefined;
export function getCrossfireServices() {
  if (!services) {
    if (!process.env.DATABASE_URL) throw new Error('Crossfire requires DATABASE_URL');
    // Drizzle changes its client's JSON serializers and date parsers. These
    // private adapters use native postgres semantics on their own bounded pool.
    const sql = postgres(process.env.DATABASE_URL, {
      max: 4,
      idle_timeout: 20,
      connect_timeout: 5,
    });
    void listenForCardBundles(sql, () =>
      console.error('Crossfire card bundle preload failed'),
    ).catch(() => console.error('Crossfire card bundle initialization failed'));
    services = {
      exits: new CrossfireExits(sql),
      invitations: new CrossfireInvitationRealtime(sql),
      decks: new CrossfireDecks(sql, cards),
      lobbies: new CrossfireLobbies(sql, cards),
      matches: new CrossfireMatches(sql, cards),
      history: new CrossfireHistory(sql),
      bookmarks: new CrossfireBookmarks(sql),
      practice: new CrossfirePractice(sql),
      connections: new CrossfireConnections(sql, process.env.BETTER_AUTH_URL!),
    };
  }
  return services;
}
export const crossfireRoute = createCrossfireRouter({
  enabled: process.env.CROSSFIRE_ENABLED === '1',
  origin: process.env.BETTER_AUTH_URL,
  canReviewReports: userHasAdminAccess,
  services: getCrossfireServices,
});
