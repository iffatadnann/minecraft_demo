import { el } from '../dom.js';
import { navBar } from '../components/navBar.js';

export function notFoundScreen(root) {
  root.append(
    navBar(),
    el('main', { class: 'page' }, [
      el('section', { class: 'panel auth-panel' }, [
        el('h1', { text: '404: Block not found' }),
        el('p', { class: 'muted', text: 'That page does not exist.' }),
        el('a', { class: 'btn btn-primary', href: '#/dashboard', text: 'Back to dashboard' }),
      ]),
    ])
  );
}