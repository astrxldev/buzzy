export interface HideGuideDependencies {
  adminCheck: () => Promise<unknown>;
  toggle: (id: string) => Promise<void>;
  afterToggle: () => Promise<void> | void;
}

export async function hideGuideService(
  id: string,
  dependencies: HideGuideDependencies,
) {
  if (!(await dependencies.adminCheck())) throw "Unauthorized";
  await dependencies.toggle(id);
  await dependencies.afterToggle();
}
