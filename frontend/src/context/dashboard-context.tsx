'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  type ApiUser,
  type DashboardBootstrapResponse,
  calculateBookingRequest,
  createAssetRequest,
  createBookingRequest,
  createRoomRequest,
  createServiceRequest,
  createTariffRequest,
  createWarehouseItemRequest,
  deleteAssetRequest,
  deleteManufacturerRequest,
  deleteServiceRequest,
  deleteSessionRequest,
  deleteTariffRequest,
  deleteWarehouseItemRequest,
  endSessionRequest,
  getDashboardBootstrap,
  loginRequest,
  updateAssetRequest,
  updateTariffRequest,
  updateWarehouseItemRequest,
} from '@/lib/api';

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
  pendingSessions: number;
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
  unit: 'bottle' | 'box' | 'container' | 'bag';
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
  price: number;
  assetsCount: number;
}

export interface RoomRecord {
  id: string;
  backendId: number;
  name: string;
  assets: AssetDevice[];
}

export interface TariffCategoryPrice {
  id: string;
  category: string;
  hourlyPrice: number;
}

export interface Tariff {
  id: string;
  backendId: number;
  name: string;
  hourlyPrice: number;
  categoryPrices: TariffCategoryPrice[];
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
  totalUsageDurationMinutes: number;
  totalEarnedMoney: number;
}

export interface SaleRecord {
  id: string;
  room: string;
  basePrice: number;
  start: string;
  end: string;
  serviceCost: number;
  products: number;
  total: number;
  cash: number;
  terminal: number;
  click: number;
  payme: number;
  debt: number;
  paid: number;
  timestamp: number;
}

export interface SessionAssetSnapshot {
  id: number | null;
  name: string | null;
  category: string | null;
  serviceId?: number | null;
  roomId: number | null;
  roomName: string | null;
  roomNumber: string | null;
  hourlyPrice: number | null;
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
  tariff: {
    id: number | null;
    name: string | null;
    hourlyCost: number;
  };
  assets: SessionAssetSnapshot[];
}

export interface BookingCalculation {
  durationMinutes: number;
  durationHours: number | null;
  hourlyRateTotal: number;
  totalCost: number;
  isVip: boolean;
  endTime: string | null;
  assetBreakdown: Array<{
    id: number;
    name: string;
    category: string;
    roomId: number;
    roomName: string | null;
    roomNumber: string;
    hourlyPrice: number;
  }>;
}

