import { ApiError } from './httpClient.js';

const STORAGE_KEY_CURRENT_USER = 'lanternvale_current_user';
const MAX_WORLDS_PER_USER = 10;

function getCurrentUser() {
  const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  if (!raw) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Not logged in');
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Session corrupted');
  }
}

function getWorldsListKey(userId) {
  return `lanternvale_worlds_${userId}`;
}

function getWorldDataKey(worldId) {
  return `lanternvale_world_${worldId}`;
}

function getWorlds(userId) {
  try {
    return JSON.parse(localStorage.getItem(getWorldsListKey(userId)) || '[]');
  } catch {
    return [];
  }
}

function saveWorlds(userId, worlds) {
  localStorage.setItem(getWorldsListKey(userId), JSON.stringify(worlds));
}

export async function listWorlds() {
  const user = getCurrentUser();
  const worlds = getWorlds(user.id);
  // Sort descending by lastPlayedAt
  return worlds.sort((a, b) => new Date(b.lastPlayedAt) - new Date(a.lastPlayedAt));
}

export async function createWorld(name) {
  const user = getCurrentUser();
  const worlds = getWorlds(user.id);

  if (worlds.length >= MAX_WORLDS_PER_USER) {
    throw new ApiError(409, 'WORLD_LIMIT', `You can have at most ${MAX_WORLDS_PER_USER} worlds`);
  }

  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw new ApiError(400, 'INVALID_NAME', 'World name cannot be empty');
  }

  const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `world_${Date.now()}`;
  const now = new Date().toISOString();

  const worldSummary = {
    id,
    name: trimmedName,
    seed: 0,
    createdAt: now,
    lastPlayedAt: now,
    blocksMined: 0,
    blocksPlaced: 0,
    playTimeSeconds: 0,
  };

  const fullWorld = {
    world: {
      id,
      name: trimmedName,
      seed: 0,
      dataVersion: 1,
      player: null,
      stats: {
        blocksMined: 0,
        blocksPlaced: 0,
        playTimeSeconds: 0,
      },
    },
    inventory: [],
    chunks: [],
  };

  localStorage.setItem(getWorldDataKey(id), JSON.stringify(fullWorld));
  worlds.unshift(worldSummary);
  saveWorlds(user.id, worlds);

  return worldSummary;
}

export async function renameWorld(id, name) {
  const user = getCurrentUser();
  const trimmedName = (name || '').trim();
  if (!trimmedName) {
    throw new ApiError(400, 'INVALID_NAME', 'World name cannot be empty');
  }

  const worlds = getWorlds(user.id);
  const target = worlds.find((w) => w.id === id);
  if (!target) {
    throw new ApiError(404, 'WORLD_NOT_FOUND', 'World not found');
  }

  target.name = trimmedName;
  saveWorlds(user.id, worlds);

  // Update in full world data if present
  const fullRaw = localStorage.getItem(getWorldDataKey(id));
  if (fullRaw) {
    try {
      const full = JSON.parse(fullRaw);
      full.world.name = trimmedName;
      localStorage.setItem(getWorldDataKey(id), JSON.stringify(full));
    } catch {
      // Ignore parse failure
    }
  }

  return target;
}

export async function deleteWorld(id) {
  const user = getCurrentUser();
  const worlds = getWorlds(user.id);
  const filtered = worlds.filter((w) => w.id !== id);

  if (filtered.length === worlds.length) {
    throw new ApiError(404, 'WORLD_NOT_FOUND', 'World not found');
  }

  saveWorlds(user.id, filtered);
  localStorage.removeItem(getWorldDataKey(id));
  return { ok: true };
}

