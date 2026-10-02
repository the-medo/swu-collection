export const meleeConnectionKeys = {
  status: (userId: string | undefined) => ['melee-connection', userId] as const,
};
