'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  ApiError,
  type ApiDebtRecord,
  type ApiServiceFinanceDetailsResponse,
  type ApiServiceFinanceSummary,
  type ApiSession,
  type ApiUser,
  type DashboardBootstrapResponse,
  calculateBookingRequest,
  createCheckoutSaleRequest,
  createAssetRequest,
  createBookingRequest,
  createRoomRequest,
  createServiceRequest,
  createWarehouseItemRequest,
  deleteAssetRequest,
  deleteRoomAssetsRequest,
  deleteRoomRequest,
  deleteManufacturerRequest,
  deleteServiceRequest,
  deleteSessionRequest,
  deleteWarehouseItemRequest,
  endSessionRequest,
  exportManufacturerProductsRequest,
  exportTradesRequest,
  getServiceFinanceDetailsRequest,
  getServiceFinanceSummaryRequest,
  getDashboardBootstrap,
  loginRequest,
  markDebtPaidRequest,
  deleteDebtRequest,
  updateAssetRequest,
  updateWarehouseItemRequest,
} from '@/lib/api';
import type { WarehouseUnit } from '@/lib/warehouse-units';

const AUTH_TOKEN_STORAGE_KEY = 'kivo:auth-token';

export interface SessionUser {
  id: number;
  name: string;
  gmail: string;
  phoneNumber: string;
}

export interface DashboardSummary {
  activeSessions: number;
  totalSessionDevices: number;
  servicesCount: number;
  servicesReady: boolean;
  roomsCount: number;
  salesTotalToday: number;
}

export interface Product {
  id: string;
  backendId: number;
  manufacturer: string;
  name: string;
  barcode: string;
  quantity: number;
  unit: WarehouseUnit;
  purchasePrice: number;
  sellingPrice: number;
}

export interface WarehouseCompany {
  id: string;
  backendId: number;
  name: string;
  products: Product[];
}

export interface ServiceItem {
  id: string;
  backendId: number;
  name: string;
  rate: number | null;
  price: number;
  requirements: Record<string, number>;
  manualPriority: number | null;
  savingsRatio: number;
  isRecommendable: boolean;
  isBundle: boolean;
  assetsCount: number;
}

export interface RoomRecord {
  id: string;
  backendId: number;
  name: string;
  assets: AssetDevice[];
}

export interface AssetDevice {
  id: string;
  backendId: number;
  name: string;
  category: string;
  serviceId: number | null;
  serviceName: string | null;
  servicePrice: number | null;
  roomId: number | null;
  roomName: string | null;
  roomNumber: string;
  assetOrder: number | null;
  totalUsageDurationMinutes: number;
  totalEarnedMoney: number;
}

export interface SaleRecord {
  id: string;
  source: 'trade' | 'checkout_sale_item';
  transactionType: 'session_trade' | 'debt_trade' | 'product_sale';
  transactionLabel: string;
  referenceLabel: string;
  room: string;
  basePrice: number;
  start: string | null;
  end: string | null;
  serviceCost: number;
  products: number;
  total: number;
  cash: number;
  terminal: number;
  click: number;
  payme: number;
  debt: number;
  paid: number;
  timestamp: number | null;
  dateTime: string | null;
  paymentMethod: 'cash' | 'terminal' | 'click' | 'payme' | 'debt';
  productName: string | null;
  manufacturer: string | null;
  quantity: number | null;
  unit: WarehouseUnit | null;
  unitPrice: number | null;
  cashierName: string | null;
  relatedSaleId: number | null;
  barcode: string | null;
}

export interface DebtRecord {
  id: string;
  source: 'booking' | 'trade';
  bookingId: number | null;
  tradeId: number | null;
  sessionId: number | null;
  debtorName: string | null;
  debtorPhoneNumber: string | null;
  debtAmount: number;
  finalCost: number;
  originalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  sessionState: 'active' | 'ended';
  paymentState: 'paid' | 'unpaid';
  sessionStatus: 'active' | 'completed' | 'cancelled';
  paymentStatus: 'submitted' | 'debt_closed';
  canDelete: boolean;
  createdAt: string | null;
  sessionDate: string | null;
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number | null;
  roomLabel: string;
  pricingLabel: string;
  referenceLabel: string;
}

export interface SessionAssetSnapshot {
  id: number | null;
  name: string | null;
  category: string | null;
  serviceId?: number | null;
  serviceName: string | null;
  roomId: number | null;
  roomName: string | null;
  roomNumber: string | null;
  assetOrder: number | null;
  hourlyPrice: number | null;
}

export interface SessionTradeRecord {
  id: number;
  status: 'submitted' | 'debt_closed';
  sessionStatus: 'completed' | 'cancelled';
  savedCost: number;
  durationMinutes: number;
  startTime: string | null;
  endTime: string | null;
}

