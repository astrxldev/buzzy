/** Keeps canonical reads current across invalidations and version switches. */
export function reconcileCanonicalStates<T extends { ref: string }>(
  canonical: T[],
  current: T[],
  protectedRefs: Set<string>,
): T[] {
  return [
    ...canonical.filter((entry) => !protectedRefs.has(entry.ref)),
    ...current.filter((entry) => protectedRefs.has(entry.ref)),
  ];
}

export function reconcileScopedStateWrite<T extends { ref: string }>(
  current: T[],
  ref: string,
  saved: T[],
): T[] {
  return [
    ...current.filter((entry) => entry.ref !== ref),
    ...saved.filter((entry) => entry.ref === ref),
  ];
}

export class TierlistCanonicalFetch<T> {
  private activeVersion: string | undefined;
  private disposed = false;
  private readonly requests = new Map<
    string,
    { generation: number; invalidated: boolean; inFlight: boolean }
  >();

  activate(version: string) {
    this.disposed = false;
    this.activeVersion = version;
  }

  setVersion(version: string) {
    if (this.activeVersion === version) return;
    this.activeVersion = version;
    const request = this.requests.get(version);
    if (request?.inFlight) request.invalidated = true;
  }

  invalidate(version: string) {
    const request = this.requests.get(version);
    if (request?.inFlight) request.invalidated = true;
  }

  fetch(
    version: string,
    load: () => Promise<T>,
    apply: (data: T) => void,
    onError: (error: unknown) => void,
    onSettled: () => void = () => {},
  ) {
    if (this.disposed || this.activeVersion !== version) return;
    let request = this.requests.get(version);
    if (request?.inFlight) {
      request.invalidated = true;
      return;
    }
    request ??= { generation: 0, invalidated: false, inFlight: false };
    request.inFlight = true;
    request.invalidated = false;
    const generation = ++request.generation;
    this.requests.set(version, request);

    void load()
      .then(
        (data) => {
          if (
            !this.disposed &&
            this.activeVersion === version &&
            request?.generation === generation &&
            !request.invalidated
          )
            apply(data);
        },
        (error: unknown) => {
          if (!this.disposed && this.activeVersion === version) onError(error);
        },
      )
      .finally(() => {
        if (request?.generation !== generation) return;
        request.inFlight = false;
        if (
          this.disposed ||
          this.activeVersion !== version ||
          !request.invalidated
        ) {
          if (this.activeVersion === version) onSettled();
          return;
        }
        request.invalidated = false;
        this.fetch(version, load, apply, onError, onSettled);
      });
  }

  dispose() {
    this.disposed = true;
    this.requests.clear();
  }
}
