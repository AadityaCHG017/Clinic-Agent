import { Heart, User } from 'lucide-react';
import type { ChatMessage } from '../../types';

interface ChatMessageProps {
  message: ChatMessage;
}

export default function ChatMessageBubble({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`chat-message ${isUser ? 'user-message' : 'assistant-message'}`}>
      <div className="chat-avatar" aria-hidden="true">
        {isUser ? <User size={18} /> : <Heart size={18} />}
      </div>
      <div className="chat-bubble">
        {message.isLoading ? (
          <div className="chat-typing" aria-label="AI is working on your request">
            <span />
            <span />
            <span />
          </div>
        ) : (
          <>
            <div className="chat-content">
              {renderFormattedContent(message.content)}
            </div>
            {message.tools_used && message.tools_used.length > 0 && (
              <div className="chat-tools-used" aria-label="AI actions performed">
                {message.tools_used.map((tool, i) => (
                  <div key={i} className="chat-tool-item">
                    <span className="chat-tool-check" aria-hidden="true">✓</span>
                    <span className="chat-tool-name">{formatToolName(tool.tool_name)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function renderFormattedContent(content: string) {
  if (!content) return null;

  const lines = content.split('\n');
  return lines.map((line, lineIdx) => {
    // Basic Markdown formatting for bold **text**, code `text`, and italic *text*
    const parts = line.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g);

    return (
      <div key={lineIdx} className={line.startsWith('•') ? 'chat-bullet-line' : 'chat-line'}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={partIdx} className="chat-inline-code">{part.slice(1, -1)}</code>;
          }
          if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
            return <em key={partIdx}>{part.slice(1, -1)}</em>;
          }
          return part;
        })}
        {lineIdx < lines.length - 1 && <span className="chat-line-break" />}
      </div>
    );
  });
}

function formatToolName(name: string): string {
  const map: Record<string, string> = {
    find_doctors: 'Searched doctor directory',
    get_doctor_availability: 'Checked availability slots',
    get_patient_appointments: 'Retrieved your appointments',
    book_appointment: 'Booked appointment with clinic',
    cancel_appointment: 'Cancelled appointment',
    reschedule_appointment: 'Rescheduled appointment',
  };
  return map[name] || name.replace(/_/g, ' ');
}