export interface SessionRecord {
  id: string;
  backendId: number;
  status: 'submitted' | 'debt_closed';
  sessionStatus: 'active' | 'completed' | 'cancelled';
  startTime: string;
  endTime: string | null;
  endedAt: string | null;
  durationMinutes: number;
  requestedDurationHours: number | null;
  totalCost: number;
  debtName: string | null;
  debtPhoneNumber: string | null;
  roomLabel: string;
  assetsCount: number;
  tradeExists: boolean;
  canDelete: boolean;
  isVip: boolean;
  pricing: {
    label: string;
    hourlyRate: number;
  };
  assets: SessionAssetSnapshot[];
  trade: SessionTradeRecord | null;
}

export interface ServiceFinanceSummary {
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  totalIncome: number;
  totalRecords: number;
  totalSessionRecords: number;
}

export interface ServiceFinanceAssetSession {
  sessionId: number | null;
  tradeId: number;
  startTime: string | null;
  endTime: string | null;
  completedAt: string | null;
  durationSeconds: number;
  durationFormatted: string;
  amount: number;
  paymentStatus: 'paid' | 'debt';
  paymentStatusCode: 'submitted' | 'debt_closed';
  paymentStatusLabel: string;
  paymentMethod: 'cash' | 'debt';
  paymentMethodLabel: string;
  debtorName: string | null;
  debtorPhone: string | null;
}

export interface ServiceFinanceAssetRecord {
  assetId: number | null;
  assetName: string;
  roomName: string;
  serviceName: string;
  assetOrder: number | null;
  totalDurationSeconds: number;
  totalDurationFormatted: string;
  totalIncome: number;
  sessions: ServiceFinanceAssetSession[];
}

export interface ServiceFinanceDetailsResponse {
  summary: ServiceFinanceSummary;
  assets: ServiceFinanceAssetRecord[];
}

export interface BookingCalculation {
  durationMinutes: number;
  durationHours: number | null;
  hourlyRateTotal: number;
  totalCost: number;
  totalPrice: number;
  hourlyTotalPrice: number;
  isVip: boolean;
  endTime: string | null;
  cart: Array<{
    serviceId: number;
    serviceName: string;
    serviceKey: string;
    quantity: number;
    rate: number;
  }>;
  breakdown: Array<{
    type: 'bundle' | 'residual';
    phase: 'explicit_selection' | 'admin_override' | 'best_value' | 'residual';
    serviceId: number;
    serviceName: string;
    serviceKey: string;
    quantity: number;
    rate: number;
    subtotal: number;
    requirements: Record<string, number>;
    manualPriority: number | null;
    savingsRatio: number;
    isRecommendable: boolean;
  }>;
  assetBreakdown: Array<{
    id: number;
    name: string;
    category: string;
    serviceName: string | null;
    roomId: number;
    roomName: string | null;
    roomNumber: string;
    assetOrder: number | null;
    hourlyPrice: number;
  }>;
}

