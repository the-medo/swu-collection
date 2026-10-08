import { creditsService } from '../lib/credits/service.ts';
import { reconcilePatreonAccount } from '../lib/patreon/account.ts';

function logStartingCreditFailure(error: unknown) {
  // Database exceptions can include query parameters. Log bounded codes only.
  const candidate = error as { code?: unknown; cause?: { code?: unknown } } | null;
  const code = candidate?.cause?.code ?? candidate?.code;
  console.error('[credits] starting grant failed; a later session refresh or sign-in will retry', {
    databaseCode: typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined,
  });
}

export function createUserCreditHooks({
  grant = creditsService.grantStartingCredits,
  reconcile = reconcilePatreonAccount,
  onFailure = logStartingCreditFailure,
} = {}) {
  async function ensureStartingCredits(userId: string) {
    try {
      await grant(userId);
    } catch (error) {
      onFailure(error);
    }
  }
  return {
    async created(account: { id: string }) {
      await ensureStartingCredits(account.id);
      await reconcile(account);
    },
    async sessionChanged(session: { userId: string } | null) {
      // Session creation and routine refresh repair failed creation grants and
      // registrations during deployment, including continuously active users.
      if (session) await ensureStartingCredits(session.userId);
    },
  };
}

export const userCreditHooks = createUserCreditHooks();
