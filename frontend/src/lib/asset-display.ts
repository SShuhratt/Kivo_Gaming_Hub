type AssetLike = {
  id: string | number | null;
  name: string | null;
  category?: string | null;
  serviceName?: string | null;
  roomName?: string | null;
  roomNumber?: string | null;
  assetOrder?: number | null;
};

export function resolveAssetServiceLabel(asset: AssetLike): string {
  return asset.serviceName?.trim() || asset.category?.trim() || 'Xizmat belgilanmagan';
}

export function resolveAssetRoomLabel(asset: AssetLike): string {
  return asset.roomName?.trim() || asset.roomNumber?.trim() || 'Xona N/A';
}

export function sortAssetsForDisplay<T extends AssetLike>(assets: T[]): T[] {
  return assets.slice().sort((left, right) => {
    const roomCompare = resolveAssetRoomLabel(left).localeCompare(resolveAssetRoomLabel(right));
    if (roomCompare !== 0) {
      return roomCompare;
    }

    const serviceCompare = resolveAssetServiceLabel(left).localeCompare(resolveAssetServiceLabel(right));
    if (serviceCompare !== 0) {
      return serviceCompare;
    }

    const leftOrder = left.assetOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.assetOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }

    const nameCompare = (left.name ?? '').localeCompare(right.name ?? '');
    if (nameCompare !== 0) {
      return nameCompare;
    }

    return String(left.id ?? '').localeCompare(String(right.id ?? ''));
  });
}

export function groupAssetsByService<T extends AssetLike>(assets: T[]) {
  const grouped = new Map<string, T[]>();

  for (const asset of sortAssetsForDisplay(assets)) {
    const serviceLabel = resolveAssetServiceLabel(asset);
    const current = grouped.get(serviceLabel);

    if (current) {
      current.push(asset);
      continue;
    }

    grouped.set(serviceLabel, [asset]);
  }

  return Array.from(grouped.entries()).map(([serviceName, serviceAssets]) => ({
    serviceName,
    assets: serviceAssets.map((asset, index) => ({
      ...asset,
      displayOrder: asset.assetOrder ?? index + 1,
    })),
  }));
}

export function matchesAssetSearch(
  asset: AssetLike,
  rawQuery: string,
): boolean {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return true;
  }

  return [
    asset.name ?? '',
    resolveAssetServiceLabel(asset),
    resolveAssetRoomLabel(asset),
    asset.assetOrder ? String(asset.assetOrder) : '',
  ].some((value) => value.toLowerCase().includes(query));
}
