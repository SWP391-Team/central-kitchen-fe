export const formatProductWithUnit = (
  productName?: string | null,
  unitName?: string | null
): string => {
  const name = (productName || '').trim();
  if (!name) return '-';

  const unit = (unitName || '').trim();
  if (!unit) return name;

  return `${name} (${unit.toUpperCase()})`;
};
