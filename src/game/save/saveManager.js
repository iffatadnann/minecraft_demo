// Decides WHEN to save. It never touches the DOM or knows how data is sent.
// buildPayload() -> { payload, hasChanges, commit }   send(payload, { keepalive })
export class SaveManager {
  constructor({ buildPayload, send, onStatus, intervalMs = 30000 }) {
    this.buildPayload = buildPayload;
    this.send = send;
    this.onStatus = onStatus;
    this.saving = false;
    this.queued = false;
    this.timer = setInterval(() => this.saveNow(), intervalMs);
  }

  async saveNow({ keepalive = false } = {}) {
    if (this.saving) {
      this.queued = true; // run again right after the current save
      return;
    }

    const pending = this.buildPayload();
    if (!pending.hasChanges) return;

    this.saving = true;
    this.onStatus?.('saving');
    try {
      await this.send(pending.payload, { keepalive });
      pending.commit(); // only now do we remember it as saved
      this.onStatus?.('saved');
    } catch (error) {
      this.onStatus?.('error', error); // the next autosave tries again
    } finally {
      this.saving = false;
      if (this.queued) {
        this.queued = false;
        this.saveNow();
      }
    }
  }

  dispose() {
    clearInterval(this.timer);
  }
}
