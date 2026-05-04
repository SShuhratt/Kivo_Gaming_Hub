export type AssetCategoryKind = 'computer' | 'console' | 'custom';

export function getAssetCategoryKind(category: string | null | undefined): AssetCategoryKind {
  const normalized = category?.trim().toLowerCase() ?? '';

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
  const normalized = category?.trim();

  return normalized && normalized.length > 0 ? normalized : 'Jihoz';
}
