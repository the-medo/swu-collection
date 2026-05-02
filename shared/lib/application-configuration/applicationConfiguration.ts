import { z } from 'zod';

export const applicationConfigurationSchema = z
  .object({
    homepageMode: z.enum(['snapshot', 'live']).default('snapshot'),
  })
  .strict();

export const applicationConfigurationPatchSchema = applicationConfigurationSchema
  .partial()
  .refine(value => Object.keys(value).length === 1, {
    message: 'Exactly one configuration key must be provided.',
  });

export type ApplicationConfiguration = z.infer<typeof applicationConfigurationSchema>;

export function getDefaultApplicationConfiguration(): ApplicationConfiguration {
  return applicationConfigurationSchema.parse({});
}
