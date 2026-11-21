import { el } from '../dom.js';
import { ApiError } from '../../api/httpClient.js';

// Shared form for login and signup.
// onSubmit(values) does the real work; if it throws, the error is shown here.
export function authForm({ title, subtitle, fields, submitLabel, footer, onSubmit }) {
  const status = el('p', { class: 'form-status', role: 'alert' });
  const button = el('button', { class: 'btn btn-primary', type: 'submit', text: submitLabel });

  // One empty error line under each input
  const fieldErrors = {};
  for (const field of fields) fieldErrors[field.name] = el('p', { class: 'field-error' });

  function showError(error) {
    status.textContent = '';
    if (error instanceof ApiError && Array.isArray(error.details)) {
      for (const { field, message } of error.details) {
        if (fieldErrors[field]) fieldErrors[field].textContent = message;
      }
      status.textContent = 'Please fix the highlighted fields.';
    } else {
      status.textContent =
        error instanceof ApiError ? error.message : 'Something went wrong. Please try again.';
    }
  }

  const form = el(
    'form',
    {
      class: 'auth-form',
      novalidate: true, // the server's messages are shown instead of the browser's
      onsubmit: async (event) => {
        event.preventDefault();
        if (button.disabled) return; // ignore double submits

        status.textContent = '';
        for (const p of Object.values(fieldErrors)) p.textContent = '';

        const values = Object.fromEntries(new FormData(form));
        button.disabled = true;
        button.textContent = 'Working...';
        try {
          await onSubmit(values); // on success the screen navigates away
        } catch (error) {
          showError(error);
          const password = form.elements.namedItem('password');
          if (password) password.value = ''; // never leave a password sitting in the form
        } finally {
          button.disabled = false;
          button.textContent = submitLabel;
        }
      },
    },
    [
      ...fields.map((field) =>
        el('div', { class: 'field' }, [
          el('label', { for: `field-${field.name}`, text: field.label }),
          el('input', {
            id: `field-${field.name}`,
            name: field.name,
            type: field.type,
            autocomplete: field.autocomplete,
            maxlength: field.maxlength,
            required: true,
          }),
          fieldErrors[field.name],
        ])
      ),
      button,
      status,
    ]
  );

  return el('section', { class: 'panel auth-panel' }, [
    el('h1', { text: title }),
    el('p', { class: 'muted', text: subtitle }),
    form,
    footer,
  ]);
}