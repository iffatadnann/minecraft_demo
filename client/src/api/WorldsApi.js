import { http } from './httpClient.js';

const url = (id) => `/worlds/${encodeURIComponent(id)}`;

export const listWorlds = () => http.get('/worlds').then((r) => r.worlds);
export const createWorld = (name) => http.post('/worlds', { name }).then((r) => r.world);
export const renameWorld = (id, name) => http.patch(url(id), { name }).then((r) => r.world);
export const deleteWorld = (id) => http.delete(url(id));

// Returns { world, inventory, chunks }
export const fetchWorld = (id) => http.get(url(id));

// options: { keepalive: true } lets the request finish while the page is closing
export const saveWorld = (id, payload, options) => http.post(`${url(id)}/save`, payload, options);