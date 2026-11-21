import { ApiError } from './httpClient.js';

const STORAGE_KEY_CURRENT_USER = 'lanternvale_current_user';

export async function fetchStats() {
  const rawUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
  if (!rawUser) {
    throw new ApiError(401, 'UNAUTHORIZED', 'Not logged in');
  }

  let user;
  try {
    user = JSON.parse(rawUser);
  } catch {
    throw new ApiError(401, 'UNAUTHORIZED', 'Session corrupted');
  }

  const statsKey = `lanternvale_stats_${user.id}`;
  try {
    const rawStats = localStorage.getItem(statsKey);
    if (!rawStats) {
      return { blocksPlaced: 0, blocksMined: 0, distanceTravelled: 0, playTimeSeconds: 0 };
    }
    const stats = JSON.parse(rawStats);
    return {
      blocksPlaced: stats.blocksPlaced || 0,
      blocksMined: stats.blocksMined || 0,
      distanceTravelled: stats.distanceTravelled || 0,
      playTimeSeconds: stats.playTimeSeconds || 0,
    };
  } catch {
    return { blocksPlaced: 0, blocksMined: 0, distanceTravelled: 0, playTimeSeconds: 0 };
  }
}
