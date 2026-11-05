import { and, eq } from 'drizzle-orm';
import { db } from '../../db';
import { user } from '../../db/schema/auth-schema.ts';
import {
  integrationApp,
  integrationAppCode,
  integrationAppConnection,
} from '../../db/schema/integration_app.ts';
import type {
  IntegrationAppInput,
  IntegrationAppSummary,
} from '../../../shared/types/integrationApp.ts';
import { assertActiveUser, type Executor } from './access.ts';
import { IntegrationAppError } from './errors.ts';
import { hashIntegrationSecret, newIntegrationSecret } from './crypto.ts';

type App = typeof integrationApp.$inferSelect;

const appSummary = (app: App): IntegrationAppSummary => ({
  clientId: app.clientId,
  name: app.name,
  description: app.description,
  redirectUris: app.redirectUris,
  scopes: app.scopes,
  disabled: app.disabled,
  createdAt: app.createdAt.toISOString(),
});

async function revokeAll(executor: Executor, clientId: string) {
  await executor.delete(integrationAppCode).where(eq(integrationAppCode.clientId, clientId));
  await executor
    .delete(integrationAppConnection)
    .where(eq(integrationAppConnection.clientId, clientId));
}

async function ownedApp(executor: Executor, ownerId: string, clientId: string) {
  const [app] = await executor
    .select()
    .from(integrationApp)
    .where(and(eq(integrationApp.clientId, clientId), eq(integrationApp.ownerId, ownerId)))
    .for('update');
  if (!app) throw new IntegrationAppError('App not found.', 404);
  return app;
}

// Callback and scope order has no effect on the registration's permissions.
const sameMembers = (current: string[], next: string[]) => {
  const currentValues = new Set(current);
  const nextValues = new Set(next);
  return (
    currentValues.size === nextValues.size &&
    [...nextValues].every(value => currentValues.has(value))
  );
};

export const appManagementService = {
  async list(ownerId: string) {
    return (
      await db
        .select()
        .from(integrationApp)
        .where(eq(integrationApp.ownerId, ownerId))
        .orderBy(integrationApp.createdAt)
    ).map(appSummary);
  },

  async create(ownerId: string, input: IntegrationAppInput) {
    return db.transaction(async tx => {
      // Serialize the per-owner quota, including simultaneous registrations.
      await tx.select({ id: user.id }).from(user).where(eq(user.id, ownerId)).for('update');
      await assertActiveUser(tx, ownerId);
      const apps = await tx
        .select({ id: integrationApp.clientId })
        .from(integrationApp)
        .where(eq(integrationApp.ownerId, ownerId));
      if (apps.length >= 10) throw new IntegrationAppError('You can register up to 10 apps.', 409);
      const clientSecret = newIntegrationSecret('swu_secret');
      const [app] = await tx
        .insert(integrationApp)
        .values({
          ...input,
          ownerId,
          clientId: newIntegrationSecret('swu_app'),
          secretHash: hashIntegrationSecret(clientSecret),
        })
        .returning();
      return { app: appSummary(app!), clientSecret };
    });
  },

  async update(ownerId: string, clientId: string, input: IntegrationAppInput) {
    return db.transaction(async tx => {
      const current = await ownedApp(tx, ownerId, clientId);
      if (
        current.name === input.name &&
        current.description === input.description &&
        sameMembers(current.redirectUris, input.redirectUris) &&
        sameMembers(current.scopes, input.scopes)
      )
        return appSummary(current);
      const [app] = await tx
        .update(integrationApp)
        .set({ ...input, updatedAt: new Date() })
        .where(and(eq(integrationApp.clientId, clientId), eq(integrationApp.ownerId, ownerId)))
        .returning();
      // A changed registration always requires fresh consent.
      await revokeAll(tx, clientId);
      return appSummary(app!);
    });
  },

  async rotate(ownerId: string, clientId: string) {
    return db.transaction(async tx => {
      const app = await ownedApp(tx, ownerId, clientId);
      const clientSecret = newIntegrationSecret('swu_secret');
      await tx
        .update(integrationApp)
        .set({ secretHash: hashIntegrationSecret(clientSecret), updatedAt: new Date() })
        .where(and(eq(integrationApp.clientId, clientId), eq(integrationApp.ownerId, ownerId)));
      await revokeAll(tx, clientId);
      return { app: appSummary(app), clientSecret };
    });
  },

  async setDisabled(ownerId: string, clientId: string, disabled: boolean) {
    return db.transaction(async tx => {
      await ownedApp(tx, ownerId, clientId);
      const [app] = await tx
        .update(integrationApp)
        .set({ disabled, updatedAt: new Date() })
        .where(and(eq(integrationApp.clientId, clientId), eq(integrationApp.ownerId, ownerId)))
        .returning();
      await revokeAll(tx, clientId);
      return appSummary(app!);
    });
  },

  async remove(ownerId: string, clientId: string) {
    return db.transaction(async tx => {
      await ownedApp(tx, ownerId, clientId);
      await tx
        .delete(integrationApp)
        .where(and(eq(integrationApp.clientId, clientId), eq(integrationApp.ownerId, ownerId)));
    });
  },

  async connections(userId: string) {
    return (
      await db
        .select({
          clientId: integrationApp.clientId,
          name: integrationApp.name,
          scopes: integrationAppConnection.scopes,
          connectedAt: integrationAppConnection.connectedAt,
        })
        .from(integrationAppConnection)
        .innerJoin(integrationApp, eq(integrationApp.clientId, integrationAppConnection.clientId))
        .where(eq(integrationAppConnection.userId, userId))
    ).map(row => ({ ...row, connectedAt: row.connectedAt.toISOString() }));
  },

  async disconnect(userId: string, clientId: string) {
    await db.transaction(async tx => {
      // Serialize disconnect with all in-flight approvals, including insertion
      // of a first pending code that has no existing row to lock yet.
      await tx
        .select({ id: integrationApp.clientId })
        .from(integrationApp)
        .where(eq(integrationApp.clientId, clientId))
        .for('update');
      await tx
        .delete(integrationAppCode)
        .where(
          and(eq(integrationAppCode.clientId, clientId), eq(integrationAppCode.userId, userId)),
        );
      await tx
        .delete(integrationAppConnection)
        .where(
          and(
            eq(integrationAppConnection.clientId, clientId),
            eq(integrationAppConnection.userId, userId),
          ),
        );
    });
  },
};
