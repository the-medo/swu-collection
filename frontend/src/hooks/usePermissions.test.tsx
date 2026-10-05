import { afterEach, expect, mock, spyOn, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import * as userHook from './useUser.ts';
import { usePermissions } from './usePermissions.ts';

afterEach(() => mock.restore());

function PermissionProbe({ section, action }: { section: string; action: string }) {
  const hasPermission = usePermissions();
  return <span>{String(hasPermission(section, action))}</span>;
}

// Stub session presentation only; exercise the real Better Auth client plugin
// and shared role definitions through the hook used by application controls.
test.each([
  [null, 'admin', 'access', false],
  ['user', 'admin', 'access', false],
  ['admin', 'admin', 'access', true],
  ['admin', 'statistics', 'compute', true],
  ['organizer', 'tournament', 'create', true],
  ['organizer', 'tournament', 'import', false],
  ['moderator', 'admin', 'access', false],
  ['user, admin', 'meta', 'update', true],
  ['user, crossfire', 'crossfire', 'access', true],
] as const)('role %s checks %s:%s as %s', (role, section, action, allowed) => {
  spyOn(userHook, 'useUser').mockReturnValue(
    role === null ? null : ({ role } as NonNullable<ReturnType<typeof userHook.useUser>>),
  );
  expect(renderToStaticMarkup(<PermissionProbe section={section} action={action} />)).toBe(
    `<span>${allowed}</span>`,
  );
});
