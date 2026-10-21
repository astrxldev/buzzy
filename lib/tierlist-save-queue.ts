export type SaveQueueResult<T, R> = {
  generation: number;
  value: T;
  result: R;
};

type Waiter<R> = {
  generation: number;
  resolve: (result: R) => void;
  reject: (error: unknown) => void;
};

/** Serializes writes while coalescing edits made during an in-flight write. */
export class TierlistSaveQueue<T, R> {
  private generation = 0;
  private desired: { generation: number; value: T } | undefined;
  private writing = false;
  private disposed = false;
  private waiters: Waiter<R>[] = [];

  constructor(
    private readonly write: (value: T) => Promise<R>,
    private readonly onSuccess: (saved: SaveQueueResult<T, R>) => void,
    private readonly onPendingChange: (pending: boolean) => void = () => {},
    private readonly onFailure: (error: unknown, value: T) => void = () => {},
  ) {}

  get isPending() {
    return this.writing;
  }

  enqueue(value: T): Promise<R> {
    if (this.disposed)
      return Promise.reject(new Error("Save queue is disposed"));
    const generation = ++this.generation;
    this.desired = { generation, value };
    this.onPendingChange(true);
    const promise = new Promise<R>((resolve, reject) => {
      this.waiters.push({ generation, resolve, reject });
    });
    this.flush();
    return promise;
  }

  retry(): Promise<R> {
    if (!this.desired)
      return Promise.reject(new Error("No failed save to retry"));
    return this.enqueue(this.desired.value);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.desired = undefined;
    for (const waiter of this.waiters)
      waiter.reject(new Error("Save queue disposed"));
    this.waiters = [];
    this.onPendingChange(false);
  }

  private flush() {
    if (this.writing || !this.desired) return;
    const attempted = this.desired;
    this.writing = true;
    this.onPendingChange(true);
    void Promise.resolve()
      .then(() => this.write(attempted.value))
      .then(
        (result) => {
          if (this.disposed) return;
          this.onSuccess({ ...attempted, result });
          this.waiters = this.waiters.filter((waiter) => {
            if (waiter.generation > attempted.generation) return true;
            waiter.resolve(result);
            return false;
          });
          if (this.desired?.generation === attempted.generation)
            this.desired = undefined;
          this.writing = false;
          this.onPendingChange(false);
          this.flush();
        },
        (error: unknown) => {
          if (this.disposed) return;
          this.onFailure(error, attempted.value);
          this.waiters = this.waiters.filter((waiter) => {
            if (waiter.generation > attempted.generation) return true;
            waiter.reject(error);
            return false;
          });
          this.writing = false;
          this.onPendingChange(
            !!this.desired && this.desired.generation > attempted.generation,
          );
          // Continue newer work; otherwise keep failed intent for explicit retry.
          if (this.desired && this.desired.generation > attempted.generation)
            this.flush();
        },
      );
  }
}
