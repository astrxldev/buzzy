export interface GuideSearchDependencies<T> {
  adminCheck: () => Promise<unknown>;
  search: (search: string, includeHidden: boolean) => Promise<T[]>;
}

export async function searchGuideService<T>(
  search: string,
  requestHidden: boolean,
  dependencies: GuideSearchDependencies<T>,
) {
  const includeHidden =
    requestHidden && Boolean(await dependencies.adminCheck());
  return dependencies.search(search, includeHidden);
}
