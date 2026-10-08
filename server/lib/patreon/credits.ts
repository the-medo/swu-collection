import { and, eq, or, sql } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import { patreonMember, userCredits } from '../../db/schema/patreon.ts';
import { normalizedEmail, type MemberSnapshot } from './model.ts';
import { PatreonError } from './config.ts';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Member = typeof patreonMember.$inferSelect;
const memberKey = (campaignId: string, memberId: string) =>
  and(eq(patreonMember.campaignId, campaignId), eq(patreonMember.memberId, memberId));

export function createPatreonCredits(database = db) {
  async function award(tx: Transaction, member: Member) {
    const key = memberKey(member.campaignId, member.memberId);
    async function hold(reason: string | null) {
      await tx.update(patreonMember).set({ reviewReason: reason }).where(key);
      return 0;
    }
    if (member.deletedAt) return 0;
    // Monetary discrepancies require explicit review; a later increase must not
    // silently clear a refund/decrease or reset the awarded high-water mark.
    if (
      ['lifetime_decreased', 'account_removed', 'payment_review', 'invalid_member'].includes(
        member.reviewReason ?? '',
      )
    )
      return 0;
    if (member.lastChargeStatus && /refund|fraud/i.test(member.lastChargeStatus))
      return hold('payment_review');
    if (member.lifetimeCents === null) return hold('missing_amount');
    if (member.lifetimeCents < member.creditedCents) return hold('lifetime_decreased');
    if (!member.email) return hold('email_unavailable');
    if (!member.userId && member.creditedCents > 0) return hold('account_removed');

    const matches = await tx
      .select({ id: user.id, email: user.email, verified: user.emailVerified })
      .from(user)
      .where(
        member.userId
          ? eq(user.id, member.userId)
          : and(eq(user.emailVerified, true), sql`lower(btrim(${user.email})) = ${member.email}`),
      )
      .limit(2)
      .for('share');
    if (matches.length > 1) return hold('ambiguous_email');
    const matched = matches[0];
    if (!matched || !matched.verified || normalizedEmail(matched.email) !== member.email) {
      return hold(member.userId ? 'email_changed' : null);
    }

    const cents = member.lifetimeCents - member.creditedCents;
    const amount = cents * 10;
    if (amount > 0) {
      await tx.insert(userCredits).values({
        userId: matched.id,
        amount,
        currency: 'credits',
        source: 'patreon',
        sourceKey: `patreon:${member.campaignId}:${member.memberId}:${member.lifetimeCents}`,
      });
      await tx.insert(userCredits).values({
        userId: matched.id,
        amount: cents,
        currency: 'beskar',
        source: 'patreon',
        sourceKey: `patreon-beskar:${member.campaignId}:${member.memberId}:${member.lifetimeCents}`,
      });
    }
    await tx
      .update(patreonMember)
      .set({
        userId: matched.id,
        creditedCents: member.lifetimeCents,
        reviewReason: null,
      })
      .where(key);
    return amount;
  }

  return {
    async apply(snapshot: MemberSnapshot, reviewedBy?: string) {
      return database.transaction(async tx => {
        await tx.insert(patreonMember).values(snapshot).onConflictDoNothing();
        const key = memberKey(snapshot.campaignId, snapshot.memberId);
        const [previous] = await tx.select().from(patreonMember).where(key).for('update');
        // Full imports and webhooks can overlap. Ignore a response whose fetch
        // started before an already applied snapshot, including deletion.
        if (previous.observedAt > snapshot.observedAt) {
          if (reviewedBy)
            throw new PatreonError('A newer member update arrived. Recheck the review.', 409);
          return 0;
        }
        const monetaryReview = !!reviewedBy && previous.reviewReason !== 'invalid_member';
        if (
          reviewedBy &&
          !['payment_review', 'lifetime_decreased', 'invalid_member'].includes(
            previous.reviewReason ?? '',
          )
        )
          throw new PatreonError('This member has no hold that can be reviewed.', 409);
        if (
          monetaryReview &&
          (snapshot.lifetimeCents === null ||
            snapshot.lifetimeCents < previous.creditedCents ||
            snapshot.lastChargeStatus !== 'Paid')
        )
          throw new PatreonError(
            'Approval requires a current paid status and support at least as high as the amount already credited. Existing awards are preserved.',
            409,
          );
        const [updated] = await tx
          .update(patreonMember)
          .set({
            ...snapshot,
            deletedAt: null,
            ...(previous.reviewReason === 'invalid_member' ? { reviewReason: null } : {}),
            ...(reviewedBy ? { reviewReason: null, reviewedBy, reviewedAt: new Date() } : {}),
          })
          .where(key)
          .returning();
        const amount = await award(tx, updated);
        if (monetaryReview) {
          const [result] = await tx.select().from(patreonMember).where(key);
          if (result.reviewReason || !result.userId)
            throw new PatreonError(
              'The member still needs a matching verified account before approval.',
              409,
            );
        }
        return amount;
      });
    },
    async markInvalid(campaignId: string, memberId: string, observedAt: Date) {
      await database.transaction(async tx => {
        const key = memberKey(campaignId, memberId);
        await tx
          .insert(patreonMember)
          .values({ campaignId, memberId, observedAt, reviewReason: 'invalid_member' })
          .onConflictDoNothing();
        const [member] = await tx.select().from(patreonMember).where(key).for('update');
        if (member.observedAt > observedAt) return;
        const monetaryHold = ['payment_review', 'lifetime_decreased', 'account_removed'].includes(
          member.reviewReason ?? '',
        );
        await tx
          .update(patreonMember)
          .set({ observedAt, reviewReason: monetaryHold ? member.reviewReason : 'invalid_member' })
          .where(key);
      });
    },
    async markDeleted(campaignId: string, memberId: string, observedAt: Date) {
      await database.transaction(async tx => {
        const key = memberKey(campaignId, memberId);
        // Keep a tombstone even for a previously unknown member so an older
        // in-flight backfill cannot recreate and credit a deleted membership.
        await tx
          .insert(patreonMember)
          .values({ campaignId, memberId, observedAt, deletedAt: observedAt })
          .onConflictDoNothing();
        const [member] = await tx.select().from(patreonMember).where(key).for('update');
        if (member.observedAt > observedAt) return;
        await tx
          .update(patreonMember)
          .set({ deletedAt: observedAt, observedAt, patronStatus: 'former_patron' })
          .where(key);
      });
    },
    async reconcileUser(userId: string) {
      const [account] = await database
        .select({ email: user.email })
        .from(user)
        .where(eq(user.id, userId));
      if (!account) return;
      const email = normalizedEmail(account.email)!;
      const members = await database
        .select({ campaignId: patreonMember.campaignId, memberId: patreonMember.memberId })
        .from(patreonMember)
        .where(or(eq(patreonMember.email, email), eq(patreonMember.userId, userId)));
      for (const member of members) {
        await database.transaction(async tx => {
          const [current] = await tx
            .select()
            .from(patreonMember)
            .where(memberKey(member.campaignId, member.memberId))
            .for('update');
          if (current) await award(tx, current);
        });
      }
    },
  };
}

export const patreonCredits = createPatreonCredits();
