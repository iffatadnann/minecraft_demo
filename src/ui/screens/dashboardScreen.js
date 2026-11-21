import { el } from '../dom.js';
import { navBar } from '../components/navBar.js';
import { ApiError } from '../../api/httpClient.js';
import { fetchStats } from '../../api/statsApi.js';
import { listWorlds, createWorld, renameWorld, deleteWorld } from '../../api/WorldsApi.js';
import { getUser, setUser } from '../../app/session.js';
import { navigate } from '../../app/router.js';

function formatTime(seconds) {
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
}

// Turns any error into a short message for the user
function messageFor(error) {
  if (error instanceof ApiError) return error.details?.[0]?.message ?? error.message;
  return 'Something went wrong. Please try again.';
}

export function dashboardScreen(root) {
  let disposed = false; // stops late responses from touching a page we already left
  let worlds = [];
  const busy = new Set(); // world ids with a request in progress

  // If the session expired, go back to the login page
  function handleAuthError(error) {
    if (error instanceof ApiError && error.status === 401) {
      setUser(null);
      navigate('/login');
      return true;
    }
    return false;
  }

  // ---------- Stats ----------
  const statsBox = el('div', { class: 'stats-grid' });

  function renderStats(stats) {
    const cards = [
      ['Blocks placed', stats.blocksPlaced.toLocaleString()],
      ['Blocks mined', stats.blocksMined.toLocaleString()],
      ['Distance travelled', `${Math.round(stats.distanceTravelled).toLocaleString()} blocks`],
      ['Play time', formatTime(stats.playTimeSeconds)],
    ];
    statsBox.replaceChildren(
      ...cards.map(([label, value]) =>
        el('div', { class: 'panel stat-card' }, [
          el('div', { class: 'stat-value', text: value }),
          el('div', { class: 'stat-label muted', text: label }),
        ])
      )
    );
  }

  function renderStatsMessage(text, retry) {
    statsBox.replaceChildren(
      el('div', { class: 'panel status-box' }, [
        el('p', { class: 'muted', text }),
        retry && el('button', { class: 'btn', type: 'button', text: 'Try again', onclick: retry }),
      ])
    );
  }

  async function loadStats() {
    renderStatsMessage('Loading stats...');
    try {
      const stats = await fetchStats();
      if (!disposed) renderStats(stats);
    } catch (error) {
      if (disposed || handleAuthError(error)) return;
      renderStatsMessage(messageFor(error), loadStats);
    }
  }

  // ---------- Worlds ----------
  const worldsBox = el('div', { class: 'world-list' });
  const createError = el('p', { class: 'form-status', role: 'alert' });
  const createInput = el('input', {
    id: 'new-world-name',
    name: 'name',
    type: 'text',
    maxlength: 40,
    placeholder: 'New world name',
    'aria-label': 'New world name',
    required: true,
  });
  const createButton = el('button', { class: 'btn btn-primary', type: 'submit', text: 'Create world' });

  function renderWorldsMessage(text, retry) {
    worldsBox.replaceChildren(
      el('div', { class: 'panel status-box' }, [
        el('p', { class: 'muted', text }),
        retry && el('button', { class: 'btn', type: 'button', text: 'Try again', onclick: retry }),
      ])
    );
  }

  function renderWorlds() {
    if (worlds.length === 0) {
      worldsBox.replaceChildren(
        el('p', { class: 'empty-state', text: 'No worlds yet. Create your first one above.' })
      );
      return;
    }

    worldsBox.replaceChildren(
      ...worlds.map((world) => {
        const isBusy = busy.has(world.id);
        return el('div', { class: 'panel world-row' }, [
          el('div', { class: 'world-info' }, [
            el('div', { class: 'world-name', text: world.name }), // text only, no HTML
            el('div', {
              class: 'muted world-meta',
              text:
                `Played ${new Date(world.lastPlayedAt).toLocaleDateString()} · ` +
                `${world.blocksMined} mined · ${world.blocksPlaced} placed · ${formatTime(world.playTimeSeconds)}`,
            }),
          ]),
          el('div', { class: 'world-actions' }, [
            el('a', {
              class: 'btn btn-primary',
              href: `#/game?world=${encodeURIComponent(world.id)}`,
              text: 'Play',
            }),
            el('button', {
              class: 'btn',
              type: 'button',
              text: 'Rename',
              disabled: isBusy,
              onclick: () => handleRename(world),
            }),
            el('button', {
              class: 'btn',
              type: 'button',
              text: 'Delete',
              disabled: isBusy,
              onclick: () => handleDelete(world),
            }),
          ]),
        ]);
      })
    );
  }

  async function loadWorlds() {
    renderWorldsMessage('Loading worlds...');
    try {
      const result = await listWorlds();
      if (disposed) return;
      worlds = result;
      renderWorlds();
    } catch (error) {
      if (disposed || handleAuthError(error)) return;
      renderWorldsMessage(messageFor(error), loadWorlds);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const name = createInput.value.trim();
    if (!name || createButton.disabled) return;

    createError.textContent = '';
    createButton.disabled = true;
    createButton.textContent = 'Creating...';
    try {
      const world = await createWorld(name);
      if (disposed) return;
      worlds = [world, ...worlds];
      createInput.value = '';
      renderWorlds();
    } catch (error) {
      if (disposed || handleAuthError(error)) return;
      createError.textContent = messageFor(error); // e.g. the 10-world limit
    } finally {
      createButton.disabled = false;
      createButton.textContent = 'Create world';
    }
  }

  async function handleRename(world) {
    const input = window.prompt('New name for this world:', world.name);
    const name = input?.trim();
    if (!name || name === world.name) return; // cancelled or unchanged

    busy.add(world.id);
    renderWorlds();
    try {
      const updated = await renameWorld(world.id, name);
      if (disposed) return;
      worlds = worlds.map((w) => (w.id === world.id ? updated : w));
    } catch (error) {
      if (disposed || handleAuthError(error)) return;
      window.alert(messageFor(error));
    } finally {
      busy.delete(world.id);
      if (!disposed) renderWorlds();
    }
  }

  async function handleDelete(world) {
    if (!window.confirm(`Delete "${world.name}"? This cannot be undone.`)) return;

    busy.add(world.id);
    renderWorlds();
    try {
      await deleteWorld(world.id);
      if (disposed) return;
      worlds = worlds.filter((w) => w.id !== world.id);
    } catch (error) {
      if (disposed || handleAuthError(error)) return;
      if (error instanceof ApiError && error.status === 404) {
        worlds = worlds.filter((w) => w.id !== world.id); // already gone
      } else {
        window.alert(messageFor(error));
      }
    } finally {
      busy.delete(world.id);
      if (!disposed) {
        renderWorlds();
        loadStats(); // lifetime totals do not change on delete, but keep the page fresh
      }
    }
  }

  // ---------- Page ----------
  const user = getUser();
  root.append(
    navBar(),
    el('main', { class: 'page' }, [
      el('div', { class: 'page-head' }, [el('h1', { text: `Welcome, ${user?.username ?? 'Explorer'}!` })]),

      el('h2', { text: 'Player stats' }),
      statsBox,

      el('h2', { text: 'Your worlds' }),
      el('form', { class: 'create-form', onsubmit: handleCreate }, [createInput, createButton]),
      createError,
      worldsBox,
    ])
  );

  loadStats();
  loadWorlds();

  // The router calls this when the user leaves the page
  return () => {
    disposed = true;
  };
}