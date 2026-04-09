/**
 * A simple async semaphore to limit the number of concurrent executions.
 * This is crucial for handling 60+ simultaneous students without crashing the server.
 */
export class Semaphore {
  private activeCount = 0;
  private queue: (() => void)[] = [];

  constructor(private limit: number) {}

  async acquire(): Promise<() => void> {
    if (this.activeCount < this.limit) {
      this.activeCount++;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.activeCount++;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.activeCount--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    }
  }

  /**
   * Run a task with the semaphore limit.
   */
  async run<T>(task: () => Promise<T>): Promise<T> {
    const release = await this.acquire();
    try {
      return await task();
    } finally {
      release();
    }
  }
}
