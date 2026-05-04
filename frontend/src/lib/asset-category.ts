export type AssetCategoryKind = 'computer' | 'console' | 'custom';

export function normalizeAssetCategoryValue(category: string | null | undefined): string {
  return category?.trim() ?? '';
}

export function collectUniqueAssetCategories(categories: Array<string | null | undefined>): string[] {
  const byKey = new Map<string, string>();

  for (const value of categories) {
    const normalized = normalizeAssetCategoryValue(value);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (!byKey.has(key)) {
      byKey.set(key, normalized);
    }
  }

  return Array.from(byKey.values()).sort((left, right) => left.localeCompare(right));
}

export function getAssetCategoryKind(category: string | null | undefined): AssetCategoryKind {
  const normalized = normalizeAssetCategoryValue(category).toLowerCase();

  if (!normalized) {
    return 'custom';
  }

  if (/\b(ps|playstation|xbox|console|switch|nintendo)\b/.test(normalized)) {
    return 'console';
  }

  if (/\b(computer|pc|desktop|laptop|monitor|mac)\b/.test(normalized)) {
    return 'computer';
  }

  return 'custom';
}

export function formatAssetCategoryLabel(category: string | null | undefined): string {
  const normalized = normalizeAssetCategoryValue(category);

  return normalized && normalized.length > 0 ? normalized : 'Jihoz';
}
