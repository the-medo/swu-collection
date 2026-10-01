import { expect, test } from 'bun:test';
import { randomBytes } from 'node:crypto';
import {
  attachmentEncryptionKey,
  attachmentFileType,
  decryptAttachment,
  encryptAttachment,
} from './storage.ts';
import {
  attachmentCreateInput,
  attachmentUploadInput,
  maxAttachmentBytes,
} from '../../../types/TournamentAttachment.ts';

test('public objects contain authenticated ciphertext, unique nonces and path-bound encryption', () => {
  const key = randomBytes(32),
    path = 'user-data/owner/tournament/event/id.pdf';
  const body = Buffer.from('%PDF-1.7 Private ticket details');
  const encrypted = encryptAttachment(body, path, key);
  expect(encrypted.includes(body)).toBe(false);
  expect(encrypted.equals(encryptAttachment(body, path, key))).toBe(false);
  expect(decryptAttachment(encrypted, path, key)).toEqual(body);
  expect(() =>
    decryptAttachment(encrypted, 'user-data/other/tournament/event/id.pdf', key),
  ).toThrow();
  expect(() => decryptAttachment(encrypted, path, randomBytes(32))).toThrow();
  const corrupt = Buffer.from(encrypted);
  corrupt[corrupt.length - 1] ^= 1;
  expect(() => decryptAttachment(corrupt, path, key)).toThrow();
  expect(() => decryptAttachment(body, path, key)).toThrow();
  expect(() => attachmentEncryptionKey('')).toThrow('not configured');
  expect(() => attachmentEncryptionKey('short')).toThrow();
  expect(attachmentEncryptionKey(key.toString('base64'))).toEqual(key);
});
test('accepts supported signatures and rejects executable files, MIME spoofing and oversized uploads', () => {
  const formats = [
    ['image/png', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), 'png'],
    ['image/jpeg', Buffer.from([255, 216, 255, 1]), 'jpg'],
    ['image/gif', Buffer.from('GIF89a'), 'gif'],
    ['image/webp', Buffer.from('RIFF1234WEBP'), 'webp'],
    ['application/pdf', Buffer.from('%PDF-1.7'), 'pdf'],
  ] as const;
  for (const [mime, bytes, extension] of formats)
    expect(attachmentFileType(bytes, mime)).toBe(extension);
  expect(() => attachmentFileType(Buffer.from('<script>bad</script>'), 'image/png')).toThrow();
  expect(() => attachmentFileType(Buffer.from('<svg/>'), 'image/svg+xml')).toThrow();
  expect(
    attachmentUploadInput.safeParse({
      title: 'File',
      category: 'ticket',
      file: new File([new Uint8Array(maxAttachmentBytes + 1)], 'large.pdf', {
        type: 'application/pdf',
      }),
    }).success,
  ).toBe(false);
  for (const content of [
    'not a URL',
    '',
    'javascript:alert(1)',
    'data:text/html,hi',
    'https://user:secret@example.com',
  ])
    expect(
      attachmentCreateInput.safeParse({ title: 'Unsafe', category: 'other', kind: 'link', content })
        .success,
    ).toBe(false);
  expect(
    attachmentCreateInput.safeParse({
      title: 'Note',
      category: 'other',
      kind: 'text',
      content: 'Private note',
      userId: 'someone-else',
    }).success,
  ).toBe(false);
});
