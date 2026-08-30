import { type OrderItem, plannedOrderUpdates } from "./order";

export interface ReorderDependencies {
  adminCheck: () => Promise<unknown>;
  transaction: (
    callback: (repository: {
      list: () => Promise<OrderItem[]>;
      update: (id: string, order: number) => Promise<void>;
    }) => Promise<void>,
  ) => Promise<void>;
  afterReorder: () => Promise<void> | void;
}

export async function reorderService(
  activeId: string,
  ids: readonly string[],
  staleMessage: string,
  dependencies: ReorderDependencies,
) {
  if (!(await dependencies.adminCheck())) throw "Unauthorized";

  await dependencies.transaction(async (repository) => {
    const updates = plannedOrderUpdates(
      await repository.list(),
      ids,
      activeId,
      staleMessage,
    );
    for (const update of updates) {
      await repository.update(update.id, update.order);
    }
  });

  await dependencies.afterReorder();
}
