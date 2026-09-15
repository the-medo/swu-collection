// Rebuild the official title snapshot; review and bump the executable bundle.
const catalog = (await Bun.file(
  new URL('../../server/db/json/card-list.json', import.meta.url),
).json()) as Record<string, { title: string }>;
const names = Object.fromEntries(
  Object.entries(catalog)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([id, card]) => {
      if (!card.title?.trim()) throw new Error(`Missing official title: ${id}`);
      return [id, card.title];
    }),
);
await Bun.write(
  new URL('../cards/catalog-names.json', import.meta.url),
  JSON.stringify(names, null, 2) + '\n',
);
