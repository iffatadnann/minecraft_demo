import { prisma } from '../db/prisma.js';

// Creates the row if it is missing (it normally exists from signup)
export function getStats(userId) {
  return prisma.playerStats.upsert({
    where: { userId },
    create: { userId },
    update: {},
    select: { blocksPlaced: true, blocksMined: true, distanceTravelled: true, playTimeSeconds: true },
  });
}