import { prisma } from '../db/prisma.js';
import { AppError } from '../utils/AppError.js';
import { MAX_WORLDS_PER_USER } from '../constants/world.js';

const notFound = () => new AppError(404, 'WORLD_NOT_FOUND', 'World not found');

// The only world fields the list and rename endpoints send back
const SUMMARY = {
  id: true, name: true, createdAt: true, lastPlayedAt: true,
  blocksMined: true, blocksPlaced: true, playTimeSeconds: true,
};

export function listWorlds(userId) {
  return prisma.world.findMany({ where: { userId }, orderBy: { lastPlayedAt: 'desc' }, select: SUMMARY });
}

export function createWorld(userId, { name, seed = 0 }) {
  return prisma.$transaction(async (tx) => {
    // Lock this user's row so two requests at once cannot pass the limit
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
    const count = await tx.world.count({ where: { userId } });
    if (count >= MAX_WORLDS_PER_USER) {
      throw new AppError(409, 'WORLD_LIMIT', `You can have at most ${MAX_WORLDS_PER_USER} worlds`);
    }
    return tx.world.create({ data: { userId, name, seed }, select: SUMMARY });
  });
}

export async function renameWorld(userId, worldId, name) {
  const { count } = await prisma.world.updateMany({ where: { id: worldId, userId }, data: { name } });
  if (count === 0) throw notFound();
  return prisma.world.findFirst({ where: { id: worldId, userId }, select: SUMMARY });
}

export async function deleteWorld(userId, worldId) {
  const { count } = await prisma.world.deleteMany({ where: { id: worldId, userId } }); // cascades
  if (count === 0) throw notFound();
}

// Everything the game needs to load one world
export async function getWorld(userId, worldId) {
  const world = await prisma.world.findFirst({
    where: { id: worldId, userId },
    include: {
      chunks: { select: { chunkX: true, chunkZ: true, edits: true } },
      inventory: { select: { slot: true, blockId: true, count: true }, orderBy: { slot: 'asc' } },
    },
  });
  if (!world) throw notFound();

  // Opening a world restarts the "time since last save" window used to cap stats
  await prisma.world.updateMany({ where: { id: worldId, userId }, data: { lastPlayedAt: new Date() } });

  const hasPosition = world.playerX !== null && world.playerY !== null && world.playerZ !== null;
  return {
    world: {
      id: world.id,
      name: world.name,
      seed: world.seed,
      dataVersion: world.dataVersion,
      player: hasPosition
        ? { x: world.playerX, y: world.playerY, z: world.playerZ, yaw: world.playerYaw, pitch: world.playerPitch }
        : null, // null = use the default spawn
      stats: {
        blocksMined: world.blocksMined,
        blocksPlaced: world.blocksPlaced,
        playTimeSeconds: world.playTimeSeconds,
      },
    },
    inventory: world.inventory,
    chunks: world.chunks,
  };
}

// Saves player, counters, inventory and the CHANGED chunks in one transaction.
export async function saveWorld(userId, worldId, data) {
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Lock the row; this also checks ownership (someone else's world finds nothing)
    const locked = await tx.$queryRaw`
      SELECT id FROM "World" WHERE id = ${worldId}::uuid AND "userId" = ${userId}::uuid FOR UPDATE`;
    if (locked.length === 0) throw notFound();
    const world = await tx.world.findUnique({ where: { id: worldId } });

    // Counters can only go up, and only as fast as a real player could play
    const elapsed = Math.min(Math.max((now - world.lastPlayedAt) / 1000, 0), 3600);
    const maxBlocks = Math.ceil(elapsed * 20) + 50;
    const gain = (next, old, cap) => Math.min(Math.max(next - old, 0), cap);

    const dTime = gain(Math.floor(data.stats.playTimeSeconds), world.playTimeSeconds, Math.ceil(elapsed) + 5);
    const dMined = gain(data.stats.blocksMined, world.blocksMined, maxBlocks);
    const dPlaced = gain(data.stats.blocksPlaced, world.blocksPlaced, maxBlocks);

    await tx.world.update({
      where: { id: worldId },
      data: {
        dataVersion: data.version,
        playerX: data.player.x,
        playerY: data.player.y,
        playerZ: data.player.z,
        playerYaw: data.player.yaw,
        playerPitch: data.player.pitch,
        blocksMined: { increment: dMined },
        blocksPlaced: { increment: dPlaced },
        playTimeSeconds: { increment: dTime },
        lastPlayedAt: now,
      },
    });

    // Lifetime totals for the dashboard
    await tx.playerStats.upsert({
      where: { userId },
      create: { userId, blocksMined: dMined, blocksPlaced: dPlaced, playTimeSeconds: dTime },
      update: {
        blocksMined: { increment: dMined },
        blocksPlaced: { increment: dPlaced },
        playTimeSeconds: { increment: dTime },
      },
    });

    // Only the chunks the client says changed. Each edit list replaces the old one.
    for (const { chunkX, chunkZ, edits } of data.chunks) {
      if (edits.length === 0) {
        await tx.worldChunk.deleteMany({ where: { worldId, chunkX, chunkZ } });
      } else {
        await tx.worldChunk.upsert({
          where: { worldId_chunkX_chunkZ: { worldId, chunkX, chunkZ } },
          create: { worldId, chunkX, chunkZ, edits },
          update: { edits },
        });
      }
    }

    // The inventory is small (max 36 rows): replace it
    await tx.inventorySlot.deleteMany({ where: { worldId } });
    if (data.inventory.length > 0) {
      await tx.inventorySlot.createMany({ data: data.inventory.map((s) => ({ worldId, ...s })) });
    }
  });

  return { savedAt: now };
}