interface DashboardContextType {
  currentUser: SessionUser | null;
  summary: DashboardSummary;
  servicesReady: boolean;
  services: ServiceItem[];
  rooms: RoomRecord[];
  sales: SaleRecord[];
  debts: DebtRecord[];
  sessions: SessionRecord[];
  companies: WarehouseCompany[];
  assets: AssetDevice[];
  isCheckingAuth: boolean;
  isAuthenticated: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  logout: () => void;
  refreshDashboard: () => Promise<void>;
  createService: (payload: {
    name: string;
    rate: number;
    requirements?: Record<string, number>;
    manualPriority?: number | null;
    isRecommendable?: boolean;
  }) => Promise<void>;
  deleteService: (service: ServiceItem) => Promise<void>;
  createRoom: (payload: { name: string }) => Promise<void>;
  deleteRoom: (room: RoomRecord) => Promise<void>;
  deleteRoomAssets: (roomBackendId: number) => Promise<void>;
  createAsset: (payload: {
    name: string;
    serviceId?: number;
    roomId?: number;
    categoryName?: string;
    roomNumber?: string;
  }) => Promise<void>;
  updateAsset: (payload: {
    backendId: number;
    name: string;
    serviceId?: number;
    roomId?: number;
    categoryName?: string;
    roomNumber?: string;
  }) => Promise<void>;
  deleteAsset: (asset: AssetDevice) => Promise<void>;
  saveWarehouseProduct: (payload: {
    backendId?: number;
    manufacturerId?: number;
    manufacturer?: string;
    name: string;
    barcode: string;
    quantity: number;
    unit: Product['unit'];
    purchasePrice: number;
    sellingPrice: number;
  }) => Promise<void>;
  deleteWarehouseProduct: (backendId: number) => Promise<void>;
  deleteManufacturer: (company: WarehouseCompany) => Promise<void>;
  exportManufacturerProducts: (payload: {
    manufacturerId: number;
    search?: string;
  }) => Promise<string | null>;
  completeCheckoutSale: (payload: {
    items: Array<{ warehouseId: number; quantity: number }>;
    paymentMethod: 'cash' | 'terminal' | 'click' | 'payme';
  }) => Promise<void>;
  calculateBooking: (payload: {
    assetIds?: number[];
    cartItems?: Array<{ serviceId: number; quantity: number }>;
    selectedBundleServiceIds?: number[];
    startTime: string;
    durationHours?: number;
    endTime?: string;
    isVip?: boolean;
    signal?: AbortSignal;
  }) => Promise<BookingCalculation>;
  createBooking: (payload: {
    assetIds?: number[];
    cartItems?: Array<{ serviceId: number; quantity: number }>;
    selectedBundleServiceIds?: number[];
    startTime: string;
    durationHours?: number;
    endTime?: string;
    isVip?: boolean;
    status: 'submitted' | 'debt_closed';
    debtName?: string;
    debtPhoneNumber?: string;
  }) => Promise<void>;
  endSession: (sessionId: number) => Promise<SessionRecord>;
  deleteSession: (sessionId: number) => Promise<void>;
  createServiceBatch: (payload: {
    rows: Array<{ existingBackendId?: number; name: string; rate: number }>;
    bundle?: { name: string; rate: number };
  }) => Promise<void>;
  markDebtPaid: (debtId: string) => Promise<void>;
  exportSales: (payload: {
    status?: 'submitted' | 'debt_closed';
    type?: 'Income' | 'Debt' | 'Product Sale';
    search?: string;
    paymentMethod?: 'cash' | 'terminal' | 'click' | 'payme' | 'debt';
    dateFrom?: string;
    dateTo?: string;
  }) => Promise<string | null>;
  deleteDebt: (debtId: string) => Promise<void>;
  getServiceFinanceSummary: () => Promise<ServiceFinanceSummary>;
  getServiceFinanceDetails: () => Promise<ServiceFinanceDetailsResponse>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const emptySummary: DashboardSummary = {
  activeSessions: 0,
  totalSessionDevices: 0,
  servicesCount: 0,
  servicesReady: false,
  roomsCount: 0,
  salesTotalToday: 0,
};

function mapUser(user: ApiUser | null): SessionUser | null {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    gmail: user.gmail,
    phoneNumber: user.phone_number,
  };
}

function mapAssetDevice(asset: DashboardBootstrapResponse['assets'][number]): AssetDevice {
  return {
    id: asset.id,
    backendId: asset.backend_id,
    name: asset.name,
    category: asset.category ?? asset.service_name ?? 'Jihoz',
    serviceId: asset.service_id,
    serviceName: asset.service_name,
    servicePrice: asset.service_price,
    roomId: asset.room_id,
    roomName: asset.room_name,
    roomNumber: asset.room_name ?? asset.room_number ?? 'Xona N/A',
    assetOrder: asset.asset_order,
    totalUsageDurationMinutes: asset.total_usage_duration_minutes,
    totalEarnedMoney: asset.total_earned_money,
  };
}

function mapDebtRecord(record: ApiDebtRecord): DebtRecord {
  return {
    id: record.id,
    source: record.source,
    bookingId: record.booking_id,
    tradeId: record.trade_id,
    sessionId: record.session_id,
    debtorName: record.debtor_name,
    debtorPhoneNumber: record.debtor_phone_number,
    debtAmount: record.debt_amount,
    finalCost: record.final_cost,
    originalAmount: record.original_amount,
    paidAmount: record.paid_amount,
    remainingAmount: record.remaining_amount,
    sessionState: record.session_state,
    paymentState: record.payment_state,
    sessionStatus: record.session_status as DebtRecord['sessionStatus'],
    paymentStatus: record.payment_status,
    canDelete: record.can_delete,
    createdAt: record.created_at,
    sessionDate: record.session_date,
    startTime: record.start_time,
    endTime: record.end_time,
    durationMinutes: record.duration_minutes,
    roomLabel: record.room_label,
    pricingLabel: record.pricing_label,
    referenceLabel: record.reference_label,
  };
}

function mapSessionRecord(session: ApiSession): SessionRecord {
  return {
    id: String(session.id),
    backendId: session.id,
    status: session.status,
    sessionStatus: session.session_status,
    startTime: session.start_time,
    endTime: session.end_time,
    endedAt: session.ended_at,
    durationMinutes: session.duration_minutes,
    requestedDurationHours: session.requested_duration_hours,
    totalCost: session.total_cost,
    debtName: session.debt_name,
    debtPhoneNumber: session.debt_phone_number,
    roomLabel: session.room_label,
    assetsCount: session.assets_count,
    tradeExists: session.trade_exists,
    canDelete: session.can_delete,
    isVip: session.is_vip,
    pricing: {
      label: session.pricing.label,
      hourlyRate: session.pricing.hourly_rate,
    },
    assets: session.assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      serviceId: asset.service_id,
      serviceName: asset.service_name ?? asset.category ?? null,
      roomId: asset.room_id,
      roomName: asset.room_name,
      roomNumber: asset.room_name ?? asset.room_number,
      assetOrder: asset.asset_order ?? null,
      hourlyPrice: asset.hourly_price,
    })),
    trade: session.trade
      ? {
          id: session.trade.id,
          status: session.trade.status,
          sessionStatus: session.trade.session_status,
          savedCost: session.trade.saved_cost,
          durationMinutes: session.trade.duration_minutes,
          startTime: session.trade.start_time,
          endTime: session.trade.end_time,
        }
      : null,
  };
}

