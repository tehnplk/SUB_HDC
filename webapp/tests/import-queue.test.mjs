import assert from "node:assert/strict";
import test from "node:test";

import { IMPORT_QUEUE_CAPACITY, IMPORT_USER_MAX_ZIPS, ImportQueue } from "../lib/import-queue.mjs";

test("import queue supports 10 users with 12 queued ZIP imports each", () => {
  assert.equal(IMPORT_USER_MAX_ZIPS, 12);
  assert.equal(IMPORT_QUEUE_CAPACITY, 120);
});

test("import queue limits active work while accepting queued jobs", async () => {
  const queue = new ImportQueue({ concurrency: 2, capacity: 4 });
  let running = 0;
  let peakRunning = 0;

  const jobs = Array.from({ length: 4 }, () =>
    queue.enqueue(async () => {
      running += 1;
      peakRunning = Math.max(peakRunning, running);
      await new Promise((resolve) => setTimeout(resolve, 10));
      running -= 1;
      return "done";
    })
  );

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(queue.activeCount, 2);
  assert.equal(queue.pendingCount, 2);
  assert.equal(peakRunning, 2);
  assert.throws(() => queue.enqueue(async () => "overflow"), /Import queue is full/);

  assert.deepEqual(await Promise.all(jobs), ["done", "done", "done", "done"]);
  assert.equal(peakRunning, 2);
});
