function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const IMPORT_QUEUE_CONCURRENCY = positiveInt(process.env.IMPORT_QUEUE_CONCURRENCY, 2);
export const IMPORT_QUEUE_CAPACITY = positiveInt(process.env.IMPORT_QUEUE_CAPACITY, 120);
export const IMPORT_USER_MAX_ZIPS = positiveInt(process.env.IMPORT_USER_MAX_ZIPS, 12);

export class ImportQueue {
  constructor({ concurrency = IMPORT_QUEUE_CONCURRENCY, capacity = IMPORT_QUEUE_CAPACITY } = {}) {
    this.concurrency = positiveInt(concurrency, IMPORT_QUEUE_CONCURRENCY);
    this.capacity = positiveInt(capacity, IMPORT_QUEUE_CAPACITY);
    this.running = 0;
    this.queue = [];
    this.nextId = 1;
  }

  get activeCount() {
    return this.running;
  }

  get pendingCount() {
    return this.queue.length;
  }

  get totalCount() {
    return this.running + this.queue.length;
  }

  canAccept() {
    return this.totalCount < this.capacity;
  }

  enqueue(task) {
    if (this.totalCount >= this.capacity) {
      const error = new Error("Import queue is full");
      error.code = "IMPORT_QUEUE_FULL";
      throw error;
    }

    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.queue.push({ id, task, resolve, reject });
      this.drain();
    });
  }

  drain() {
    while (this.running < this.concurrency && this.queue.length > 0) {
      const item = this.queue.shift();
      this.running += 1;
      Promise.resolve()
        .then(() => item.task({
          id: item.id,
          activeCount: this.running,
          pendingCount: this.queue.length,
        }))
        .then(item.resolve, item.reject)
        .finally(() => {
          this.running -= 1;
          this.drain();
        });
    }
  }
}

const globalForImportQueue = globalThis;

export const importQueue =
  globalForImportQueue.__subHdcImportQueue ||
  new ImportQueue({
    concurrency: IMPORT_QUEUE_CONCURRENCY,
    capacity: IMPORT_QUEUE_CAPACITY,
  });

globalForImportQueue.__subHdcImportQueue = importQueue;
