import type { ServiceItem } from '@/context/dashboard-context';

export function normalizeServiceRequirementKey(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

export function getBaseServices(services: ServiceItem[]): ServiceItem[] {
  return services.filter((service) => !service.isBundle);
}

export function getBundleServices(services: ServiceItem[]): ServiceItem[] {
  return services.filter((service) => service.isBundle);
}

export function formatBundleRequirements(
  requirements: Record<string, number>,
  services: ServiceItem[],
): string {
  const baseServiceLookup = new Map(
    getBaseServices(services).map((service) => [normalizeServiceRequirementKey(service.name), service.name]),
  );

  return Object.entries(requirements)
    .map(([serviceKey, quantity]) => `${quantity} ${baseServiceLookup.get(serviceKey) ?? serviceKey}`)
    .join(' + ');
}

export function cartFulfillmentRatio(
  requirements: Record<string, number>,
  cartByServiceKey: Record<string, number>,
): number {
  const totalRequired = Object.values(requirements).reduce((sum, quantity) => sum + quantity, 0);

  if (totalRequired <= 0) {
    return 0;
  }

  const matched = Object.entries(requirements).reduce((sum, [serviceKey, requiredQuantity]) => {
    return sum + Math.min(cartByServiceKey[serviceKey] ?? 0, requiredQuantity);
  }, 0);

  return matched / totalRequired;
}
