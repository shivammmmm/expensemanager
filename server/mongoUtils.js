export function parseOrderParam(orderBy) {
  // orderBy like "-expense_date" meaning desc by that field.
  if (!orderBy || typeof orderBy !== 'string') return null;
  const desc = orderBy.startsWith('-');
  const field = desc ? orderBy.slice(1) : orderBy;
  return { field, desc };
}

export function sortByFieldForArray(arr, { field, desc }) {
  // fallback for in-memory (should be unused after migration)
  const factor = desc ? -1 : 1;
  return [...arr].sort((a, b) => {
    const av = a[field];
    const bv = b[field];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor;
    return String(av).localeCompare(String(bv)) * factor;
  });
}

export function mongooseSort(orderBy) {
  const parsed = parseOrderParam(orderBy);
  if (!parsed) return null;
  return { [parsed.field]: parsed.desc ? -1 : 1 };
}

