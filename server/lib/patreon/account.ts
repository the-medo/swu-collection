import { patreonCredits } from './credits.ts';
import { patreonConfigured } from './config.ts';
import { logPatreonFailure } from './log.ts';

// Local reconciliation only: never call Patreon or prevent login because an
// optional integration is unavailable. A manual sync can retry failed matches.
export async function reconcilePatreonAccount(account: { id: string }) {
  if (!patreonConfigured()) return;
  try {
    await patreonCredits.reconcileUser(account.id);
  } catch (error) {
    logPatreonFailure('account', error);
  }
}
