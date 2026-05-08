import type { ServiceItem } from '@/context/dashboard-context';

const exactUzTerminologyMap: Record<string, string> = {
  'Dynamic bundle pricing': 'Dinamik xizmat narxi',
  'Assets can only be linked to base services, not bundles.': 'Jihozlar faqat asosiy xizmatlarga biriktiriladi.',
  'The selected bundle is invalid.': 'Tanlangan xizmat yaroqsiz.',
};

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

export function formatUzServiceTerminology(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const exactMatch = exactUzTerminologyMap[value];

  if (exactMatch) {
    return exactMatch;
  }

  return value
    .replace(/xizmatlar to['‘’`ʻ]?plami/gi, 'xizmat')
    .replace(/to['‘’`ʻ]?plam/gi, 'xizmat')
    .replace(/\bBundles\b/g, 'Xizmatlar')
    .replace(/\bbundles\b/g, 'xizmatlar')
    .replace(/\bBundle\b/g, 'Xizmat')
    .replace(/\bbundle\b/g, 'xizmat');
}

export function formatUzPricingLabel(label: string | null | undefined): string {
  if (!label) {
    return 'Xizmat narxi';
  }

  if (label === 'Service pricing') {
    return 'Xizmat narxi';
  }

  return formatUzServiceTerminology(label);
}

export function formatUzErrorMessage(message: string | null | undefined): string {
  if (!message) {
    return '';
  }

  const directMessage = exactUzTerminologyMap[message];

  if (directMessage) {
    return directMessage;
  }

  const bundleBookingMatch = message.match(/^(.+?) is a bundle and cannot be booked directly\.$/);

  if (bundleBookingMatch) {
    return `${bundleBookingMatch[1]} to'g'ridan-to'g'ri band qilinmaydi.`;
  }

  return formatUzServiceTerminology(message);
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
