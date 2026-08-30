export async function listFilesService<T>(dependencies: {
  adminCheck: () => Promise<unknown>;
  list: () => Promise<T[]>;
}) {
  if (!(await dependencies.adminCheck())) throw "Unauthorized";
  return dependencies.list();
}
