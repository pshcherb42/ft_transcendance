import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MatchResult {
  homeId: string; // jugador de la izquierda
  awayId: string; // jugador de la derecha
  homeScore: number;
  awayScore: number;
  winnerId: string;
}

/**
 * Persiste el resultado de una partida: crea un registro Match y actualiza las
 * Stats (wins/losses) de cada jugador. Es tolerante a fallos: si la BD no está
 * disponible, registra el error pero no rompe la partida en curso.
 */
@Injectable()
export class MatchService {
  private readonly logger = new Logger(MatchService.name);

  constructor(private prisma: PrismaService) {}

  async record(result: MatchResult): Promise<void> {
    try {
      await this.prisma.match.create({
        data: {
          homeId: result.homeId,
          awayId: result.awayId,
          homeScore: result.homeScore,
          awayScore: result.awayScore,
          winnerId: result.winnerId,
        },
      });

      const loserId =
        result.winnerId === result.homeId ? result.awayId : result.homeId;

      await this.bumpStats(result.winnerId, 'win');
      // Evitamos contar victoria y derrota al mismo usuario (p.ej. dos pestañas).
      if (loserId !== result.winnerId) await this.bumpStats(loserId, 'loss');
    } catch (err) {
      this.logger.error(
        `No se pudo guardar la partida: ${err?.message ?? err}`,
      );
    }
  }

  private async bumpStats(userId: string, outcome: 'win' | 'loss') {
    const wins = outcome === 'win' ? 1 : 0;
    const losses = outcome === 'loss' ? 1 : 0;
    await this.prisma.stats.upsert({
      where: { userId },
      create: { userId, wins, losses },
      update: {
        wins: { increment: wins },
        losses: { increment: losses },
      },
    });
  }
}
