/**
 * Local single-elimination tournament (2–8 players by alias).
 *
 * PURE module (no React or canvas): builds the bracket, says which match is up
 * and advances the winners. The "byes" (when the player count isn't a power of
 * 2) are distributed so no matchup is empty: every first-round match always has
 * at least one real player (in `p1`), and if `p2` is null that player advances
 * automatically.
 */

export interface TournamentMatch {
  round: number;
  index: number;
  p1: string | null;
  p2: string | null;
  winner: string | null;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export class Tournament {
  readonly rounds: TournamentMatch[][] = [];

  constructor(aliases: string[]) {
    const players = shuffle(aliases);
    const size = Math.max(2, nextPow2(players.length));
    const numRounds = Math.round(Math.log2(size));

    // Empty rounds (matches0, matches0/2, …, 1).
    let count = size / 2;
    for (let r = 0; r < numRounds; r++) {
      this.rounds.push(
        Array.from({ length: count }, (_, index) => ({
          round: r,
          index,
          p1: null,
          p2: null,
          winner: null,
        })),
      );
      count /= 2;
    }

    // First round: p1 always real; p2 real or null (bye).
    const matches0 = size / 2;
    for (let i = 0; i < matches0; i++) {
      this.rounds[0][i].p1 = players[i] ?? null;
      this.rounds[0][i].p2 = players[matches0 + i] ?? null;
    }

    // Resolve first-round byes (p2 null → p1 advances).
    for (const m of this.rounds[0]) {
      if (m.p1 && !m.p2) {
        m.winner = m.p1;
        this.advance(m);
      }
    }
  }

  // Next real match to play (both players known, no winner yet).
  get current(): TournamentMatch | null {
    for (const round of this.rounds) {
      for (const m of round) {
        if (m.p1 && m.p2 && !m.winner) return m;
      }
    }
    return null;
  }

  get isComplete(): boolean {
    const final = this.rounds[this.rounds.length - 1][0];
    return !!final.winner;
  }

  get champion(): string | null {
    return this.rounds[this.rounds.length - 1][0].winner;
  }

  // Reports the winner of the current match (by alias) and advances them.
  reportWinner(alias: string) {
    const m = this.current;
    if (!m) return;
    m.winner = alias === m.p2 ? m.p2 : m.p1;
    this.advance(m);
  }

  private advance(m: TournamentMatch) {
    if (m.round >= this.rounds.length - 1 || !m.winner) return;
    const next = this.rounds[m.round + 1][Math.floor(m.index / 2)];
    if (m.index % 2 === 0) next.p1 = m.winner;
    else next.p2 = m.winner;
  }
}
