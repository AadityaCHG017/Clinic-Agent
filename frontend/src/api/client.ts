import type { ApiResponse } from '../types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const TOKEN_KEY = 'clinic_jwt_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  auth?: boolean;
}

export class ApiClientError extends Error {
  public code: string;
  public status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, auth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  try {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      const errData = data as { success: false; error: { code: string; message: string } };
      const friendlyMessage = friendlyError(errData.error.code, errData.error.message);
      throw new ApiClientError(friendlyMessage, errData.error.code, response.status);
    }

    return (data as { success: true; data: T }).data;
  } catch (err) {
    if (err instanceof ApiClientError) {
      throw err;
    }
    throw new ApiClientError(
      'Unable to connect to the clinic service. Please check your internet connection and try again.',
      'NETWORK_ERROR',
      0
    );
  }
}

function friendlyError(code: string, message: string): string {
  // Use specific backend error message first if present
  if (message && message.trim().length > 0) {
    return message;
  }

  const map: Record<string, string> = {
    VALIDATION_ERROR: 'Please check your information and try again.',
    REGISTRATION_FAILED: 'Registration failed. This email may already be in use.',
    LOGIN_FAILED: 'Incorrect email or password. Please try again.',
    PASSWORD_CHANGE_FAILED: 'Could not change password. Please verify your current password.',
    USER_NOT_FOUND: 'Your profile could not be found.',
    DOCTORS_FETCH_FAILED: 'Unable to load doctors. Please try again.',
    DOCTOR_NOT_FOUND: 'This doctor could not be found.',
    AVAILABILITY_FETCH_FAILED: 'Unable to load availability. Please try again.',
    BOOKING_FAILED: 'Could not book this appointment. The time slot may no longer be available.',
    FETCH_FAILED: 'Unable to load your appointments. Please try again.',
    APPOINTMENT_NOT_FOUND: 'This appointment could not be found.',
    RESCHEDULE_FAILED: 'Could not reschedule this appointment. Please choose another time.',
    CANCELLATION_FAILED: 'Could not cancel this appointment. Please try again.',
    AGENT_ERROR: 'The AI assistant encountered an issue. Please try again.',
    MISSING_DATE: 'A date is required to check availability.',
    INVALID_ID: 'Invalid ID provided.',
  };

  return map[code] || 'Something went wrong. Please try again.';
}

export const client = {
  get: <T>(path: string, auth = false) => request<T>(path, { method: 'GET', auth }),
  post: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'POST', body, auth }),
  patch: <T>(path: string, body: unknown, auth = false) => request<T>(path, { method: 'PATCH', body, auth }),
};

export async function checkHealth(): Promise<boolean> {
  try {
    const data = await fetch(`${BASE_URL}/healthz`);
    const json = await data.json();
    return json.success === true;
  } catch {
    return false;
  }
}
