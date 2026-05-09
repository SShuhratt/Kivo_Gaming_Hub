export const WAREHOUSE_UNITS = [
  'piece',
  'kg',
  'gram',
  'liter',
  'ml',
  'box',
  'pack',
  'bottle',
  'meter',
  'container',
  'bag',
] as const;

export type WarehouseUnit = (typeof WAREHOUSE_UNITS)[number];

export const WAREHOUSE_UNIT_LABELS_UZ: Record<WarehouseUnit, string> = {
  piece: 'dona',
  kg: 'kg / kilogramm',
  gram: 'g / gramm',
  liter: 'l / litr',
  ml: 'ml / millilitr',
  box: 'quti',
  pack: 'qadoq',
  bottle: 'shisha',
  meter: 'm / metr',
  container: 'idish',
  bag: 'xalta',
};

export function getWarehouseUnitLabel(unit: WarehouseUnit | string | null | undefined): string {
  if (!unit) {
    return '-';
  }

  return WAREHOUSE_UNIT_LABELS_UZ[unit as WarehouseUnit] ?? unit;
}

export const WAREHOUSE_UNIT_OPTIONS = WAREHOUSE_UNITS.map((value) => ({
  value,
  label: WAREHOUSE_UNIT_LABELS_UZ[value],
}));
