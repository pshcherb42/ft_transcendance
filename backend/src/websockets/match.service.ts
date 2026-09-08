import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MatchResult {
  homeId: string; // left player
  awayId: string; // right player
  homeScore: number;
  awayScore: number;
  winnerId: string;
}

/**
 * Persists a match result: creates a Match record and updates each player's
 * Stats (wins/losses). It is fault-tolerant: if the DB is unavailable, it
 * logs the error but doesn't break the match in progress.
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
      // Avoid counting a win and a loss for the same user (e.g. two tabs).
      if (loserId !== result.winnerId) await this.bumpStats(loserId, 'loss');
    } catch (err) {
      this.logger.error(
        `Could not save the match: ${err?.message ?? err}`,
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
