import { z } from 'zod';

// Private account setting: never sync this key to the shared browser settings store.
export const homeLocationSettingKey = 'home_location';

export const homeLocationInputSchema = z.strictObject({
  address: z.string().trim().max(250).default(''),
  city: z.string().trim().min(1, 'Enter a city.').max(150),
  state: z.string().trim().max(150).default(''),
  postalCode: z.string().trim().max(30).default(''),
  country: z
    .string()
    .trim()
    .regex(/^[A-Za-z]{2}$/, 'Select a country.')
    .transform(value => value.toUpperCase()),
});

export const homeLocationSchema = z.object({
  input: homeLocationInputSchema,
  coordinates: z.object({ x: z.number().min(-180).max(180), y: z.number().min(-90).max(90) }),
  formattedAddress: z.string(),
  precision: z.enum(['address', 'street', 'city']),
  updatedAt: z.iso.datetime(),
});

export const homeLocationUpdateSchema = z.strictObject({
  location: homeLocationInputSchema.nullable(),
});
export type HomeLocationInput = z.infer<typeof homeLocationInputSchema>;
export type HomeLocation = z.infer<typeof homeLocationSchema>;

export function parseHomeLocation(value: string | undefined): HomeLocation | null {
  if (!value) return null;
  try {
    return homeLocationSchema.safeParse(JSON.parse(value)).data ?? null;
  } catch {
    return null;
  }
}
