import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

/**
 * A small JSON file owned by the main process (recent vaults, UI storage).
 * Changes run one at a time and the value stays in memory, so simultaneous
 * IPC calls never lose each other's writes or race on the temporary file.
 */
export class JsonFile<T> {
  private value: T | undefined;
  private queue: Promise<unknown> = Promise.resolve();

  constructor(
    readonly file: string,
    private readonly fallback: () => T,
  ) {}

  read(): Promise<T> {
    return this.run(() => this.load());
  }

  /** Replaces the value with what `change` returns, then saves it. */
  update(change: (current: T) => T): Promise<T> {
    return this.run(async () => {
      const next = change(await this.load());
      await this.save(next);
      this.value = next;
      return next;
    });
  }

  private run<R>(task: () => Promise<R>): Promise<R> {
    const result = this.queue.then(task, task);
    this.queue = result.catch(() => undefined);
    return result;
  }

  private async load(): Promise<T> {
    if (this.value === undefined) {
      try {
        this.value = JSON.parse(await fs.readFile(this.file, 'utf8')) as T;
      } catch {
        this.value = this.fallback();
      }
    }
    return this.value;
  }

  private async save(value: T) {
    // The folder may have been deleted while the app runs (e.g. a settings reset).
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    const temp = `${this.file}.${randomUUID()}.tmp`;
    await fs.writeFile(temp, JSON.stringify(value, null, 2));
    await fs.rename(temp, this.file);
  }
}
