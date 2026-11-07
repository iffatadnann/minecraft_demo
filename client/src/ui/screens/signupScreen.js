import { el } from '../dom.js';
import { navBar } from '../components/navBar.js';
import { authForm } from '../components/authForm.js';
import { signup } from '../../api/authApi.js';
import { setUser } from '../../app/session.js';
import { navigate } from '../../app/router.js';

export function signupScreen(root) {
  const footer = el('p', { class: 'muted' }, [
    'Already have an account? ',
    el('a', { href: '#/login', text: 'Log in' }),
  ]);

  root.append(
    navBar(),
    el('main', { class: 'page' }, [
      authForm({
        title: 'Sign up',
        subtitle: 'Create an account to save your worlds.',
        submitLabel: 'Create account',
        fields: [
          { name: 'username', label: 'Username (3-20 letters, numbers, _)', type: 'text', autocomplete: 'username', maxlength: 20 },
          { name: 'email', label: 'Email', type: 'email', autocomplete: 'email', maxlength: 254 },
          { name: 'password', label: 'Password (8+ characters)', type: 'password', autocomplete: 'new-password', maxlength: 128 },
        ],
        footer,
        onSubmit: async (values) => {
          setUser(await signup(values));
          navigate('/dashboard');
        },
      }),
    ])
  );
}