import { http } from './httpClient.js';

export const signup = (values) => http.post('/auth/signup', values).then((r) => r.user);
export const login = (values) => http.post('/auth/login', values).then((r) => r.user);
export const logout = () => http.post('/auth/logout');
export const fetchMe = () => http.get('/auth/me').then((r) => r.user);