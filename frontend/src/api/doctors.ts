import { client } from './client';
import type { Doctor, AvailableSlot } from '../types';

export async function getDoctors(specialization?: string): Promise<Doctor[]> {
  const query = specialization ? `?specialization=${encodeURIComponent(specialization)}` : '';
  return client.get<Doctor[]>(`/api/v1/doctors${query}`);
}

export async function getDoctor(id: number): Promise<Doctor> {
  return client.get<Doctor>(`/api/v1/doctors/${id}`);
}

export async function getDoctorAvailability(id: number, date: string): Promise<AvailableSlot[]> {
  return client.get<AvailableSlot[]>(`/api/v1/doctors/${id}/availability?date=${date}`);
}
