function normalizeApiBaseUrl(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  let normalized = value.trim().replace(/\/$/, '');

  if (!normalized) {
    return null;
  }

  if (!normalized.endsWith('/api')) {
    normalized += '/api';
  }

  return normalized;
}

function resolveApiBaseUrls(): string[] {
  const candidates = [
    normalizeApiBaseUrl(process.env.NEXT_PUBLIC_API_URL),
    typeof window !== 'undefined' ? normalizeApiBaseUrl(window.location.origin) : null,
    normalizeApiBaseUrl('http://localhost:8000'),
  ].filter((value): value is string => Boolean(value));

  return Array.from(new Set(candidates));
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
};

type ApiMessageResponse = {
  message: string;
};

export type ApiUser = {
  id: number;
  name: string;
  gmail: string;
  phone_number: string;
};

export type DashboardBootstrapResponse = {
  user: ApiUser | null;
  summary: {
    active_sessions: number;
    total_session_devices: number;
    pending_sessions: number;
    rooms_count: number;
    sales_total_today: number;
  };
  services: Array<{
    id: string;
    room_id: number;
    room_number: string;
    items: string[];
    service_entries: Array<{
      id: string;
      backend_id: number;
      name: string;
      cost: number;
    }>;
    service_ids: number[];
  }>;
  tariffs: Array<{
    id: string;
    backend_id: number;
    name: string;
    hourly_price: number;
    category_prices: Array<{
      id: string;
      category: string;
      hourly_price: number;
    }>;
  }>;
  sales: Array<{
    id: string;
    room: string;
    base_price: number;
    start: string;
    end: string;
    service_cost: number;
    products: number;
    total: number;
    cash: number;
    terminal: number;
    click: number;
    payme: number;
    debt: number;
    paid: number;
    timestamp: number;
  }>;
  sessions: Array<{
    id: number;
    status: 'submitted' | 'debt_closed';
    session_status: 'active' | 'completed' | 'cancelled';
    start_time: string;
    end_time: string | null;
    ended_at: string | null;
    duration_minutes: number;
    requested_duration_hours: number | null;
    total_cost: number;
    debt_name: string | null;
    debt_phone_number: string | null;
    is_vip: boolean;
    tariff: {
      id: number | null;
      name: string | null;
      hourly_cost: number;
    };
    assets: Array<{
      id: number | null;
      category: string | null;
      room_id: number | null;
      room_number: string | null;
      hourly_price: number | null;
    }>;
    assets_count: number;
    room_label: string;
    trade_exists: boolean;
    can_delete: boolean;
  }>;
  companies: Array<{
    id: string;
    backend_id: number;
    name: string;
    products: Array<{
      id: string;
      backend_id: number;
      manufacturer: string;
      name: string;
      barcode: string;
      quantity: number;
      unit: 'bottle' | 'box' | 'container' | 'bag';
      purchase_price: number;
      selling_price: number;
    }>;
  }>;
  assets: Array<{
    id: string;
    backend_id: number;
    name: string;
    category: string;
    room_id: number;
    room_number: string;
    total_usage_duration_minutes: number;
    total_earned_money: number;
  }>;
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const apiBaseUrls = resolveApiBaseUrls();
  let lastError: unknown;

  for (const [index, baseUrl] of apiBaseUrls.entries()) {
    try {
      return await requestAgainstBase<T>(baseUrl, path, options);
    } catch (error) {
      const isLastCandidate = index === apiBaseUrls.length - 1;

      if (isLastCandidate || !shouldTryNextApiBase(error)) {
        throw error;
      }

      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('API base URL is not configured.');
}

async function requestAgainstBase<T>(baseUrl: string, path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({
    Accept: 'application/json',
  });

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const contentType = response.headers.get('content-type') ?? '';
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = extractApiErrorMessage(payload, response.status);

    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

function shouldTryNextApiBase(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 404;
  }

  return error instanceof TypeError;
}

function extractApiErrorMessage(payload: unknown, status: number): string {
  const validationMessage = extractFirstValidationError(payload);

  if (validationMessage) {
    return validationMessage;
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message' in payload &&
    typeof payload.message === 'string'
  ) {
    return payload.message;
  }

  return `API request failed with status ${status}`;
}

function extractFirstValidationError(payload: unknown): string | null {
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('errors' in payload) ||
    typeof payload.errors !== 'object' ||
    payload.errors === null
  ) {
    return null;
  }

  for (const value of Object.values(payload.errors as Record<string, unknown>)) {
    if (!Array.isArray(value)) {
      continue;
    }

    const firstMessage = value.find((item) => typeof item === 'string');

    if (typeof firstMessage === 'string' && firstMessage.trim() !== '') {
      return firstMessage;
    }
  }

  return null;
}

export function loginRequest(phoneNumber: string, password: string) {
  return apiRequest<{
    token_type: 'Bearer';
    token: string;
    expires_in: number;
    user: ApiUser;
  }>('/auth/login', {
    method: 'POST',
    body: {
      phone_number: phoneNumber,
      password,
    },
  });
}

export function registerRequest(payload: {
  name: string;
  gmail: string;
  phone_number: string;
  password: string;
}) {
  return apiRequest<ApiMessageResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
}

export function forgotPasswordRequest(phoneNumber: string) {
  return apiRequest<ApiMessageResponse>('/auth/forgot-password', {
    method: 'POST',
    body: {
      phone_number: phoneNumber,
    },
  });
}

export function verifyOtpRequest(phoneNumber: string, otp: string) {
  return apiRequest<ApiMessageResponse>('/auth/verify-otp', {
    method: 'POST',
    body: {
      phone_number: phoneNumber,
      otp,
    },
  });
}

export function resetPasswordRequest(phoneNumber: string, otp: string, newPassword: string) {
  return apiRequest<ApiMessageResponse>('/auth/reset-password', {
    method: 'POST',
    body: {
      phone_number: phoneNumber,
      otp,
      new_password: newPassword,
    },
  });
}

export function getDashboardBootstrap(token: string) {
  return apiRequest<DashboardBootstrapResponse>('/dashboard/bootstrap', {
    token,
  });
}

export function createServiceRequest(token: string, payload: { game_name: string; room_id: number; cost: number }) {
  return apiRequest('/services', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateServiceRequest(token: string, serviceId: number, payload: { game_name?: string; room_id?: number; cost?: number }) {
  return apiRequest(`/services/${serviceId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function deleteServiceRequest(token: string, serviceId: number) {
  return apiRequest(`/services/${serviceId}`, {
    method: 'DELETE',
    token,
  });
}

export function createTariffRequest(
  token: string,
  payload: {
    name: string;
    category_prices: Array<{
      category: string;
      hourly_price: number;
    }>;
  }
) {
  return apiRequest('/tariffs', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateTariffRequest(
  token: string,
  tariffId: number,
  payload: {
    name?: string;
    category_prices?: Array<{
      category: string;
      hourly_price: number;
    }>;
  }
) {
  return apiRequest(`/tariffs/${tariffId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function deleteTariffRequest(token: string, tariffId: number) {
  return apiRequest(`/tariffs/${tariffId}`, {
    method: 'DELETE',
    token,
  });
}

export function createAssetRequest(token: string, payload: { name: string; category: string; room_id: number }) {
  return apiRequest('/assets', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateAssetRequest(
  token: string,
  assetId: number,
  payload: {
    name?: string;
    category?: string;
    room_id?: number;
  }
) {
  return apiRequest(`/assets/${assetId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function deleteAssetRequest(token: string, assetId: number) {
  return apiRequest(`/assets/${assetId}`, {
    method: 'DELETE',
    token,
  });
}

export function createWarehouseItemRequest(
  token: string,
  payload: {
    manufacturer: string;
    product_name: string;
    shtrix_code: string;
    unit: 'bottle' | 'box' | 'container' | 'bag';
    count: number;
    purchase_price: number;
    sell_price: number;
  }
) {
  return apiRequest('/warehouse', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateWarehouseItemRequest(
  token: string,
  itemId: number,
  payload: {
    manufacturer: string;
    product_name: string;
    shtrix_code: string;
    unit: 'bottle' | 'box' | 'container' | 'bag';
    count: number;
    purchase_price: number;
    sell_price: number;
  }
) {
  return apiRequest(`/warehouse/${itemId}`, {
    method: 'PATCH',
    token,
    body: payload,
  });
}

export function deleteWarehouseItemRequest(token: string, itemId: number) {
  return apiRequest(`/warehouse/${itemId}`, {
    method: 'DELETE',
    token,
  });
}

export function deleteManufacturerRequest(token: string, manufacturerId: number) {
  return apiRequest(`/manufacturers/${manufacturerId}`, {
    method: 'DELETE',
    token,
  });
}

export function calculateBookingRequest(
  token: string,
  payload: {
    tariff_id: number;
    asset_ids: number[];
    start_time: string;
    duration_hours?: number;
    end_time?: string;
    is_vip?: boolean;
  }
) {
  return apiRequest<{
    duration_minutes: number;
    duration_hours: number | null;
    hourly_rate_total: number;
    total_cost: number;
    is_vip: boolean;
    end_time: string | null;
    asset_breakdown: Array<{
      id: number;
      category: string;
      room_id: number;
      room_number: string;
      hourly_price: number;
    }>;
  }>('/bookings/calculate', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function createBookingRequest(
  token: string,
  payload: {
    tariff_id: number;
    asset_ids: number[];
    start_time: string;
    duration_hours?: number;
    end_time?: string;
    is_vip?: boolean;
    status: 'submitted' | 'debt_closed';
    debt_name?: string;
    debt_phone_number?: string;
  }
) {
  return apiRequest('/bookings', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function endSessionRequest(token: string, sessionId: number) {
  return apiRequest(`/sessions/${sessionId}/end`, {
    method: 'POST',
    token,
  });
}

export function deleteSessionRequest(token: string, sessionId: number) {
  return apiRequest(`/sessions/${sessionId}`, {
    method: 'DELETE',
    token,
  });
}
