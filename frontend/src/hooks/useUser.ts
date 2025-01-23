import { useSession } from '@/lib/auth-client.ts';
import { CountryCode, CurrencyCode } from '../../../server/db/lists.ts';

export function useUser() {
  const session = useSession();

  const user = session.data?.user;

  return user
    ? {
        ...user,
        country: user.country as CountryCode | undefined,
        currency: user.currency as CurrencyCode | undefined,
      }
    : null;
}
