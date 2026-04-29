'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  type ApiUser,
  type DashboardBootstrapResponse,
  calculateBookingRequest,
  createAssetRequest,
  createBookingRequest,
  createServiceRequest,
  createTariffRequest,
  createWarehouseItemRequest,
  deleteAssetRequest,
  deleteManufacturerRequest,
  deleteServiceRequest,
  deleteTariffRequest,
  deleteWarehouseItemRequest,
  getDashboardBootstrap,
  loginRequest,
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

export interface ServiceRoom {
  id: string;
  roomId: number;
  roomNumber: string;
  items: string[];
  serviceIds: number[];
}

export interface Tariff {
  id: string;
  backendId: number;
  name: string;
  hourlyPrice: number;
}

export interface AssetDevice {
  id: string;
  backendId: number;
  category: 'Computer' | 'PS';
  roomId: number;
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

interface DashboardContextType {
  currentUser: SessionUser | null;
  summary: DashboardSummary;
  services: ServiceRoom[];
  tariffs: Tariff[];
  sales: SaleRecord[];
  companies: WarehouseCompany[];
  assets: AssetDevice[];
  isCheckingAuth: boolean;
  isAuthenticated: boolean;
  login: (phoneNumber: string, password: string) => Promise<void>;
  logout: () => void;
  refreshDashboard: () => Promise<void>;
  createServiceRoom: (payload: { roomNumber: string; items: string[] }) => Promise<void>;
  deleteServiceRoom: (room: ServiceRoom) => Promise<void>;
  createTariff: (payload: { name: string; hourlyPrice: number }) => Promise<void>;
  deleteTariff: (tariff: Tariff) => Promise<void>;
  createAsset: (payload: { category: 'Computer' | 'PS'; roomId: number }) => Promise<void>;
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
    tariffId: number;
    assetIds: number[];
    startTime: string;
    endTime: string;
  }) => Promise<{ durationMinutes: number; totalCost: number }>;
  createBooking: (payload: {
    tariffId: number;
    assetIds: number[];
    startTime: string;
    endTime: string;
    status: 'submitted' | 'debt_closed';
    debtName?: string;
    debtPhoneNumber?: string;
  }) => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

const emptySummary: DashboardSummary = {
  activeSessions: 0,
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

function mapBootstrapPayload(payload: DashboardBootstrapResponse) {
  return {
    currentUser: mapUser(payload.user),
    summary: {
      activeSessions: payload.summary.active_sessions,
      pendingSessions: payload.summary.pending_sessions,
      roomsCount: payload.summary.rooms_count,
      salesTotalToday: payload.summary.sales_total_today,
    },
    services: payload.services.map((service) => ({
      id: service.id,
      roomId: service.room_id,
      roomNumber: service.room_number,
      items: service.items,
      serviceIds: service.service_ids,
    })),
    tariffs: payload.tariffs.map((tariff) => ({
      id: tariff.id,
      backendId: tariff.backend_id,
      name: tariff.name,
      hourlyPrice: tariff.hourly_price,
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
    assets: payload.assets.map((asset) => ({
      id: asset.id,
      backendId: asset.backend_id,
      category: asset.category,
      roomId: asset.room_id,
      roomNumber: asset.room_number,
      totalUsageDurationMinutes: asset.total_usage_duration_minutes,
      totalEarnedMoney: asset.total_earned_money,
    })),
  };
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [summary, setSummary] = useState<DashboardSummary>(emptySummary);
  const [services, setServices] = useState<ServiceRoom[]>([]);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [companies, setCompanies] = useState<WarehouseCompany[]>([]);
  const [assets, setAssets] = useState<AssetDevice[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  const resetState = useCallback(() => {
    setCurrentUser(null);
    setSummary(emptySummary);
    setServices([]);
    setTariffs([]);
    setSales([]);
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
        setTariffs(mapped.tariffs);
        setSales(mapped.sales);
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

  const createServiceRoom = useCallback(
    async ({ roomNumber, items }: { roomNumber: string; items: string[] }) => {
      const activeToken = requireToken();
      const parsedRoomNumber = Number(roomNumber);

      if (!Number.isFinite(parsedRoomNumber) || parsedRoomNumber <= 0) {
        throw new Error('Room number must be a positive number.');
      }

      await Promise.all(
        items.map((item) =>
          createServiceRequest(activeToken, {
            game_name: item,
            room_id: parsedRoomNumber,
          })
        )
      );

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const deleteServiceRoom = useCallback(
    async (room: ServiceRoom) => {
      const activeToken = requireToken();

      await Promise.all(room.serviceIds.map((serviceId) => deleteServiceRequest(activeToken, serviceId)));
      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const createTariff = useCallback(
    async ({ name, hourlyPrice }: { name: string; hourlyPrice: number }) => {
      const activeToken = requireToken();

      await createTariffRequest(activeToken, {
        name,
        hourly_cost: hourlyPrice,
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
    async ({ category, roomId }: { category: 'Computer' | 'PS'; roomId: number }) => {
      const activeToken = requireToken();

      await createAssetRequest(activeToken, {
        category,
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
      tariffId,
      assetIds,
      startTime,
      endTime,
    }: {
      tariffId: number;
      assetIds: number[];
      startTime: string;
      endTime: string;
    }) => {
      const activeToken = requireToken();
      const response = await calculateBookingRequest(activeToken, {
        tariff_id: tariffId,
        asset_ids: assetIds,
        start_time: startTime,
        end_time: endTime,
      });

      return {
        durationMinutes: response.duration_minutes,
        totalCost: response.total_cost,
      };
    },
    [requireToken]
  );

  const createBooking = useCallback(
    async ({
      tariffId,
      assetIds,
      startTime,
      endTime,
      status,
      debtName,
      debtPhoneNumber,
    }: {
      tariffId: number;
      assetIds: number[];
      startTime: string;
      endTime: string;
      status: 'submitted' | 'debt_closed';
      debtName?: string;
      debtPhoneNumber?: string;
    }) => {
      const activeToken = requireToken();

      await createBookingRequest(activeToken, {
        tariff_id: tariffId,
        asset_ids: assetIds,
        start_time: startTime,
        end_time: endTime,
        status,
        debt_name: debtName,
        debt_phone_number: debtPhoneNumber,
      });

      await refreshDashboard();
    },
    [refreshDashboard, requireToken]
  );

  const value = useMemo(
    () => ({
      currentUser,
      summary,
      services,
      tariffs,
      sales,
      companies,
      assets,
      isCheckingAuth,
      isAuthenticated: Boolean(token),
      login,
      logout,
      refreshDashboard: async () => refreshDashboard(),
      createServiceRoom,
      deleteServiceRoom,
      createTariff,
      deleteTariff,
      createAsset,
      deleteAsset,
      saveWarehouseProduct,
      deleteWarehouseProduct,
      deleteManufacturer,
      calculateBooking,
      createBooking,
    }),
    [
      assets,
      calculateBooking,
      companies,
      createAsset,
      createBooking,
      createServiceRoom,
      createTariff,
      currentUser,
      deleteAsset,
      deleteManufacturer,
      deleteServiceRoom,
      deleteTariff,
      deleteWarehouseProduct,
      isCheckingAuth,
      login,
      logout,
      refreshDashboard,
      sales,
      saveWarehouseProduct,
      services,
      summary,
      tariffs,
      token,
    ]
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