interface DashboardContextType {
  currentUser: SessionUser | null;
  summary: DashboardSummary;
  services: ServiceItem[];
  rooms: RoomRecord[];
  tariffs: Tariff[];
  sales: SaleRecord[];
  sessions: SessionRecord[];
  companies: WarehouseCompany[];
  assets: AssetDevice[];
  isCheckingAuth: boolean;
  isAuthenticated: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  logout: () => void;
  refreshDashboard: () => Promise<void>;
  createService: (payload: { name: string; price: number }) => Promise<void>;
  deleteService: (service: ServiceItem) => Promise<void>;
  createRoom: (payload: { name: string }) => Promise<void>;
  createTariff: (payload: { name: string; categoryPrices: Array<{ category: string; hourlyPrice: number }> }) => Promise<void>;
  updateTariff: (payload: { backendId: number; name: string; categoryPrices: Array<{ category: string; hourlyPrice: number }> }) => Promise<void>;
  deleteTariff: (tariff: Tariff) => Promise<void>;
  createAsset: (payload: { name: string; serviceId: number; roomId: number }) => Promise<void>;
  updateAsset: (payload: { backendId: number; name: string; serviceId: number; roomId: number }) => Promise<void>;
  deleteAsset: (asset: AssetDevice) => Promise<void>;
  saveWarehouseProduct: (payload: {
    backendId?: number;
    manufacturer: string;
    name: string;
    barcode: string;
    quantity: number;
    unit: Product['unit'];
    purchasePrice: number;
    sellingPrice: number;
  }) => Promise<void>;
  deleteWarehouseProduct: (backendId: number) => Promise<void>;
  deleteManufacturer: (company: WarehouseCompany) => Promise<void>;
  calculateBooking: (payload: {
    assetIds: number[];
    startTime: string;
    durationHours?: number;
    endTime?: string;
    isVip?: boolean;
  }) => Promise<BookingCalculation>;
  createBooking: (payload: {
    tariffId?: number;
    assetIds: number[];
    startTime: string;
    durationHours?: number;
    endTime?: string;
    isVip?: boolean;
    status: 'submitted' | 'debt_closed';
    debtName?: string;
    debtPhoneNumber?: string;
  }) => Promise<void>;
  endSession: (sessionId: number) => Promise<void>;
  deleteSession: (sessionId: number) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const emptySummary: DashboardSummary = {
  activeSessions: 0,
  totalSessionDevices: 0,
  pendingSessions: 0,
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

function normalizeCategoryPricePayload(
  rows: Array<{ category: string; hourlyPrice: number }>
): Array<{ category: string; hourlyPrice: number }> {
  const seen = new Set<string>();
  const normalizedRows: Array<{ category: string; hourlyPrice: number }> = [];

  for (const row of rows) {
    const category = row.category.trim();
    const key = category.toLowerCase();
    const hourlyPrice = Number(row.hourlyPrice);

    if (!category || Number.isNaN(hourlyPrice) || hourlyPrice < 0 || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalizedRows.push({
      category,
      hourlyPrice,
    });
  }

  return normalizedRows;
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
    totalUsageDurationMinutes: asset.total_usage_duration_minutes,
    totalEarnedMoney: asset.total_earned_money,
  };
}

function mapBootstrapPayload(payload: DashboardBootstrapResponse) {
  return {
    currentUser: mapUser(payload.user),
    summary: {
      activeSessions: payload.summary.active_sessions,
      totalSessionDevices: payload.summary.total_session_devices,
      pendingSessions: payload.summary.pending_sessions,
      roomsCount: payload.summary.rooms_count,
      salesTotalToday: payload.summary.sales_total_today,
    },
    services: payload.services.map((service) => ({
      id: service.id,
      backendId: service.backend_id,
      name: service.name,
      price: service.price,
      assetsCount: service.assets_count,
    })),
    rooms: payload.rooms.map((room) => ({
      id: room.id,
      backendId: room.backend_id,
      name: room.name,
      assets: room.assets.map(mapAssetDevice),
    })),
    tariffs: payload.tariffs.map((tariff) => ({
      id: tariff.id,
      backendId: tariff.backend_id,
      name: tariff.name,
      hourlyPrice: tariff.hourly_price,
      categoryPrices: tariff.category_prices.map((price) => ({
        id: price.id,
        category: price.category,
        hourlyPrice: price.hourly_price,
      })),
    })),
    sales: payload.sales.map((sale) => ({
      id: sale.id,
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
    })),
    sessions: payload.sessions.map((session) => ({
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
      tariff: {
        id: session.tariff.id,
        name: session.tariff.name,
        hourlyCost: session.tariff.hourly_cost,
      },
      assets: session.assets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        category: asset.category,
        serviceId: asset.service_id,
        roomId: asset.room_id,
        roomName: asset.room_name,
        roomNumber: asset.room_name ?? asset.room_number,
        hourlyPrice: asset.hourly_price,
      })),
    })),
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

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [companies, setCompanies] = useState<WarehouseCompany[]>([]);
  const [assets, setAssets] = useState<AssetDevice[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const resetState = useCallback(() => {
    setCurrentUser(null);
    setSummary(emptySummary);
    setServices([]);
    setRooms([]);
    setTariffs([]);
    setSales([]);
    setSessions([]);
    setCompanies([]);
    setAssets([]);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
    setToken(null);
    resetState();
    setIsCheckingAuth(false);
  }, [resetState]);

  const refreshDashboard = useCallback(
    async (overrideToken?: string) => {
      const activeToken = overrideToken ?? token;

      if (!activeToken) {
        resetState();
        setIsCheckingAuth(false);
        return;
      }

      try {
        const payload = await getDashboardBootstrap(activeToken);
        const mapped = mapBootstrapPayload(payload);

        setCurrentUser(mapped.currentUser);
        setSummary(mapped.summary);
        setServices(mapped.services);
        setRooms(mapped.rooms);
        setTariffs(mapped.tariffs);
        setSales(mapped.sales);
        setSessions(mapped.sessions);
        setCompanies(mapped.companies);
        setAssets(mapped.assets);
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        throw error;
      } finally {
        setIsCheckingAuth(false);
      }
    },
    [logout, resetState, token]
  );

  useEffect(() => {
    const storedToken = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (!storedToken) {
      setIsCheckingAuth(false);
      return;
    }

    setToken(storedToken);
    void refreshDashboard(storedToken);
  }, [refreshDashboard]);

  const requireToken = useCallback(() => {
    if (!token) {
      throw new Error('Authentication token is missing.');
    }

    return token;
  }, [token]);

  const login = useCallback(
    async (phoneNumber: string, password: string) => {
      const response = await loginRequest(phoneNumber, password);
      localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, response.token);
      setToken(response.token);
      await refreshDashboard(response.token);
    },
    [refreshDashboard]
  );

