export type TypedFormDataShape = Record<
  string,
  string | Blob | File | (string | Blob | File)[]
>;

export interface TypedFormData<T extends TypedFormDataShape> {
  append<K extends keyof T>(
    key: K,
    value: T[K] extends unknown[] ? T[K][number] : T[K],
  ): void;

  set<K extends keyof T>(
    key: K,
    value: T[K] extends unknown[] ? T[K][number] : T[K],
  ): void;

  get<K extends keyof T>(
    key: K,
  ): T[K] extends unknown[] ? T[K][number] | null : T[K] | null;

  getAll<K extends keyof T>(key: K): T[K] extends unknown[] ? T[K] : T[K][];

  delete<K extends keyof T>(key: K): void;

  has<K extends keyof T>(key: K): boolean;

  /** underlying raw FormData */
  readonly raw: FormData;
}
