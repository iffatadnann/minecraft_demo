import * as worldService from '../services/worldService.js';

export async function list(req, res) {
  res.json({ worlds: await worldService.listWorlds(req.user.id) });
}

export async function create(req, res) {
  res.status(201).json({ world: await worldService.createWorld(req.user.id, req.body) });
}

export async function rename(req, res) {
  res.json({ world: await worldService.renameWorld(req.user.id, req.params.worldId, req.body.name) });
}

export async function remove(req, res) {
  await worldService.deleteWorld(req.user.id, req.params.worldId);
  res.json({ ok: true });
}

export async function get(req, res) {
  res.json(await worldService.getWorld(req.user.id, req.params.worldId));
}

export async function save(req, res) {
  const { savedAt } = await worldService.saveWorld(req.user.id, req.params.worldId, req.body);
  res.json({ ok: true, savedAt });
}