export async function fetchWorld(id) {
  const user = getCurrentUser();
  const raw = localStorage.getItem(getWorldDataKey(id));
  if (!raw) {
    throw new ApiError(404, 'WORLD_NOT_FOUND', 'World not found');
  }

  let fullWorld;
  try {
    fullWorld = JSON.parse(raw);
  } catch {
    throw new ApiError(500, 'DATA_CORRUPTED', 'Saved world data is corrupted');
  }

  // Update lastPlayedAt
  const now = new Date().toISOString();
  const worlds = getWorlds(user.id);
  const summary = worlds.find((w) => w.id === id);
  if (summary) {
    summary.lastPlayedAt = now;
    saveWorlds(user.id, worlds);
  }

  return fullWorld;
}

export async function saveWorld(id, payload, _options = {}) {
  const user = getCurrentUser();
  const raw = localStorage.getItem(getWorldDataKey(id));
  if (!raw) {
    throw new ApiError(404, 'WORLD_NOT_FOUND', 'World not found');
  }

  let fullWorld;
  try {
    fullWorld = JSON.parse(raw);
  } catch {
    throw new ApiError(500, 'DATA_CORRUPTED', 'Saved world data is corrupted');
  }

  const oldMined = fullWorld.world.stats?.blocksMined || 0;
  const oldPlaced = fullWorld.world.stats?.blocksPlaced || 0;
  const oldTime = fullWorld.world.stats?.playTimeSeconds || 0;

  const newMined = payload.stats?.blocksMined ?? oldMined;
  const newPlaced = payload.stats?.blocksPlaced ?? oldPlaced;
  const newTime = payload.stats?.playTimeSeconds ?? oldTime;

  const dMined = Math.max(0, newMined - oldMined);
  const dPlaced = Math.max(0, newPlaced - oldPlaced);
  const dTime = Math.max(0, newTime - oldTime);

  // Update player position and world stats
  fullWorld.world.dataVersion = payload.version || 1;
  fullWorld.world.player = payload.player || null;
  fullWorld.world.stats = {
    blocksMined: newMined,
    blocksPlaced: newPlaced,
    playTimeSeconds: newTime,
  };

  // Update inventory
  fullWorld.inventory = Array.isArray(payload.inventory) ? payload.inventory : [];

  // Merge changed chunks into full world chunk storage
  const chunkMap = new Map();
  for (const chunk of fullWorld.chunks || []) {
    chunkMap.set(`${chunk.chunkX},${chunk.chunkZ}`, chunk.edits);
  }

  if (Array.isArray(payload.chunks)) {
    for (const { chunkX, chunkZ, edits } of payload.chunks) {
      const key = `${chunkX},${chunkZ}`;
      if (!edits || edits.length === 0) {
        chunkMap.delete(key);
      } else {
        chunkMap.set(key, edits);
      }
    }
  }

  fullWorld.chunks = Array.from(chunkMap.entries()).map(([key, edits]) => {
    const [chunkX, chunkZ] = key.split(',').map(Number);
    return { chunkX, chunkZ, edits };
  });

  const now = new Date().toISOString();
  localStorage.setItem(getWorldDataKey(id), JSON.stringify(fullWorld));

  // Update world summary in user's world list
  const worlds = getWorlds(user.id);
  const summary = worlds.find((w) => w.id === id);
  if (summary) {
    summary.lastPlayedAt = now;
    summary.blocksMined = newMined;
    summary.blocksPlaced = newPlaced;
    summary.playTimeSeconds = newTime;
    saveWorlds(user.id, worlds);
  }

  // Update lifetime totals for the user
  const statsKey = `lanternvale_stats_${user.id}`;
  try {
    const rawStats = localStorage.getItem(statsKey);
    const stats = rawStats
      ? JSON.parse(rawStats)
      : { blocksPlaced: 0, blocksMined: 0, distanceTravelled: 0, playTimeSeconds: 0 };
    stats.blocksMined = (stats.blocksMined || 0) + dMined;
    stats.blocksPlaced = (stats.blocksPlaced || 0) + dPlaced;
    stats.playTimeSeconds = (stats.playTimeSeconds || 0) + dTime;
    localStorage.setItem(statsKey, JSON.stringify(stats));
  } catch {
    // Ignore stats update failure
  }

  return { savedAt: now };
}
