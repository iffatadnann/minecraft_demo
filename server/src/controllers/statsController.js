import * as statsService from '../services/statsService.js';

export async function getStats(req, res) {
  res.json({ stats: await statsService.getStats(req.user.id) });
}