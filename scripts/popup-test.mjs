import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const context = { window: {} };
vm.runInNewContext(
  await readFile(
    new URL("../public/assets/popup-scheduler-v2.js", import.meta.url),
    "utf8",
  ),
  context,
);
const { MantrasPopupScheduler: Scheduler, MantrasCampaign: campaign } =
  context.window;
function setup(overrides = {}, count = 0) {
  let time = 0,
    sequence = 0,
    available = true;
  const tasks = new Map(),
    opened = [];
  const engine = new Scheduler({
    config: {
      initialDelayMs: 6000,
      repeatDelayMs: 4000,
      repeatEnabled: true,
      maxDisplaysPerSession: 3,
      ...overrides,
    },
    getCount: () => count,
    setCount: (value) => {
      count = value;
    },
    canOpen: () => available,
    onOpen: () => opened.push(time),
    now: () => time,
    setTimer: (fn, delay) => {
      tasks.set(++sequence, { at: time + delay, fn });
      return sequence;
    },
    clearTimer: (id) => tasks.delete(id),
  });
  const tick = (ms) => {
    const end = time + ms;
    while (true) {
      const next = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > end) break;
      time = next[1].at;
      tasks.delete(next[0]);
      next[1].fn();
    }
    time = end;
  };
  return {
    engine,
    tick,
    tasks,
    opened,
    block(value) {
      available = !value;
      engine.sync();
    },
  };
}

const timed = setup();
timed.engine.sync();
timed.engine.sync();
assert.equal(
  timed.tasks.size,
  1,
  "repeated synchronization never duplicates timers",
);
timed.tick(5999);
assert.equal(timed.opened.length, 0);
timed.tick(1);
assert.deepEqual(timed.opened, [6000], "initial opening after six seconds");
timed.tick(10000);
assert.equal(
  timed.opened.length,
  1,
  "no overlapping popup while awaiting close",
);
assert.equal(
  timed.engine.requestOpen("exit"),
  false,
  "exit intent cannot duplicate an open modal",
);
timed.engine.closed();
timed.tick(3999);
assert.equal(timed.opened.length, 1);
timed.tick(1);
assert.equal(timed.opened[1], 20000, "repeat four seconds after closing");
timed.engine.closed();
timed.tick(4000);
assert.equal(timed.opened.length, 3);
timed.engine.closed();
timed.tick(60000);
assert.equal(timed.opened.length, 3, "session limit applies to all triggers");
const stored = setup({}, 3);
stored.engine.sync();
stored.tick(10000);
assert.equal(
  stored.opened.length,
  0,
  "saved session limit survives a page reload",
);

for (const reason of [
  "background tab",
  "another dialog",
  "playing video",
  "active form field",
]) {
  const paused = setup();
  paused.engine.sync();
  paused.tick(2000);
  paused.block(true);
  paused.tick(60000);
  assert.equal(paused.opened.length, 0, reason + " pauses foreground time");
  paused.block(false);
  paused.tick(3999);
  assert.equal(paused.opened.length, 0);
  paused.tick(1);
  assert.equal(paused.opened.length, 1, reason + " resumes remaining delay");
  paused.engine.closed();
  paused.tick(1000);
  paused.block(true);
  paused.tick(10000);
  paused.block(false);
  paused.tick(3000);
  assert.equal(paused.opened.length, 2, reason + " also pauses recurrence");
}
const stopped = setup();
stopped.engine.sync();
stopped.tick(2000);
stopped.engine.stop();
stopped.engine.sync();
stopped.tick(60000);
assert.equal(stopped.tasks.size, 0);
assert.equal(
  stopped.opened.length,
  0,
  "checkout / cleanup stops all scheduling",
);
const once = setup({ repeatEnabled: false });
once.engine.sync();
once.tick(6000);
once.engine.closed();
once.tick(60000);
assert.equal(once.opened.length, 1);
const unlimited = setup({ maxDisplaysPerSession: null });
unlimited.engine.sync();
unlimited.tick(6000);
for (let i = 0; i < 5; i++) {
  unlimited.engine.closed();
  unlimited.tick(4000);
}
assert.equal(
  unlimited.opened.length,
  6,
  "display cap is explicitly configurable",
);

const now = Date.parse("2026-10-29T12:00:00Z");
assert.equal(campaign.read(null, now), null);
assert.equal(campaign.read("not a date", now), null);
assert.equal(campaign.read("2026-10-29T11:00:00Z", now), null);
const deadline = "2026-10-29T13:02:03Z";
assert.deepEqual(JSON.parse(JSON.stringify(campaign.read(deadline, now))), {
  totalSeconds: 3723,
  hours: "01",
  minutes: "02",
  seconds: "03",
});
assert.equal(
  campaign.read(deadline, now + 1000).seconds,
  "02",
  "absolute campaign time advances, never resets per visit",
);
assert.equal(
  campaign.read(deadline, Date.parse(deadline)),
  null,
  "expired campaign becomes neutral",
);
console.log(
  "Popup/campaign OK: 6s / 4s, cap, pause/resume, conflicts, checkout stop, cleanup and absolute deadline.",
);
