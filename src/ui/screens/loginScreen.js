import { el } from '../dom.js';
import { navBar } from '../components/navBar.js';
import { authForm } from '../components/authForm.js';
import { login, guestLogin } from '../../api/authApi.js';
import { setUser } from '../../app/session.js';
import { navigate } from '../../app/router.js';

export function loginScreen(root) {
  const footer = el('div', { class: 'auth-footer' }, [
    el('p', { class: 'muted' }, [
      'New here? ',
      el('a', { href: '#/signup', text: 'Create an account' }),
    ]),
    el('div', { style: 'margin-top: 1.25rem; text-align: center;' }, [
      el('button', {
        class: 'btn',
        type: 'button',
        text: '⚡ Instant Play as Guest',
        onclick: async () => {
          setUser(await guestLogin());
          navigate('/dashboard');
        },
      }),
    ]),
  ]);

  root.append(
    navBar(),
    el('main', { class: 'page' }, [
      authForm({
        title: 'Log in',
        subtitle: 'Welcome back, explorer.',
        submitLabel: 'Log in',
        fields: [
          { name: 'username', label: 'Username', type: 'text', autocomplete: 'username', maxlength: 20 },
          { name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password', maxlength: 128 },
        ],
        footer,
        onSubmit: async (values) => {
          setUser(await login(values));
          navigate('/dashboard');
        },
      }),
    ])
  );
}
