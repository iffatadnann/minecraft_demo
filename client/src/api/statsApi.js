import { http } from './httpClient.js';

export const fetchStats = () => http.get('/stats').then((r) => r.stats);