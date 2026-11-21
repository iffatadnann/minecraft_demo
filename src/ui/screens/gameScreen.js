import { el } from '../dom.js';
import { Game } from '../../game/Game.js';
import { GAME_NAME } from '../../config/appInfo.js';
import { ApiError } from '../../api/httpClient.js';
import { fetchWorld, saveWorld } from '../../api/WorldsApi.js';
import { setUser } from '../../app/session.js';
import { navigate } from '../../app/router.js';

// Loads one saved world (from #/game?world=<id>) and mounts the 3D game.
export function gameScreen(root) {
  const worldId = new URLSearchParams(window.location.hash.split('?')[1] ?? '').get('world');

  let game = null;
  let disposed = false;

  const canvasWrap = el('div', { class: 'game-canvas' });
  const title = el('h1', { text: GAME_NAME });
  const message = el('p', { class: 'muted', role: 'status', text: 'Loading world...' });
  const playButton = el('button', { class: 'btn btn-primary', type: 'button', text: 'Click to play', disabled: true });
  const retryButton = el('button', { class: 'btn', type: 'button', text: 'Try again' });
  retryButton.hidden = true;
  const saveStatus = el('div', { class: 'save-status', role: 'status' });

  const overlay = el('div', { class: 'game-overlay' }, [
    el('div', { class: 'panel game-note' }, [
      title,
      message,
      playButton,
      retryButton,
      el('p', { class: 'muted', text: 'WASD move · Space jump · Shift sprint · Mouse look · 1-9 select slot · Esc pause' }),
      el('a', { class: 'btn', href: '#/dashboard', text: '← Dashboard' }),
    ]),
  ]);
  const crosshair = el('div', { class: 'crosshair', 'aria-hidden': 'true' });

  root.append(el('main', { class: 'game-view' }, [canvasWrap, crosshair, saveStatus, overlay]));

  function showStatus(status, error) {
    if (disposed) return;
    if (status === 'saving') saveStatus.textContent = 'Saving...';
    else if (status === 'saved') saveStatus.textContent = 'Saved';
    else if (error instanceof ApiError && error.status === 401) {
      saveStatus.textContent = 'Session expired. Log in again to keep saving.';
    } else saveStatus.textContent = 'Save failed. Will retry...';
  }

  async function load() {
    if (!worldId) {
      message.textContent = 'No world selected. Choose one from the dashboard.';
      return;
    }

    message.textContent = 'Loading world...';
    retryButton.hidden = true;
    playButton.disabled = true;
    try {
      const saved = await fetchWorld(worldId);
      if (disposed) return;

      game = new Game(canvasWrap, {
        saved,
        saveWorld: (payload, options) => saveWorld(worldId, payload, options),
        onSaveStatus: showStatus,
        onLockChange: (locked) => overlay.classList.toggle('is-hidden', locked),
      });
      title.textContent = saved.world.name; // text only, no HTML
      message.textContent = 'Your world is ready.';
      playButton.disabled = false;
    } catch (error) {
      if (disposed) return;
      if (error instanceof ApiError && error.status === 401) {
        setUser(null);
        navigate('/login');
        return;
      }
      console.error(error);
      message.textContent =
        error instanceof ApiError && error.status === 404
          ? 'World not found.'
          : error instanceof ApiError
            ? error.message
            : error.message || 'Could not start the game.';
      retryButton.hidden = error instanceof ApiError && error.status === 404;
    }
  }

  playButton.addEventListener('click', () => game?.requestLock());
  retryButton.addEventListener('click', load);
  load();

  // The router calls this when the user leaves the page
  return () => {
    disposed = true;
    game?.dispose(); // saves one last time
  };
}