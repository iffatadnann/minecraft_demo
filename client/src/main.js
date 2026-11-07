import './style.css';
import { createRouter } from './app/router.js';
import { loadSession } from './app/session.js';
import { loginScreen } from './ui/screens/loginScreen.js';
import { signupScreen } from './ui/screens/signupScreen.js';
import { dashboardScreen } from './ui/screens/dashboardScreen.js';
import { gameScreen } from './ui/screens/gameScreen.js';
import { notFoundScreen } from './ui/screens/notFoundScreen.js';

// URL path (after the #) -> title, screen and who may see it
const routes = {
  '/login': { title: 'Log in', screen: loginScreen, auth: 'guest' },
  '/signup': { title: 'Sign up', screen: signupScreen, auth: 'guest' },
  '/dashboard': { title: 'Dashboard', screen: dashboardScreen, auth: 'required' },
  '/game': { title: 'Game', screen: gameScreen, auth: 'required' },
};

// Find out if the browser already has a valid session, then start the router
await loadSession();

createRouter({
  root: document.getElementById('app'),
  routes,
  notFound: { title: 'Not found', screen: notFoundScreen },
  defaultPath: '/login',
});