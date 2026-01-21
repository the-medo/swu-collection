import crypto from 'node:crypto';
import { IntegrationType } from '../../../shared/types/integration.ts';

const ALGORITHM = 'aes-256-cbc';
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY!; // Fallback for local dev if not set
const IV_LENGTH = 16;

/**
 * Encrypts a string using AES-256-CBC
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.substring(0, 32)), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

/**
 * Decrypts a string using AES-256-CBC
 */
export function decrypt(text: string): string {
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.substring(0, 32)),
    iv,
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Generates a random link token
 */
export function generateLinkToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Validates client ID of an integration
 */
export function validateClientIdCredentials(
  integration: IntegrationType,
  clientId: string,
): boolean {
  switch (integration) {
    case IntegrationType.Karabast:
      return clientId === process.env.KARABAST_CLIENT_ID;
  }
  return false;
}

/**
 * Validates client ID and secret of an integration
 */
export function validateCliendIdSecretCredentials(
  integration: IntegrationType,
  clientId: string,
  clientSecret: string,
): boolean {
  switch (integration) {
    case IntegrationType.Karabast:
      return !!(
        validateClientIdCredentials(integration, clientId) &&
        clientSecret &&
        clientSecret === process.env.KARABAST_CLIENT_SECRET
      );
  }
  return false;
}

/**
 * Generates access and refresh tokens for integration
 */
export function generateIntegrationTokens() {
  const accessToken = `access-${crypto.randomUUID()}`;
  const refreshToken = `refresh-${crypto.randomUUID()}`;
  const accessTokenEnc = encrypt(accessToken);
  const refreshTokenEnc = encrypt(refreshToken);
  const now = new Date();
  const expiresIn = 3600; // 1 hour in seconds
  const accessExpiresAt = new Date(now.getTime() + expiresIn * 1000);
  const refreshExpiresAt = new Date(now.getTime() + 30 * 24 * 3600 * 1000); // 30 days

  return {
    accessToken,
    accessTokenEnc,
    refreshToken,
    refreshTokenEnc,
    expiresIn,
    accessExpiresAt,
    refreshExpiresAt,
    now,
  };
}
