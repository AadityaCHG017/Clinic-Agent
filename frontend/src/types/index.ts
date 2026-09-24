// ============================================================
// API Response Wrapper
// ============================================================
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

// ============================================================
// Auth Types
// ============================================================
export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

// ============================================================
// Doctor Types
// ============================================================
export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  email: string;
  phone: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AvailableSlot {
  doctor_id: number;
  doctor_name: string;
  specialization: string;
  date: string;        // YYYY-MM-DD
  start_time: string;  // HH:MM
  end_time: string;    // HH:MM
  is_available: boolean;
}

// ============================================================
// Appointment Types
// ============================================================
export type AppointmentStatus = 'scheduled' | 'cancelled' | 'completed';

export interface Appointment {
  id: number;
  patient_id: number;
  patient_name?: string;
  doctor_id: number;
  doctor_name: string;
  doctor_specialty: string;
  appointment_date: string; // YYYY-MM-DD
  start_time: string;       // HH:MM
  end_time: string;         // HH:MM
  status: AppointmentStatus;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface BookAppointmentRequest {
  doctor_id: number;
  appointment_date: string; // YYYY-MM-DD
  start_time: string;       // HH:MM
  end_time?: string;        // HH:MM optional
  reason?: string;
}

export interface RescheduleAppointmentRequest {
  new_date: string;       // YYYY-MM-DD
  new_start_time: string; // HH:MM
  new_end_time?: string;  // HH:MM optional
}

// ============================================================
// Agent Types
// ============================================================
export interface ToolCallLog {
  tool_name: string;
  input: string;
  output: unknown;
}

export interface ChatRequest {
  message: string;
}

export interface ChatResponse {
  reply: string;
  tools_used?: ToolCallLog[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  tools_used?: ToolCallLog[];
  timestamp: Date;
  isLoading?: boolean;
  isError?: boolean;
}
