export const userReportKeys = {
  all: ['admin-user-reports'] as const,
  list: (actor: string | undefined, input: unknown) =>
    [...userReportKeys.all, actor, 'list', input] as const,
  detail: (actor: string | undefined, id: string) =>
    [...userReportKeys.all, actor, 'detail', id] as const,
  user: (actor: string | undefined, id: string) =>
    [...userReportKeys.all, actor, 'user', id] as const,
  actions: (actor: string | undefined, id: string, page: number) =>
    [...userReportKeys.all, actor, 'actions', id, page] as const,
};
