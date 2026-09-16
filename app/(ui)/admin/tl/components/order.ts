export const ORDER_STEP = 10;

export function reorderFlatItems<T extends { id: string }>(
  items: T[],
  activeId: string,
  overId: string,
) {
  if (activeId === overId) return items;

  const oldIndex = items.findIndex((item) => item.id === activeId);
  const newIndex = items.findIndex((item) => item.id === overId);
  if (oldIndex === -1 || newIndex === -1) return items;

  return arrayMove(items, oldIndex, newIndex);
}

export function midpointOrder(prev?: number, next?: number) {
  if (prev == null && next == null) return ORDER_STEP;
  if (prev == null) return next! - ORDER_STEP;
  if (next == null) return prev + ORDER_STEP;

  const middle = Math.floor((prev + next) / 2);
  if (middle === prev || middle === next) return null;
  return middle;
}

export function normalizedOrders(ids: string[]) {
  return ids.map((id, index) => ({
    id,
    order: (index + 1) * ORDER_STEP,
  }));
}

function arrayMove<T>(arr: T[], oldIndex: number, newIndex: number) {
  return arr.toSpliced(oldIndex, 1).toSpliced(newIndex, 0, arr[oldIndex]);
}
