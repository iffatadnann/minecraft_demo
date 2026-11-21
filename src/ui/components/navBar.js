import { el } from '../dom.js';
import { GAME_NAME } from '../../config/appInfo.js';
import { getUser, setUser } from '../../app/session.js';
import { navigate } from '../../app/router.js';
import { logout } from '../../api/authApi.js';

const LOGGED_IN_LINKS = [{ href: '#/dashboard', label: 'Dashboard' }];
const GUEST_LINKS = [
  { href: '#/login', label: 'Log in' },
  { href: '#/signup', label: 'Sign up' },
];

// Always ends logged out locally, even if the server call fails
async function handleLogout(button) {
  button.disabled = true;
  try {
    await logout();
  } catch {
    // the cookie may already be gone; log out here anyway
  }
  setUser(null);
  navigate('/login');
}

export function navBar() {
  const user = getUser();
  const current = window.location.hash.split('?')[0];
  const links = user ? LOGGED_IN_LINKS : GUEST_LINKS;

  const logoutButton = el('button', { class: 'btn nav-logout', type: 'button', text: 'Log out' });
  logoutButton.addEventListener('click', () => handleLogout(logoutButton));

  return el('header', { class: 'nav' }, [
    el('a', { class: 'brand', href: user ? '#/dashboard' : '#/login' }, [
      el('span', { class: 'brand-cube', 'aria-hidden': 'true' }),
      el('span', { class: 'brand-name', text: GAME_NAME }),
    ]),
    el('nav', { 'aria-label': 'Main' }, [
      el('ul', { class: 'nav-links' }, [
        ...links.map((link) =>
          el('li', {}, [
            el('a', {
              href: link.href,
              text: link.label,
              'aria-current': current === link.href ? 'page' : null,
            }),
          ])
        ),
        user && el('li', { class: 'nav-user', text: user.username }), // text only, no HTML
        user && el('li', {}, [logoutButton]),
      ]),
    ]),
  ]);
}