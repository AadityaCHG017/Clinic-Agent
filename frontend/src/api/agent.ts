import { client } from './client';
import type { ChatRequest, ChatResponse } from '../types';

export async function sendMessage(req: ChatRequest): Promise<ChatResponse> {
  return client.post<ChatResponse>('/api/v1/agent/chat', req, true);
}
