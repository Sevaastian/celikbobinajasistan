export const wireSizes = Array.from({ length: 39 }, (_, index) => ((10 + index * 5) / 100).toFixed(2));

export function formatWireSize(value: string) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 3 }).format(Number(value)) + " mm";
}

export function wireOptions(...existing: (string | null | undefined)[]) {
  const sizes = new Map(wireSizes.map(size => [Number(size), size]));
  for (const value of existing) {
    if (value && !sizes.has(Number(value))) sizes.set(Number(value), value);
  }
  return [...sizes.entries()].sort(([a], [b]) => a - b).map(([, value]) => [value, formatWireSize(value)] as const);
}

export function wireValue(value: string | null | undefined) {
  if (!value) return "";
  return wireSizes.find(size => Number(size) === Number(value)) ?? value;
}

export function windingWires(record?: {
  wireDiameter: string | null;
  secondWireDiameter: string | null;
  additionalWireDiameters: string[] | null;
}) {
  // Older/imported records may not have the newer array column populated.
  return record ? [record.wireDiameter, record.secondWireDiameter, ...(record.additionalWireDiameters ?? [])] : [];
}

export function formatWindingWires(record: Parameters<typeof windingWires>[0]) {
  return windingWires(record).filter((size): size is string => !!size).map(formatWireSize).join(" + ");
}

export function formatWireList(sizes: (string | null | undefined)[] | null | undefined) {
  return (sizes ?? []).filter((size): size is string => !!size).map(formatWireSize).join(" + ");
}