function mapServiceFinanceSummary(summary: ApiServiceFinanceSummary): ServiceFinanceSummary {
  return {
    totalDurationSeconds: summary.total_duration_seconds,
    totalDurationFormatted: summary.total_duration_formatted,
    totalIncome: summary.total_income ?? summary.total_earned_amount ?? 0,
    totalRecords: summary.total_records,
    totalSessionRecords: summary.total_session_records ?? 0,
  };
}

function mapServiceFinanceDetailsResponse(response: ApiServiceFinanceDetailsResponse): ServiceFinanceDetailsResponse {
  return {
    summary: mapServiceFinanceSummary(response.summary),
    assets: response.assets.map((asset) => ({
      assetId: asset.asset_id,
      assetName: asset.asset_name,
      roomName: asset.room_name,
      serviceName: asset.service_name,
      assetOrder: asset.asset_order,
      totalDurationSeconds: asset.total_duration_seconds,
      totalDurationFormatted: asset.total_duration_formatted,
      totalIncome: asset.total_income,
      sessions: asset.sessions.map((session) => ({
        sessionId: session.session_id,
        tradeId: session.trade_id,
        startTime: session.start_time,
        endTime: session.end_time,
        completedAt: session.completed_at,
        durationSeconds: session.duration_seconds,
        durationFormatted: session.duration_formatted,
        amount: session.amount,
        paymentStatus: session.payment_status,
        paymentStatusCode: session.payment_status_code,
        paymentStatusLabel: session.payment_status_label,
        paymentMethod: session.payment_method,
        paymentMethodLabel: session.payment_method_label,
        debtorName: session.debtor_name,
        debtorPhone: session.debtor_phone,
      })),
    })),
  };
}

function mapBootstrapPayload(payload: DashboardBootstrapResponse) {
  return {
    currentUser: mapUser(payload.user),
    summary: {
      activeSessions: payload.summary.active_sessions,
      totalSessionDevices: payload.summary.total_session_devices,
      servicesCount: payload.summary.services_count,
      servicesReady: payload.summary.services_ready,
      roomsCount: payload.summary.rooms_count,
      salesTotalToday: payload.summary.sales_total_today,
    },
    services: payload.services.map((service) => ({
      id: service.id,
      backendId: service.backend_id,
      name: service.name,
      rate: service.rate,
      price: service.price,
      requirements: service.requirements ?? {},
      manualPriority: service.manual_priority,
      savingsRatio: service.savings_ratio,
      isRecommendable: service.is_recommendable,
      isBundle: service.is_bundle,
      assetsCount: service.assets_count,
    })),
    rooms: payload.rooms.map((room) => ({
      id: room.id,
      backendId: room.backend_id,
      name: room.name,
      assets: room.assets.map(mapAssetDevice),
    })),
    sales: payload.sales.map((sale) => ({
      id: sale.id,
      source: sale.source,
      transactionType: sale.transaction_type,
      transactionLabel: sale.transaction_label,
      referenceLabel: sale.reference_label,
      room: sale.room,
      basePrice: sale.base_price,
      start: sale.start,
      end: sale.end,
      serviceCost: sale.service_cost,
      products: sale.products,
      total: sale.total,
      cash: sale.cash,
      terminal: sale.terminal,
      click: sale.click,
      payme: sale.payme,
      debt: sale.debt,
      paid: sale.paid,
      timestamp: sale.timestamp,
      dateTime: sale.date_time,
      paymentMethod: sale.payment_method,
      productName: sale.product_name,
      manufacturer: sale.manufacturer,
      quantity: sale.quantity,
      unit: sale.unit,
      unitPrice: sale.unit_price,
      cashierName: sale.cashier_name,
      relatedSaleId: sale.related_sale_id,
      barcode: sale.barcode,
    })),
    debts: payload.debts.map(mapDebtRecord),
    sessions: payload.sessions.map(mapSessionRecord),
    companies: payload.companies.map((company) => ({
      id: company.id,
      backendId: company.backend_id,
      name: company.name,
      products: company.products.map((product) => ({
        id: product.id,
        backendId: product.backend_id,
        manufacturer: product.manufacturer,
        name: product.name,
        barcode: product.barcode,
        quantity: product.quantity,
        unit: product.unit,
        purchasePrice: product.purchase_price,
        sellingPrice: product.selling_price,
      })),
    })),
    assets: payload.assets.map(mapAssetDevice),
  };
}

