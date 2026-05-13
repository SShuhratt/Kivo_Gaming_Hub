import type { WarehouseUnit } from '@/lib/warehouse-units';

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
  const envApiUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL;
  const isProductionRuntime = typeof window !== 'undefined'
    ? window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1'
    : process.env.NODE_ENV === 'production';

  const browserOrigin =
    typeof window !== 'undefined' ? normalizeApiBaseUrl(window.location.origin) : null;

  const candidates = [
    normalizeApiBaseUrl(envApiUrl),
    browserOrigin,
    isProductionRuntime ? null : normalizeApiBaseUrl('http://localhost:8000'),
  ].filter((value): value is string => Boolean(value));

  if (isProductionRuntime) {
    return Array.from(new Set(candidates.filter((value) => value !== 'http://localhost:8000/api')));
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Resolved API URLs:', Array.from(new Set(candidates)));
  }

  return Array.from(new Set(candidates));
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
};

type ApiMessageResponse = {
  message: string;
};

export type DownloadedApiFile = {
  filename: string;
  blob: Blob;
};

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

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
    services_count: number;
    services_ready: boolean;
    rooms_count: number;
    sales_total_today: number;
  };
  services: Array<{
    id: string;
    backend_id: number;
    name: string;
    rate: number | null;
    price: number;
    requirements: Record<string, number>;
    manual_priority: number | null;
    savings_ratio: number;
    is_recommendable: boolean;
    is_bundle: boolean;
    assets_count: number;
  }>;
  rooms: Array<{
    id: string;
    backend_id: number;
    name: string;
    assets: Array<{
      id: string;
      backend_id: number;
      name: string;
      category: string | null;
      service_id: number | null;
      service_name: string | null;
      service_price: number | null;
      room_id: number | null;
      room_name: string | null;
      room_number: string | null;
      asset_order: number | null;
      total_usage_duration_minutes: number;
      total_earned_money: number;
    }>;
  }>;
  sales: ApiSaleRecord[];
  debts: ApiDebtRecord[];
  sessions: ApiSession[];
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
      unit: WarehouseUnit;
      purchase_price: number;
      selling_price: number;
    }>;
  }>;
  assets: Array<{
    id: string;
    backend_id: number;
    name: string;
    category: string | null;
    service_id: number | null;
    service_name: string | null;
    service_price: number | null;
    room_id: number | null;
    room_name: string | null;
    room_number: string | null;
    asset_order: number | null;
    total_usage_duration_minutes: number;
    total_earned_money: number;
  }>;
};

export type ApiSaleRecord = {
  id: string;
  source: 'trade' | 'checkout_sale_item';
  transaction_type: 'session_trade' | 'debt_trade' | 'product_sale';
  transaction_label: string;
  reference_label: string;
  room: string;
  base_price: number;
  start: string | null;
  end: string | null;
  service_cost: number;
  products: number;
  total: number;
  cash: number;
  terminal: number;
  click: number;
  payme: number;
  debt: number;
  paid: number;
  timestamp: number | null;
  date_time: string | null;
  payment_method: 'cash' | 'terminal' | 'click' | 'payme' | 'debt';
  product_name: string | null;
  manufacturer: string | null;
  quantity: number | null;
  unit: WarehouseUnit | null;
  unit_price: number | null;
  cashier_name: string | null;
  related_sale_id: number | null;
  barcode: string | null;
};

export type ApiDebtRecord = {
  id: string;
  source: 'booking' | 'trade';
  booking_id: number | null;
  trade_id: number | null;
  session_id: number | null;
  debtor_name: string | null;
  debtor_phone_number: string | null;
  debt_amount: number;
  final_cost: number;
  original_amount: number;
  paid_amount: number;
  remaining_amount: number;
  session_state: 'active' | 'ended';
  payment_state: 'paid' | 'unpaid';
  session_status: string;
  payment_status: 'submitted' | 'debt_closed';
  can_delete: boolean;
  created_at: string | null;
  session_date: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  room_label: string;
  pricing_label: string;
  reference_label: string;
};

export type ApiServiceFinanceSummary = {
  total_duration_seconds: number;
  total_duration_formatted: string;
  total_income: number;
  total_earned_amount?: number;
  total_records: number;
  total_session_records?: number;
};

export type ApiServiceFinanceAssetSession = {
  session_id: number | null;
  trade_id: number;
  start_time: string | null;
  end_time: string | null;
  completed_at: string | null;
  duration_seconds: number;
  duration_formatted: string;
  amount: number;
  payment_status: 'paid' | 'debt';
  payment_status_code: 'submitted' | 'debt_closed';
  payment_status_label: string;
  payment_method: 'cash' | 'debt';
  payment_method_label: string;
  debtor_name: string | null;
  debtor_phone: string | null;
};

