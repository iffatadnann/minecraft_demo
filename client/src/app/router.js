import { GAME_NAME } from '../config/appInfo.js';
import { getUser } from './session.js';

// Hash router with login guards.
// route.auth: 'required' = logged-in users only, 'guest' = logged-out users only.
// A screen is a function: screen(root) -> optionally returns a cleanup function.

export function navigate(path) {
  window.location.hash = path;
}

export function createRouter({ root, routes, notFound, defaultPath }) {
  let cleanup = null;

  function redirect(path) {
    window.location.replace('#' + path); // "hashchange" calls render() again
  }

  function render() {
    if (!window.location.hash) {
      redirect(getUser() ? '/dashboard' : defaultPath);
      return;
    }

    // Ignore a query string such as "/game?world=123" when matching the route
    const path = window.location.hash.slice(1).split('?')[0];
    const route = Object.hasOwn(routes, path) ? routes[path] : notFound;

    if (route.auth === 'required' && !getUser()) return redirect('/login');
    if (route.auth === 'guest' && getUser()) return redirect('/dashboard');

    // Clean up the previous screen (stop timers, remove listeners, etc.)
    if (typeof cleanup === 'function') cleanup();
    cleanup = null;
    root.replaceChildren();

    document.title = `${route.title} · ${GAME_NAME}`;
    cleanup = route.screen(root) ?? null;
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', render);
  render();
}