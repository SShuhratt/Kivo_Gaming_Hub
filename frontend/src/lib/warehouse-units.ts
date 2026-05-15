export const WAREHOUSE_UNITS = [
  'dona',
  'kg',
  'g',
  'l',
  'ml',
  'quti',
  'qadoq',
  'shisha',
  'm',
  'idish',
] as const;

export type WarehouseUnit = (typeof WAREHOUSE_UNITS)[number];

export const WAREHOUSE_UNIT_LABELS_UZ: Record<WarehouseUnit, string> = {
  dona: 'dona',
  kg: 'kg/kilogramm',
  g: 'g/gramm',
  l: 'l/litr',
  ml: 'millilitr',
  quti: 'quti',
  qadoq: 'qadoq',
  shisha: 'shisha',
  m: 'm/metr',
  idish: 'idish',
};

const WAREHOUSE_UNIT_ALIASES: Record<string, WarehouseUnit> = {
  dona: 'dona',
  piece: 'dona',
  kg: 'kg',
  kilogramm: 'kg',
  'kg/kilogramm': 'kg',
  'kg / kilogramm': 'kg',
  g: 'g',
  gram: 'g',
  gramm: 'g',
  'g/gramm': 'g',
  'g / gramm': 'g',
  l: 'l',
  liter: 'l',
  litr: 'l',
  'l/litr': 'l',
  'l / litr': 'l',
  ml: 'ml',
  millilitr: 'ml',
  'ml/millilitr': 'ml',
  'ml / millilitr': 'ml',
  quti: 'quti',
  box: 'quti',
  qadoq: 'qadoq',
  pack: 'qadoq',
  shisha: 'shisha',
  bottle: 'shisha',
  m: 'm',
  metr: 'm',
  meter: 'm',
  'm/metr': 'm',
  'm / metr': 'm',
  idish: 'idish',
  container: 'idish',
  bag: 'qadoq',
  xalta: 'qadoq',
};

export function normalizeWarehouseUnit(unit: string | null | undefined): WarehouseUnit | null {
  if (!unit) {
    return null;
  }

  const normalized = unit.trim().toLowerCase();

  return WAREHOUSE_UNIT_ALIASES[normalized] ?? null;
}

export function getWarehouseUnitLabel(unit: WarehouseUnit | string | null | undefined): string {
  if (!unit) {
    return '-';
  }

  const normalized = normalizeWarehouseUnit(unit);

  if (!normalized) {
    return unit;
  }

  return WAREHOUSE_UNIT_LABELS_UZ[normalized];
}

export const WAREHOUSE_UNIT_OPTIONS = WAREHOUSE_UNITS.map((value) => ({
  value,
  label: WAREHOUSE_UNIT_LABELS_UZ[value],
}));
