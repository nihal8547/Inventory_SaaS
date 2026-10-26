import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from "axios";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // In browser: if not on local machine, always use relative /api/v1 through same-origin proxy
    if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
      return "/api/v1";
    }
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl && !envUrl.includes("localhost")) {
      return envUrl;
    }
    return "/api/v1";
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";
};

interface CacheEntry {
  data: any;
  timestamp: number;
}

const CACHE_TTL = 30000; // 30 seconds
const clientCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<any>>();

const CACHEABLE_PREFIXES = [
  '/branches',
  '/products/categories',
  '/products/brands',
  '/products/units',
  '/roles',
  '/admin/plans',
  '/mail/config',
  '/settings',
];

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: getBaseUrl(),
      headers: { "Content-Type": "application/json" },
      withCredentials: true,
    });

    this.client.interceptors.request.use((config) => {
      if (typeof window !== "undefined") {
        // Guarantee production browser requests never attempt to call localhost
        if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
          if (config.baseURL && config.baseURL.includes("localhost:3001")) {
            config.baseURL = "/api/v1";
          }
          if (config.url && config.url.includes("localhost:3001")) {
            config.url = config.url.replace(/https?:\/\/localhost:3001/g, "");
          }
        }
        const token = localStorage.getItem("access_token");
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        let tenantId = localStorage.getItem("tenant_id");
        if (!tenantId) {
          try {
            const rawStore = localStorage.getItem("auth-storage");
            if (rawStore) {
              const parsed = JSON.parse(rawStore);
              tenantId = parsed?.state?.currentTenant?.id || parsed?.state?.tenants?.[0]?.id;
              if (tenantId) {
                localStorage.setItem("tenant_id", tenantId);
              }
            }
          } catch {}
        }
        if (tenantId) {
          config.headers["X-Tenant-ID"] = tenantId;
        }
        const branchId = localStorage.getItem("branch_id");
        if (branchId) {
          config.headers["X-Branch-ID"] = branchId;
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401 && typeof window !== "undefined") {
          const pathname = window.location.pathname;
          if (!pathname.startsWith('/login') && !pathname.startsWith('/register')) {
            localStorage.removeItem("access_token");
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T>(url: string, configOrParams?: any): Promise<any> {
    const isCacheable = CACHEABLE_PREFIXES.some((prefix) => url.startsWith(prefix));
    const skipCache = configOrParams?.skipCache || configOrParams?.params?.skipCache;
    const cacheKey = `${url}:${JSON.stringify(configOrParams || {})}`;

    // Return cached response if valid
    if (isCacheable && !skipCache) {
      const cached = clientCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
      }
    }

    // In-flight request deduplication: return existing pending promise
    if (inFlightRequests.has(cacheKey)) {
      return inFlightRequests.get(cacheKey);
    }

    const requestPromise = (async () => {
      try {
        const res = await (configOrParams && typeof configOrParams === 'object' && ('params' in configOrParams || 'headers' in configOrParams)
          ? this.client.get<T>(url, configOrParams)
          : this.client.get<T>(url, { params: configOrParams }));

        if (isCacheable && !skipCache) {
          clientCache.set(cacheKey, { data: res, timestamp: Date.now() });
        }
        return res;
      } finally {
        inFlightRequests.delete(cacheKey);
      }
    })();

    inFlightRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  post<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    this.clearCache();
    return this.client.post<T>(url, data, config);
  }

  put<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    this.clearCache();
    return this.client.put<T>(url, data, config);
  }

  patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig) {
    this.clearCache();
    return this.client.patch<T>(url, data, config);
  }

  delete<T>(url: string, config?: AxiosRequestConfig) {
    this.clearCache();
    return this.client.delete<T>(url, config);
  }

  clearCache() {
    clientCache.clear();
    inFlightRequests.clear();
  }
}

export const api = new ApiClient();

export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string | string[] };
    if (typeof data?.message === "string") return data.message;
    if (Array.isArray(data?.message)) return data.message[0];
    return error.message;
  }
  return "An unexpected error occurred";
}
