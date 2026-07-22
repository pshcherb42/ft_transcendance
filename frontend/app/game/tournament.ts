/**
 * Torneo local de eliminación directa (2–8 jugadores por alias).
 *
 * Módulo PURO (sin React ni canvas): construye el bracket, dice qué partida toca
 * y avanza a los ganadores. Los "byes" (cuando el nº de jugadores no es potencia
 * de 2) se reparten para que ningún cruce quede vacío: cada partida de la primera
 * ronda tiene siempre al menos un jugador real (en `p1`), y si `p2` es null ese
 * jugador pasa automáticamente.
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

    // Rondas vacías (matches0, matches0/2, …, 1).
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

    // Primera ronda: p1 siempre real; p2 real o null (bye).
    const matches0 = size / 2;
    for (let i = 0; i < matches0; i++) {
      this.rounds[0][i].p1 = players[i] ?? null;
      this.rounds[0][i].p2 = players[matches0 + i] ?? null;
    }

    // Resolver byes de la primera ronda (p2 null → pasa p1).
    for (const m of this.rounds[0]) {
      if (m.p1 && !m.p2) {
        m.winner = m.p1;
        this.advance(m);
      }
    }
  }

  // Próxima partida real por jugar (ambos jugadores conocidos, sin ganador).
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

  // Reporta el ganador de la partida en curso (por alias) y lo hace avanzar.
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
