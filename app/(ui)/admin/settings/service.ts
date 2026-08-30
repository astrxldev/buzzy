export interface SettingsDependencies {
  adminCheck: () => Promise<unknown>;
  persist: (value: boolean) => Promise<void>;
  afterPersist: (value: boolean) => Promise<void> | void;
}

export async function updateSettingService(
  value: boolean,
  dependencies: SettingsDependencies,
) {
  if (!(await dependencies.adminCheck())) throw "Unauthorized";
  await dependencies.persist(value);
  await dependencies.afterPersist(value);
}

export async function getSettingsService<T>(
  defaults: T,
  dependencies: {
    adminCheck: () => Promise<unknown>;
    read: () => Promise<T | undefined>;
  },
) {
  if (!(await dependencies.adminCheck())) throw "Unauthorized";
  return (await dependencies.read()) ?? defaults;
}
