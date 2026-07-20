// types/stats.ts
export interface MatchHistoryEntry {
  id: string;
  opponent: string;
  myScore: number;
  opponentScore: number;
  won: boolean;
  createdAt: string;
}

export interface UserStats {
  wins: number;
  losses: number;
  level: number;
  totalMatches: number;
  winRate: number;
  matches: MatchHistoryEntry[];
}
