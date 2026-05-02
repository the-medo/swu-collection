const REGIONAL_INDICATOR_OFFSET = 127397;

export function truncateDiscordText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);

  return `${value.slice(0, maxLength - 3)}...`;
}

function normalizeCountryCode(value: string) {
  const candidate = value.split(',').at(-1)?.trim().toUpperCase();

  if (!candidate) return undefined;

  const normalized = candidate === 'UK' ? 'GB' : candidate;
  return /^[A-Z]{2}$/.test(normalized) ? normalized : undefined;
}

export function countryCodeToFlagEmoji(value: string) {
  const countryCode = normalizeCountryCode(value);
  if (!countryCode) return undefined;

  return [...countryCode]
    .map(character => String.fromCodePoint(REGIONAL_INDICATOR_OFFSET + character.charCodeAt(0)))
    .join('');
}

export function sanitizeDiscordMessageText(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/([`*_~|])/g, '\\$1')
    .replace(/</g, '(')
    .replace(/>/g, ')')
    .replace(/@/g, 'at ');
}

export function getTournamentDiscordDisplayName(tournament: { name: string; location: string }) {
  const safeName = sanitizeDiscordMessageText(tournament.name);
  const flagEmoji = countryCodeToFlagEmoji(tournament.location);

  return flagEmoji ? `${flagEmoji} ${safeName}` : safeName;
}
