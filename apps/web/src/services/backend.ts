/**
 * BACKEND SERVICE
 * Comunicacao com o backend hospedado no Render
 *
 * Uso: import { apiRequest } from "@/services/backend";
 */

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://lia-chat-api.onrender.com";

/**
 * Faz uma requisicao ao backend
 */
export async function apiRequest<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${BACKEND_URL}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Erro na requisicao: ${response.status}`);
  }

  return response.json();
}

/**
 * GET request ao backend
 */
export async function apiGet<T = any>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "GET" });
}

/**
 * POST request ao backend
 */
export async function apiPost<T = any>(path: string, data: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PUT request ao backend
 */
export async function apiPut<T = any>(path: string, data: any): Promise<T> {
  return apiRequest<T>(path, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request ao backend
 */
export async function apiDelete<T = any>(path: string): Promise<T> {
  return apiRequest<T>(path, { method: "DELETE" });
}

/**
 * Verifica status do backend
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    await apiGet("/health");
    return true;
  } catch {
    return false;
  }
}

export default {
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
  checkBackendHealth,
};
