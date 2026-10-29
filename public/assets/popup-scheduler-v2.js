/* Foreground-time scheduler, independent of DOM and testable with a fake clock. */
(() => {
  "use strict";
  class PopupScheduler {
    constructor({
      config,
      canOpen,
      onOpen,
      getCount = () => 0,
      setCount = () => {},
      now = () => Date.now(),
      setTimer = (callback, delay) => window.setTimeout(callback, delay),
      clearTimer = (timer) => window.clearTimeout(timer),
    }) {
      Object.assign(this, {
        config,
        canOpen,
        onOpen,
        setCount,
        now,
        setTimer,
        clearTimer,
      });
      this.count = Math.max(0, Number(getCount()) || 0);
      this.remaining = config.initialDelayMs;
      this.limit =
        config.maxDisplaysPerSession === null
          ? Infinity
          : Math.max(0, config.maxDisplaysPerSession);
      this.timer = null;
      this.awaitingClose = false;
      this.stopped = false;
    }
    eligible() {
      return !this.stopped && this.count < this.limit;
    }
    sync() {
      if (!this.eligible() || this.awaitingClose || !this.canOpen()) {
        this.pause();
        return;
      }
      if (this.timer !== null) return;
      this.deadline = this.now() + this.remaining;
      this.timer = this.setTimer(() => {
        this.timer = null;
        this.remaining = 0;
        this.requestOpen("timer");
      }, this.remaining);
    }
    pause() {
      if (this.timer === null) return;
      this.remaining = Math.max(0, this.deadline - this.now());
      this.clearTimer(this.timer);
      this.timer = null;
    }
    requestOpen(source = "manual") {
      if (!this.eligible() || this.awaitingClose || !this.canOpen()) {
        this.pause();
        return false;
      }
      this.pause();
      this.awaitingClose = true;
      this.count++;
      this.setCount(this.count);
      this.onOpen(source);
      return true;
    }
    closed() {
      if (!this.awaitingClose) return;
      this.awaitingClose = false;
      if (!this.config.repeatEnabled) {
        this.stop();
        return;
      }
      this.remaining = this.config.repeatDelayMs;
      this.sync();
    }
    stop() {
      this.pause();
      this.stopped = true;
    }
  }
  window.MantrasPopupScheduler = PopupScheduler;
  window.MantrasCampaign = {
    read(endsAt, now = Date.now()) {
      const end = Date.parse(endsAt);
      if (!Number.isFinite(end) || end <= now) return null;
      const totalSeconds = Math.ceil((end - now) / 1000);
      return {
        totalSeconds,
        hours: String(Math.floor(totalSeconds / 3600)).padStart(2, "0"),
        minutes: String(Math.floor((totalSeconds % 3600) / 60)).padStart(
          2,
          "0",
        ),
        seconds: String(totalSeconds % 60).padStart(2, "0"),
      };
    },
  };
})();
