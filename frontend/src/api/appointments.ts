import { client } from './client';
import type { Appointment, BookAppointmentRequest, RescheduleAppointmentRequest } from '../types';

export async function getMyAppointments(): Promise<Appointment[]> {
  return client.get<Appointment[]>('/api/v1/patients/me/appointments', true);
}

export async function getAppointment(id: number): Promise<Appointment> {
  return client.get<Appointment>(`/api/v1/appointments/${id}`, true);
}

export async function bookAppointment(req: BookAppointmentRequest): Promise<Appointment> {
  return client.post<Appointment>('/api/v1/appointments', req, true);
}

export async function rescheduleAppointment(id: number, req: RescheduleAppointmentRequest): Promise<Appointment> {
  return client.patch<Appointment>(`/api/v1/appointments/${id}/reschedule`, req, true);
}

export async function cancelAppointment(id: number): Promise<{ message: string }> {
  return client.post<{ message: string }>(`/api/v1/appointments/${id}/cancel`, {}, true);
}
