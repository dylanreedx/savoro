import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "savoro_auth_token";

export function getApiUrl() {
  return API_URL;
}

export async function getAuthToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// 401 listener — components can subscribe to auto-redirect on auth failure
// ---------------------------------------------------------------------------
type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();

export function onAuthExpired(listener: AuthExpiredListener): () => void {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
}

function notifyAuthExpired() {
  authExpiredListeners.forEach((fn) => fn());
}

// ---------------------------------------------------------------------------
// API client
// ---------------------------------------------------------------------------
type RequestOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
};

export async function api<T = unknown>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    // Token expired or invalid — clear it and notify listeners
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    notifyAuthExpired();
    throw new ApiError("Unauthorized", 401);
  }

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error ?? "Request failed", res.status);
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Public API client — no auth header, no 401 listener
// ---------------------------------------------------------------------------
export async function publicApi<T = unknown>(
  path: string,
  options: Omit<RequestInit, "body"> & { body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new ApiError(data.error ?? "Request failed", res.status);
  }

  return data as T;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
