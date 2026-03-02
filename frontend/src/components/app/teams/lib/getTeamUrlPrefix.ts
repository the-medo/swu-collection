export const getTeamUrlPrefix2 = (teamId: string | undefined) => {
  return teamId ? `/teams/${teamId}` : '';
};

export const getTeamUrlPrefix = (teamId: string | undefined): '/teams/$teamId' | '' => {
  return teamId ? `/teams/$teamId` : '';
};