export type ApiServiceFinanceAsset = {
  asset_id: number | null;
  asset_name: string;
  room_name: string;
  service_name: string;
  asset_order: number | null;
  total_duration_seconds: number;
  total_duration_formatted: string;
  total_income: number;
  sessions: ApiServiceFinanceAssetSession[];
};

export type ApiServiceFinanceDetailsResponse = {
  summary: ApiServiceFinanceSummary;
  assets: ApiServiceFinanceAsset[];
};

export type ApiSessionTrade = {
  id: number;
  status: 'submitted' | 'debt_closed';
  session_status: 'completed' | 'cancelled';
  saved_cost: number;
  duration_minutes: number;
  start_time: string | null;
  end_time: string | null;
};

export type ApiSession = {
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
  pricing: {
    label: string;
    hourly_rate: number;
  };
  assets: Array<{
    id: number | null;
    name: string | null;
    category: string | null;
    service_id?: number | null;
    service_name?: string | null;
    room_id: number | null;
    room_name: string | null;
    room_number: string | null;
    asset_order?: number | null;
    hourly_price: number | null;
  }>;
  assets_count: number;
  room_label: string;
  trade_exists: boolean;
  can_delete: boolean;
  trade: ApiSessionTrade | null;
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

async function downloadApiFile(path: string, options: RequestOptions = {}): Promise<DownloadedApiFile> {
  const apiBaseUrls = resolveApiBaseUrls();
  let lastError: unknown;

  for (const [index, baseUrl] of apiBaseUrls.entries()) {
    try {
      return await downloadFileAgainstBase(baseUrl, path, options);
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
    signal: options.signal,
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

async function downloadFileAgainstBase(baseUrl: string, path: string, options: RequestOptions = {}): Promise<DownloadedApiFile> {
  const headers: Record<string, string> = {
    'Accept': `${XLSX_MIME_TYPE}, application/json`,
  };

  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    signal: options.signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    const message = extractApiErrorMessage(payload, response.status);

    throw new ApiError(message, response.status, payload);
  }

  const contentType = response.headers.get('content-type') ?? '';

  if (!contentType.toLowerCase().includes(XLSX_MIME_TYPE)) {
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    const message = extractApiErrorMessage(payload, response.status) || 'Unexpected export response.';

    throw new ApiError(message, response.status, payload);
  }

  const filename = extractDownloadFilename(response.headers.get('content-disposition'));

  return {
    filename: filename || 'export.xlsx',
    blob: await response.blob(),
  };
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
    'error' in payload &&
    typeof payload.error === 'string' &&
    payload.error.trim() !== ''
  ) {
    if ('message' in payload && typeof payload.message === 'string' && payload.message.trim() !== '' && payload.message !== payload.error) {
      return `${payload.message}: ${payload.error}`;
    }

    return payload.error;
  }

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'message_uz' in payload &&
    typeof payload.message_uz === 'string'
  ) {
    return payload.message_uz;
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

function extractDownloadFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = contentDisposition.match(/filename=\"?([^\";]+)\"?/i);
  return plainMatch?.[1] ?? null;
}

function buildQueryString(params: Record<string, string | null | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (!value || value.trim() === '') {
      continue;
    }

    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
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

export function createServiceRequest(
  token: string,
  payload: {
    name: string;
    rate?: number;
    price?: number;
    requirements?: Record<string, number>;
    manual_priority?: number | null;
    is_recommendable?: boolean;
  }
) {
  return apiRequest('/services', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function updateServiceRequest(
  token: string,
  serviceId: number,
  payload: {
    name?: string;
    rate?: number;
    price?: number;
    requirements?: Record<string, number>;
    manual_priority?: number | null;
    is_recommendable?: boolean;
  }
) {
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

export function createRoomRequest(token: string, payload: { name: string }) {
  return apiRequest('/rooms', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function deleteRoomRequest(token: string, roomId: number) {
  return apiRequest(`/rooms/${roomId}`, {
    method: 'DELETE',
    token,
  });
}

export function createAssetRequest(
  token: string,
  payload: {
    name?: string;
    asset_name?: string;
    service_id?: number;
    category_name?: string;
    room_id?: number;
    room_number?: string;
  }
) {
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
    asset_name?: string;
    service_id?: number;
    category_name?: string;
    room_id?: number;
    room_number?: string;
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

export function deleteRoomAssetsRequest(token: string, roomId: number) {
  return apiRequest(`/rooms/${roomId}/assets`, {
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
    unit: WarehouseUnit;
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
    unit: WarehouseUnit;
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

export function exportManufacturerProductsRequest(
  token: string,
  manufacturerId: number,
  params: {
    search?: string;
  } = {}
) {
  return downloadApiFile(
    `/manufacturers/${manufacturerId}/products/export${buildQueryString({
      search: params.search ?? null,
    })}`,
    {
      token,
    }
  );
}

export function createCheckoutSaleRequest(
  token: string,
  payload: {
    items: Array<{
      warehouse_id: number;
      quantity: number;
    }>;
    payment_method: 'cash' | 'terminal' | 'click' | 'payme';
  }
) {
  return apiRequest<{
    id: number;
    payment_method: 'cash' | 'terminal' | 'click' | 'payme';
    total_amount: number;
    cashier_name: string | null;
    created_at: string | null;
    items: Array<{
      id: number;
      warehouse_id: number | null;
      manufacturer_name: string;
      product_name: string;
      barcode: string;
      unit: WarehouseUnit;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  }>('/checkout-sales', {
    method: 'POST',
    token,
    body: payload,
  });
}

export function calculateBookingRequest(
  token: string,
  payload: {
    asset_ids?: number[];
    cart_items?: Array<{
      service_id: number;
      quantity: number;
    }>;
    selected_bundle_service_ids?: number[];
    start_time: string;
    duration_hours?: number;
    end_time?: string;
    is_vip?: boolean;
  },
  signal?: AbortSignal
) {
  return apiRequest<{
    duration_minutes: number;
    duration_hours: number | null;
    hourly_rate_total: number;
    total_cost: number;
    total_price: number;
    hourly_total_price: number;
    is_vip: boolean;
    end_time: string | null;
    cart: Array<{
      service_id: number;
      service_name: string;
      service_key: string;
      quantity: number;
      rate: number;
    }>;
    breakdown: Array<{
      type: 'bundle' | 'residual';
      phase: 'explicit_selection' | 'admin_override' | 'best_value' | 'residual';
      service_id: number;
      service_name: string;
      service_key: string;
      quantity: number;
      rate: number;
      subtotal: number;
      requirements: Record<string, number>;
      manual_priority: number | null;
      savings_ratio: number;
      is_recommendable: boolean;
    }>;
    asset_breakdown: Array<{
      id: number;
      name: string;
      category: string;
      service_name: string | null;
      room_id: number;
      room_name: string | null;
      room_number: string;
      asset_order: number | null;
      hourly_price: number;
    }>;
  }>('/bookings/calculate', {
    method: 'POST',
    token,
    body: payload,
    signal,
  });
}

export function createBookingRequest(
  token: string,
  payload: {
    asset_ids?: number[];
    cart_items?: Array<{
      service_id: number;
      quantity: number;
    }>;
    selected_bundle_service_ids?: number[];
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
  return apiRequest<ApiSession>(`/sessions/${sessionId}/end`, {
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

export function markDebtPaidRequest(token: string, debtId: string) {
  return apiRequest(`/debts/${debtId}/mark-paid`, {
    method: 'PATCH',
    token,
  });
}

export function getServiceFinanceSummaryRequest(token: string) {
  return apiRequest<ApiServiceFinanceSummary>('/finance/service-summary', {
    token,
  });
}

export function getServiceFinanceDetailsRequest(token: string) {
  return apiRequest<ApiServiceFinanceDetailsResponse>('/finance/service-details', {
    token,
  });
}

export function exportTradesRequest(
  token: string,
  params: {
    status?: 'submitted' | 'debt_closed';
    type?: 'Income' | 'Debt' | 'Product Sale';
    search?: string;
    payment_method?: 'cash' | 'terminal' | 'click' | 'payme' | 'debt';
    date_from?: string;
    date_to?: string;
  } = {}
) {
  return downloadApiFile(
    `/trades/export${buildQueryString({
      status: params.status ?? null,
      type: params.type ?? null,
      search: params.search ?? null,
      payment_method: params.payment_method ?? null,
      date_from: params.date_from ?? null,
      date_to: params.date_to ?? null,
    })}`,
    {
      token,
    }
  );
}

export function deleteDebtRequest(token: string, debtId: string) {
  return apiRequest(`/debts/${debtId}`, {
    method: 'DELETE',
    token,
  });
}
