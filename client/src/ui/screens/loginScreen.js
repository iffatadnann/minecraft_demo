import { el } from '../dom.js';
import { navBar } from '../components/navBar.js';
import { authForm } from '../components/authForm.js';
import { login } from '../../api/authApi.js';
import { setUser } from '../../app/session.js';
import { navigate } from '../../app/router.js';

export function loginScreen(root) {
  const footer = el('p', { class: 'muted' }, [
    'New here? ',
    el('a', { href: '#/signup', text: 'Create an account' }),
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