  const createService = useCallback(
    async ({ name, price }: { name: string; price: number }) => {
      const activeToken = requireToken();

      if (!name.trim()) {
        throw new Error('Service name is required.');
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new Error('Service price must be zero or greater.');
      }

      await createServiceRequest(activeToken, {
        name: name.trim(),
        price,
      });

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const deleteService = useCallback(
    async (service: ServiceItem) => {
      const activeToken = requireToken();

      await deleteServiceRequest(activeToken, service.backendId);
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
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

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const createTariff = useCallback(
    async ({ name, categoryPrices }: { name: string; categoryPrices: Array<{ category: string; hourlyPrice: number }> }) => {
      const activeToken = requireToken();
      const normalizedCategoryPrices = normalizeCategoryPricePayload(categoryPrices);

      if (!name.trim()) {
        throw new Error('Tariff name is required.');
      }

      if (normalizedCategoryPrices.length === 0) {
        throw new Error('At least one tariff category price is required.');
      }

      await createTariffRequest(activeToken, {
        name: name.trim(),
        category_prices: normalizedCategoryPrices.map((row) => ({
          category: row.category,
          hourly_price: row.hourlyPrice,
        })),
      });

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const updateTariff = useCallback(
    async ({
      backendId,
      name,
      categoryPrices,
    }: {
      backendId: number;
      name: string;
      categoryPrices: Array<{ category: string; hourlyPrice: number }>;
    }) => {
      const activeToken = requireToken();
      const normalizedCategoryPrices = normalizeCategoryPricePayload(categoryPrices);

      if (!name.trim()) {
        throw new Error('Tariff name is required.');
      }

      if (normalizedCategoryPrices.length === 0) {
        throw new Error('At least one tariff category price is required.');
      }

      await updateTariffRequest(activeToken, backendId, {
        name: name.trim(),
        category_prices: normalizedCategoryPrices.map((row) => ({
          category: row.category,
          hourly_price: row.hourlyPrice,
        })),
      });

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const deleteTariff = useCallback(
    async (tariff: Tariff) => {
      const activeToken = requireToken();

      await deleteTariffRequest(activeToken, tariff.backendId);
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const createAsset = useCallback(
    async ({ name, serviceId, roomId }: { name: string; serviceId: number; roomId: number }) => {
      const activeToken = requireToken();
      const normalizedName = name.trim();

      if (!normalizedName) {
        throw new Error('Asset name is required.');
      }

      if (!Number.isFinite(serviceId) || serviceId <= 0) {
        throw new Error('Service category is required.');
      }

      if (!Number.isFinite(roomId) || roomId <= 0) {
        throw new Error('Room is required.');
      }

      await createAssetRequest(activeToken, {
        name: normalizedName,
        service_id: serviceId,
        room_id: roomId,
      });

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const updateAsset = useCallback(
    async ({ backendId, name, serviceId, roomId }: { backendId: number; name: string; serviceId: number; roomId: number }) => {
      const activeToken = requireToken();
      const normalizedName = name.trim();

      if (!normalizedName) {
        throw new Error('Asset name is required.');
      }

      if (!Number.isFinite(serviceId) || serviceId <= 0) {
        throw new Error('Service category is required.');
      }

      if (!Number.isFinite(roomId) || roomId <= 0) {
        throw new Error('Room is required.');
      }

      await updateAssetRequest(activeToken, backendId, {
        name: normalizedName,
        service_id: serviceId,
        room_id: roomId,
      });

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const deleteAsset = useCallback(
    async (asset: AssetDevice) => {
      const activeToken = requireToken();

      await deleteAssetRequest(activeToken, asset.backendId);
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const saveWarehouseProduct = useCallback(
    async (payload: {
      backendId?: number;
      manufacturer: string;
      name: string;
      barcode: string;
      quantity: number;
      unit: Product['unit'];
      purchasePrice: number;
      sellingPrice: number;
    }) => {
      const activeToken = requireToken();
      const requestPayload = {
        manufacturer: payload.manufacturer,
        product_name: payload.name,
        shtrix_code: payload.barcode,
        unit: payload.unit,
        count: payload.quantity,
        purchase_price: payload.purchasePrice,
        sell_price: payload.sellingPrice,
      };

      if (payload.backendId) {
        await updateWarehouseItemRequest(activeToken, payload.backendId, requestPayload);
      } else {
        await createWarehouseItemRequest(activeToken, requestPayload);
      }

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const deleteWarehouseProduct = useCallback(
    async (backendId: number) => {
      const activeToken = requireToken();

      await deleteWarehouseItemRequest(activeToken, backendId);
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const deleteManufacturer = useCallback(
    async (company: WarehouseCompany) => {
      const activeToken = requireToken();

      await deleteManufacturerRequest(activeToken, company.backendId);
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const calculateBooking = useCallback(
    async ({
      assetIds,
      startTime,
      durationHours,
      endTime,
      isVip,
    }: {
      assetIds: number[];
      startTime: string;
      durationHours?: number;
      endTime?: string;
      isVip?: boolean;
    }) => {
      const activeToken = requireToken();
      const response = await calculateBookingRequest(activeToken, {
        asset_ids: assetIds,
        start_time: startTime,
        duration_hours: durationHours,
        end_time: endTime,
        is_vip: isVip,
      });

      return {
        durationMinutes: response.duration_minutes,
        durationHours: response.duration_hours,
        hourlyRateTotal: response.hourly_rate_total,
        totalCost: response.total_cost,
        isVip: response.is_vip,
        endTime: response.end_time,
        assetBreakdown: response.asset_breakdown.map((asset) => ({
          id: asset.id,
          name: asset.name,
          category: asset.category,
          roomId: asset.room_id,
          roomName: asset.room_name,
          roomNumber: asset.room_name ?? asset.room_number,
          hourlyPrice: asset.hourly_price,
        })),
      };
    },
    [requireToken]
  );

  const createBooking = useCallback(
    async ({
      tariffId,
      assetIds,
      startTime,
      durationHours,
      endTime,
      isVip,
      status,
      debtName,
      debtPhoneNumber,
    }: {
      tariffId?: number;
      assetIds: number[];
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
        tariff_id: tariffId,
        asset_ids: assetIds,
        start_time: startTime,
        duration_hours: durationHours,
        end_time: endTime,
        is_vip: isVip,
        status,
        debt_name: debtName,
        debt_phone_number: debtPhoneNumber,
      });

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const endSession = useCallback(
    async (sessionId: number) => {
      const activeToken = requireToken();

      await endSessionRequest(activeToken, sessionId);
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const deleteSession = useCallback(
    async (sessionId: number) => {
      const activeToken = requireToken();

      await deleteSessionRequest(activeToken, sessionId);
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const value = useMemo(
    () => ({
      currentUser,
      summary,
      services,
      rooms,
      tariffs,
      sales,
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
      createRoom,
      createTariff,
      updateTariff,
      deleteTariff,
      createAsset,
      updateAsset,
      deleteAsset,
      saveWarehouseProduct,
      deleteWarehouseProduct,
      deleteManufacturer,
      calculateBooking,
      createBooking,
      endSession,
      deleteSession,
    }),
    [
      assets,
      calculateBooking,
      companies,
      createAsset,
      createBooking,
      createRoom,
      createService,
      createTariff,
      currentUser,
      deleteAsset,
      deleteManufacturer,
      deleteService,
      deleteSession,
      deleteTariff,
      deleteWarehouseProduct,
      endSession,
      isCheckingAuth,
      login,
      logout,
      refreshDashboard,
      rooms,
      sales,
      saveWarehouseProduct,
      services,
      sessions,
      summary,
      tariffs,
      token,
      updateAsset,
      updateTariff,
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
