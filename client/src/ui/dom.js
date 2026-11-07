// Tiny helper for building DOM elements.
// Strings are added as plain text (never as HTML), which prevents XSS.
// Usage: el('a', { class: 'btn', href: '#/login', text: 'Log in' })
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === null || value === undefined || value === false) continue;

    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2), value); // onsubmit -> "submit"
    } else node.setAttribute(key, value === true ? '' : value);
  }

  for (const child of [children].flat()) {
    if (child !== null && child !== undefined && child !== false) {
      node.append(child);
    }
  }

  return node;
}