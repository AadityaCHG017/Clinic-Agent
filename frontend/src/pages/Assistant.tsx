import { useEffect, useState, useRef } from 'react';
import { Send, Trash2, Bot, Heart, Bell, Calendar, Clock } from 'lucide-react';
import { sendMessage } from '../api/agent';
import { getMyAppointments } from '../api/appointments';
import { useAuth } from '../context/AuthContext';
import ChatMessageBubble from '../components/agent/ChatMessage';
import { ApiClientError } from '../api/client';
import type { ChatMessage, Appointment } from '../types';
import { generateId, formatShortDate, formatTime } from '../utils';

const SUGGESTED_PROMPTS = [
  'Show available doctors',
  'Show my appointments',
  'Book Dr. Sarah tomorrow at 09:00 AM',
  'Cancel my appointment',
  'Reschedule my appointment',
];

export default function Assistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [upcomingAppt, setUpcomingAppt] = useState<Appointment | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = user ? `clinic_chat_history_${user.id}` : null;

  // Load chat history from localStorage or set welcome message
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed);
        return;
      } catch {
        // Fallback if JSON parse fails
      }
    }

    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello ${user?.name?.split(' ')[0] || 'there'} 👋\n\nI'm your AI health assistant. I can manage all your appointments for you:\n\n• **Show available doctors**: Ask *"Show available doctors"* or *"Find a dermatologist"*\n• **Book Appointment**: Say *"Book Dr. Sarah tomorrow at 9:00 AM"*\n• **Cancel Appointment**: Simply say *"Cancel my appointment"* or *"Cancel Dr. Sarah"*\n• **Reschedule Appointment**: Say *"Reschedule Dr. Sarah to tomorrow at 10:00 AM"*\n\nJust tell me what you need!`,
        timestamp: new Date(),
      },
    ]);
  }, [user, storageKey]);

  // Fetch upcoming appointment for Reminder Banner
  useEffect(() => {
    getMyAppointments()
      .then((data) => {
        const safe = Array.isArray(data) ? data : [];
        const scheduled = safe.filter((a) => a && a.status === 'scheduled');
        if (scheduled.length > 0) {
          scheduled.sort((a, b) => {
            const da = new Date(`${a.appointment_date}T${a.start_time}`);
            const db = new Date(`${b.appointment_date}T${b.start_time}`);
            return da.getTime() - db.getTime();
          });
          setUpcomingAppt(scheduled[0]);
        } else {
          setUpcomingAppt(null);
        }
      })
      .catch(() => setUpcomingAppt(null));
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (storageKey && messages.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    }
  }, [messages, storageKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || isSending) return;

    setInput('');

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };

    const loadingMsg: ChatMessage = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setIsSending(true);

    try {
      const response = await sendMessage({ message: msg });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? {
                ...m,
                content: response.reply,
                tools_used: response.tools_used,
                isLoading: false,
              }
            : m
        )
      );

      // Refresh upcoming appointment reminder banner if booking/cancellation happened
      getMyAppointments().then((data) => {
        const safe = Array.isArray(data) ? data : [];
        const scheduled = safe.filter((a) => a && a.status === 'scheduled');
        setUpcomingAppt(scheduled.length > 0 ? scheduled[0] : null);
      });
    } catch (err) {
      const errorText =
        err instanceof ApiClientError
          ? err.message
          : 'Sorry, I encountered an issue communicating with the backend. Please try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: errorText, isLoading: false, isError: true }
            : m
        )
      );
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    if (storageKey) {
      localStorage.removeItem(storageKey);
    }
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello again ${user?.name?.split(' ')[0] || ''}! How can I help you today?`,
        timestamp: new Date(),
      },
    ]);
  };

  return (
    <div className="assistant-page">
      {/* Header */}
      <div className="assistant-header">
        <div className="assistant-header-info">
          <div className="assistant-avatar">
            <Heart size={22} />
          </div>
          <div>
            <h1 className="assistant-title">AI Appointment Assistant</h1>
            <p className="assistant-subtitle">Autonomous Healthcare Agent</p>
          </div>
        </div>
        <button
          className="btn btn-ghost btn-sm"
          onClick={clearChat}
          aria-label="Clear conversation history"
          title="Clear conversation history"
        >
          <Trash2 size={18} />
          <span className="hide-mobile">Clear Chat</span>
        </button>
      </div>

      {/* Appointment Reminder Banner */}
      {upcomingAppt && (
        <div className="chat-reminder-banner" role="region" aria-label="Appointment Reminder">
          <div className="reminder-icon">
            <Bell size={20} />
          </div>
          <div className="reminder-content">
            <span className="reminder-title">🔔 Appointment Reminder</span>
            <span className="reminder-details">
              You have an upcoming appointment with <strong>{upcomingAppt.doctor_name}</strong> ({upcomingAppt.doctor_specialty})
            </span>
            <div className="reminder-meta">
              <span><Calendar size={14} /> {formatShortDate(upcomingAppt.appointment_date)}</span>
              <span><Clock size={14} /> {formatTime(upcomingAppt.start_time)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="chat-window" role="log" aria-label="Conversation" aria-live="polite">
        {messages.map((msg) => (
          <ChatMessageBubble key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggested Prompts */}
      <div className="suggested-prompts">
        <p className="suggested-prompts-label">Quick actions:</p>
        <div className="suggested-prompts-list">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              className="suggested-prompt-btn"
              onClick={() => handleSend(prompt)}
              disabled={isSending}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper">
          <textarea
            ref={inputRef}
            className="chat-input"
            placeholder="Type your message... (e.g. 'Cancel my appointment', 'Book Dr. Sarah tomorrow at 9')"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            rows={2}
            aria-label="Message input"
            aria-multiline="true"
          />
          <button
            className="chat-send-btn"
            onClick={() => handleSend()}
            disabled={isSending || !input.trim()}
            aria-label="Send message"
          >
            {isSending ? <Bot size={20} className="spinning" /> : <Send size={20} />}
          </button>
        </div>
        <p className="chat-input-hint">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
