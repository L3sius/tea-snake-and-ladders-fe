// Color/logo are frontend-owned and never sent by getTeams — keyed by the
// numeric id getTeams assigns each team.
export const teamPresentation: Record<number, { color: string; logoPath: string }> = {
  1: { color: '#f1c40f', logoPath: '/images/teams/team1.png' },
  2: { color: '#3498db', logoPath: '/images/teams/team2.png' },
  3: { color: '#2ecc71', logoPath: '/images/teams/team3.png' },
}