function triggerBrowserDownload(filename: string, blob: Blob) {
  const blobUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = blobUrl;
  anchor.download = filename;
  anchor.style.display = 'none';

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.URL.revokeObjectURL(blobUrl);
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [debts, setDebts] = useState<DebtRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [companies, setCompanies] = useState<WarehouseCompany[]>([]);
  const [assets, setAssets] = useState<AssetDevice[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const tokenRef = useRef<string | null>(null);
  const refreshRequestIdRef = useRef(0);
  const unauthorizedNoticeShownRef = useRef(false);

  const resetState = useCallback(() => {
    setCurrentUser(null);
    setSummary(emptySummary);
    setServices([]);
    setRooms([]);
    setSales([]);
    setDebts([]);
    setSessions([]);
    setCompanies([]);
    setAssets([]);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    refreshRequestIdRef.current += 1;
    tokenRef.current = null;
    setToken(null);
    resetState();
    setIsCheckingAuth(false);
  }, [resetState]);

  const logout = useCallback(() => {
    unauthorizedNoticeShownRef.current = false;
    clearSession();
  }, [clearSession]);

  const handleUnauthorized = useCallback(
    (activeToken?: string) => {
      if (activeToken && tokenRef.current && activeToken !== tokenRef.current) {
        return;
      }

      if (!unauthorizedNoticeShownRef.current) {
        unauthorizedNoticeShownRef.current = true;
        toast({
          title: "Sessiya muddati tugadi",
          description: "Iltimos, qaytadan tizimga kiring.",
          variant: "destructive",
        });
      }

      clearSession();
    },
    [clearSession, toast]
  );

  const refreshDashboard = useCallback(
    async (overrideToken?: string) => {
      const activeToken = overrideToken ?? tokenRef.current ?? token;
      const requestId = ++refreshRequestIdRef.current;

      if (!activeToken) {
        if (requestId === refreshRequestIdRef.current) {
          resetState();
          setIsCheckingAuth(false);
        }
        return;
      }

      try {
        const payload = await getDashboardBootstrap(activeToken);

        if (requestId !== refreshRequestIdRef.current) {
          return;
        }

        const mapped = mapBootstrapPayload(payload);

        setCurrentUser(mapped.currentUser);
        setSummary(mapped.summary);
        setServices(mapped.services);
        setRooms(mapped.rooms);
        setSales(mapped.sales);
        setDebts(mapped.debts);
        setSessions(mapped.sessions);
        setCompanies(mapped.companies);
        setAssets(mapped.assets);
      } catch (error) {
        if (requestId !== refreshRequestIdRef.current) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          handleUnauthorized(activeToken);
          return;
        }

        throw error;
      } finally {
        if (requestId === refreshRequestIdRef.current) {
          setIsCheckingAuth(false);
        }
      }
    },
    [handleUnauthorized, resetState, token]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setIsCheckingAuth(false);
      return;
    }

    unauthorizedNoticeShownRef.current = false;
    tokenRef.current = storedToken;
    setToken(storedToken);
    void refreshDashboard(storedToken);
  }, []);

  const requireToken = useCallback(() => {
    const activeToken = tokenRef.current ?? token;

    if (!activeToken) {
      throw new Error('Authentication token is missing.');
    }

    return activeToken;
  }, [token]);

  const login = useCallback(
    async (phoneNumber: string, password: string) => {
      const response = await loginRequest(phoneNumber, password);
      unauthorizedNoticeShownRef.current = false;
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
      tokenRef.current = response.token;
      setToken(response.token);
      await refreshDashboard(response.token);
    },
    [refreshDashboard]
  );

  const createService = useCallback(
    async ({
      name,
      rate,
      requirements,
      manualPriority,
      isRecommendable,
    }: {
      name: string;
      rate: number;
      requirements?: Record<string, number>;
      manualPriority?: number | null;
      isRecommendable?: boolean;
    }) => {
      const activeToken = requireToken();

      if (!name.trim()) {
        throw new Error('Service name is required.');
      }

      if (!Number.isFinite(rate) || rate < 0) {
        throw new Error('Service price must be zero or greater.');
      }

      await createServiceRequest(activeToken, {
        name: name.trim(),
        rate,
        price: rate,
        requirements,
        manual_priority: manualPriority,
        is_recommendable: isRecommendable,
      });

      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const deleteService = useCallback(
    async (service: ServiceItem) => {
      const activeToken = requireToken();

      await deleteServiceRequest(activeToken, service.backendId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const createServiceBatch = useCallback(
    async (payload: {
      rows: Array<{ existingBackendId?: number; name: string; rate: number }>;
      bundle?: { name: string; rate: number };
    }) => {
      const activeToken = requireToken();
      const knownNames = new Set(services.map((s) => s.name.toLowerCase().trim()));
      const requirementNames: string[] = [];

      for (const row of payload.rows) {
        if (row.existingBackendId !== undefined) {
          const existing = services.find((s) => s.backendId === row.existingBackendId);
          if (existing) {
            requirementNames.push(existing.name.trim().toLowerCase());
          }
          continue;
        }

        const normalizedName = row.name.trim();
        const normalizedKey = normalizedName.toLowerCase();

        if (!knownNames.has(normalizedKey)) {
          await createServiceRequest(activeToken, {
            name: normalizedName,
            rate: row.rate,
            price: row.rate,
          });
          knownNames.add(normalizedKey);
        }

        requirementNames.push(normalizedKey);
      }

      if (payload.bundle) {
        const requirements: Record<string, number> = {};
        for (const name of requirementNames) {
          requirements[name] = (requirements[name] ?? 0) + 1;
        }
        await createServiceRequest(activeToken, {
          name: payload.bundle.name.trim(),
          rate: payload.bundle.rate,
          price: payload.bundle.rate,
          requirements,
          is_recommendable: true,
        });
      }

      await refreshDashboard(activeToken);
    },
    [requireToken, refreshDashboard, services]
  );

  const createRoom = useCallback(
    async ({ name }: { name: string }) => {
      const activeToken = requireToken();

      if (!name.trim()) {
        throw new Error('Room name is required.');
      }

      await createRoomRequest(activeToken, {
        name: name.trim(),
      });

      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const deleteRoom = useCallback(
    async (room: RoomRecord) => {
      const activeToken = requireToken();

      await deleteRoomRequest(activeToken, room.backendId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const createAsset = useCallback(
    async ({
      name,
      serviceId,
      roomId,
      categoryName,
      roomNumber,
    }: {
      name: string;
      serviceId?: number;
      roomId?: number;
      categoryName?: string;
      roomNumber?: string;
    }) => {
      const activeToken = requireToken();
      const normalizedName = name.trim();

      if (!normalizedName) {
        throw new Error('Asset name is required.');
      }

      await createAssetRequest(activeToken, {
        asset_name: normalizedName,
        service_id: serviceId,
        room_id: roomId,
        category_name: categoryName,
        room_number: roomNumber,
      });

      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const updateAsset = useCallback(
    async ({
      backendId,
      name,
      serviceId,
      roomId,
      categoryName,
      roomNumber,
    }: {
      backendId: number;
      name: string;
      serviceId?: number;
      roomId?: number;
      categoryName?: string;
      roomNumber?: string;
    }) => {
      const activeToken = requireToken();
      const normalizedName = name.trim();

      if (!normalizedName) {
        throw new Error('Asset name is required.');
      }

      await updateAssetRequest(activeToken, backendId, {
        asset_name: normalizedName,
        service_id: serviceId,
        room_id: roomId,
        category_name: categoryName,
        room_number: roomNumber,
      });

      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const deleteAsset = useCallback(
    async (asset: AssetDevice) => {
      const activeToken = requireToken();

      await deleteAssetRequest(activeToken, asset.backendId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const deleteRoomAssets = useCallback(
    async (roomBackendId: number) => {
      const activeToken = requireToken();

      await deleteRoomAssetsRequest(activeToken, roomBackendId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const saveWarehouseProduct = useCallback(
    async (payload: {
      backendId?: number;
      manufacturerId?: number;
      manufacturer?: string;
      name: string;
      barcode: string;
      quantity: number;
      unit: Product['unit'];
      purchasePrice: number;
      sellingPrice: number;
    }) => {
      const activeToken = requireToken();
      const requestPayload = {
        manufacturer_id: payload.manufacturerId,
        manufacturer: payload.manufacturer,
        name: payload.name,
        barcode: payload.barcode,
        unit: payload.unit,
        quantity: payload.quantity,
        purchase_price: payload.purchasePrice,
        sale_price: payload.sellingPrice,
      };

      try {
        if (payload.backendId) {
          await updateWarehouseItemRequest(activeToken, payload.backendId, requestPayload);
        } else {
          await createWarehouseItemRequest(activeToken, requestPayload);
        }
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          handleUnauthorized(activeToken);
          throw new Error("Sessiya muddati tugadi. Iltimos, qaytadan tizimga kiring.");
        }

        throw error;
      }

      await refreshDashboard(activeToken);
    },
    [handleUnauthorized, refreshDashboard, requireToken]
  );

  const deleteWarehouseProduct = useCallback(
    async (backendId: number) => {
      const activeToken = requireToken();

      await deleteWarehouseItemRequest(activeToken, backendId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const deleteManufacturer = useCallback(
    async (company: WarehouseCompany) => {
      const activeToken = requireToken();

      await deleteManufacturerRequest(activeToken, company.backendId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const exportManufacturerProducts = useCallback(
    async ({ manufacturerId, search }: { manufacturerId: number; search?: string }) => {
      try {
        const activeToken = requireToken();
        const file = await exportManufacturerProductsRequest(activeToken, manufacturerId, {
          search,
        });

        triggerBrowserDownload(file.filename, file.blob);

        return file.filename;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          toast({
            title: "Sessiya muddati tugadi",
            description: "Iltimos, qaytadan tizimga kiring.",
            variant: "destructive",
          });
          // Do not logout automatically for export failures to prevent annoying redirects
          return null;
        }

        toast({
          title: "Eksportda xatolik yuz berdi",
          description: error instanceof Error ? error.message : "Noma'lum xatolik",
          variant: "destructive",
        });
        return null;
      }
    },
    [requireToken, toast, logout]
  );

  const completeCheckoutSale = useCallback(
    async (payload: {
      items: Array<{ warehouseId: number; quantity: number }>;
      paymentMethod: 'cash' | 'terminal' | 'click' | 'payme';
    }) => {
      const activeToken = requireToken();

      await createCheckoutSaleRequest(activeToken, {
        items: payload.items.map((item) => ({
          warehouse_id: item.warehouseId,
          quantity: item.quantity,
        })),
        payment_method: payload.paymentMethod,
      });

      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const exportSales = useCallback(
    async ({
      status,
      type,
      search,
      paymentMethod,
      dateFrom,
      dateTo,
    }: {
      status?: 'submitted' | 'debt_closed';
      type?: 'Income' | 'Debt' | 'Product Sale';
      search?: string;
      paymentMethod?: 'cash' | 'terminal' | 'click' | 'payme' | 'debt';
      dateFrom?: string;
      dateTo?: string;
    }) => {
      try {
        const activeToken = requireToken();
        const file = await exportTradesRequest(activeToken, {
          status,
          type,
          search,
          payment_method: paymentMethod,
          date_from: dateFrom,
          date_to: dateTo,
        });

        triggerBrowserDownload(file.filename, file.blob);

        return file.filename;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          toast({
            title: "Sessiya muddati tugadi",
            description: "Iltimos, qaytadan tizimga kiring.",
            variant: "destructive",
          });
          // Do not logout automatically for export failures to prevent annoying redirects
          return null;
        }

        toast({
          title: "Eksportda xatolik yuz berdi",
          description: error instanceof Error ? error.message : "Noma'lum xatolik",
          variant: "destructive",
        });
        return null;
      }
    },
    [requireToken, toast, logout]
  );

  const calculateBooking = useCallback(
    async ({
      assetIds,
      cartItems,
      selectedBundleServiceIds,
      startTime,
      durationHours,
      endTime,
      isVip,
      signal,
    }: {
      assetIds?: number[];
      cartItems?: Array<{ serviceId: number; quantity: number }>;
      selectedBundleServiceIds?: number[];
      startTime: string;
      durationHours?: number;
      endTime?: string;
      isVip?: boolean;
      signal?: AbortSignal;
    }) => {
      const activeToken = requireToken();
      const response = await calculateBookingRequest(activeToken, {
        asset_ids: assetIds,
        cart_items: cartItems?.map((item) => ({
          service_id: item.serviceId,
          quantity: item.quantity,
        })),
        selected_bundle_service_ids: selectedBundleServiceIds,
        start_time: startTime,
        duration_hours: durationHours,
        end_time: endTime,
        is_vip: isVip,
      }, signal);

      return {
        durationMinutes: response.duration_minutes,
        durationHours: response.duration_hours,
        hourlyRateTotal: response.hourly_rate_total,
        totalCost: response.total_cost,
        totalPrice: response.total_price,
        hourlyTotalPrice: response.hourly_total_price,
        isVip: response.is_vip,
        endTime: response.end_time,
        cart: response.cart.map((item) => ({
          serviceId: item.service_id,
          serviceName: item.service_name,
          serviceKey: item.service_key,
          quantity: item.quantity,
          rate: item.rate,
        })),
        breakdown: response.breakdown.map((line) => ({
          type: line.type,
          phase: line.phase,
          serviceId: line.service_id,
          serviceName: line.service_name,
          serviceKey: line.service_key,
          quantity: line.quantity,
          rate: line.rate,
          subtotal: line.subtotal,
          requirements: line.requirements,
          manualPriority: line.manual_priority,
          savingsRatio: line.savings_ratio,
          isRecommendable: line.is_recommendable,
        })),
        assetBreakdown: response.asset_breakdown.map((asset) => ({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          serviceName: asset.service_name,
          roomId: asset.room_id,
          roomName: asset.room_name,
          roomNumber: asset.room_name ?? asset.room_number,
          assetOrder: asset.asset_order,
          hourlyPrice: asset.hourly_price,
        })),
      };
    },
    [requireToken]
  );

  const createBooking = useCallback(
    async ({
      assetIds,
      cartItems,
      selectedBundleServiceIds,
      startTime,
      durationHours,
      endTime,
      isVip,
      status,
      debtName,
      debtPhoneNumber,
    }: {
      assetIds?: number[];
      cartItems?: Array<{ serviceId: number; quantity: number }>;
      selectedBundleServiceIds?: number[];
      startTime: string;
      durationHours?: number;
      endTime?: string;
      isVip?: boolean;
      status: 'submitted' | 'debt_closed';
      debtName?: string;
      debtPhoneNumber?: string;
    }) => {
      const activeToken = requireToken();

      await createBookingRequest(activeToken, {
        asset_ids: assetIds,
        cart_items: cartItems?.map((item) => ({
          service_id: item.serviceId,
          quantity: item.quantity,
        })),
        selected_bundle_service_ids: selectedBundleServiceIds,
        start_time: startTime,
        duration_hours: durationHours,
        end_time: endTime,
        is_vip: isVip,
        status,
        debt_name: debtName,
        debt_phone_number: debtPhoneNumber,
      });

      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const endSession = useCallback(
    async (sessionId: number) => {
      const activeToken = requireToken();
      const endedSession = mapSessionRecord(await endSessionRequest(activeToken, sessionId));

      setSessions((current) => {
        const remainingSessions = current.filter((session) => session.backendId !== sessionId);
        const activeSessionRecords = remainingSessions.filter((session) => session.sessionStatus === 'active');
        const endedSessionRecords = remainingSessions
          .filter((session) => session.sessionStatus !== 'active')
          .concat(endedSession)
          .sort((left, right) => new Date(right.startTime).getTime() - new Date(left.startTime).getTime());

        return [...activeSessionRecords, ...endedSessionRecords];
      });

      await refreshDashboard(activeToken);
      return endedSession;
    },
    [refreshDashboard, requireToken]
  );

  const deleteSession = useCallback(
    async (sessionId: number) => {
      const activeToken = requireToken();

      await deleteSessionRequest(activeToken, sessionId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const markDebtPaid = useCallback(
    async (debtId: string) => {
      const activeToken = requireToken();
      await markDebtPaidRequest(activeToken, debtId);
      await refreshDashboard(activeToken);
    },
    [refreshDashboard, requireToken]
  );

  const deleteDebt = useCallback(
    async (debtId: string) => {
      const activeToken = requireToken();
      await deleteDebtRequest(activeToken, debtId);
      setDebts((current) => current.filter((record) => record.id !== debtId));
    },
    [requireToken]
  );

  const getServiceFinanceSummary = useCallback(async () => {
    const activeToken = requireToken();
    const response = await getServiceFinanceSummaryRequest(activeToken);

    if (typeof response !== 'object' || response === null || !('total_duration_seconds' in response) || !('total_duration_formatted' in response)) {
      throw new Error("Xizmatlar summary javobi noto'g'ri formatda keldi.");
    }

    return mapServiceFinanceSummary(response);
  }, [requireToken]);

  const getServiceFinanceDetails = useCallback(async () => {
    const activeToken = requireToken();
    const response = await getServiceFinanceDetailsRequest(activeToken);

    if (typeof response !== 'object' || response === null || !Array.isArray(response.assets) || !response.summary) {
      throw new Error("Xizmatlar tafsilotlari javobi noto'g'ri formatda keldi.");
    }

    return mapServiceFinanceDetailsResponse(response);
  }, [requireToken]);

  const servicesReady = services.length > 0;

  const value = useMemo(
    () => ({
      currentUser,
      summary,
      servicesReady,
      services,
      rooms,
      sales,
      debts,
      sessions,
      companies,
      assets,
      isCheckingAuth,
      isAuthenticated: Boolean(token),
      login,
      logout,
      refreshDashboard: async () => refreshDashboard(),
      createService,
      deleteService,
      createServiceBatch,
      createRoom,
      deleteRoom,
      deleteRoomAssets,
      createAsset,
      updateAsset,
      deleteAsset,
      saveWarehouseProduct,
      deleteWarehouseProduct,
      deleteManufacturer,
      exportManufacturerProducts,
      completeCheckoutSale,
      calculateBooking,
      createBooking,
      endSession,
      deleteSession,
      markDebtPaid,
      exportSales,
      deleteDebt,
      getServiceFinanceSummary,
      getServiceFinanceDetails,
    }),
    [
      assets,
      calculateBooking,
      companies,
      createAsset,
      createBooking,
      createRoom,
      createService,
      createServiceBatch,
      currentUser,
      debts,
      deleteAsset,
      deleteManufacturer,
      deleteRoom,
      deleteRoomAssets,
      deleteService,
      deleteSession,
      deleteWarehouseProduct,
      exportManufacturerProducts,
      endSession,
      exportSales,
      getServiceFinanceDetails,
      getServiceFinanceSummary,
      isCheckingAuth,
      login,
      logout,
      refreshDashboard,
      rooms,
      sales,
      saveWarehouseProduct,
      completeCheckoutSale,
      services,
      servicesReady,
      sessions,
      summary,
      token,
      updateAsset,
      markDebtPaid,
      deleteDebt,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
