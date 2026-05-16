import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useEffect, useRef } from "react";

const SUGGESTIONS = [
  "¿Qué modelos Rieju tenéis?",
  "¿Cuál es el horario del taller?",
  "¿Cómo agendo una cita?",
  "¿Hacéis diagnóstico electrónico?",
];

const PRIMARY = "#1F3F7A";
const PRIMARY_DARK = "#16305e";

function getMessageText(message: { parts: Array<{ type: string; text?: string }> }): string {
  return message.parts
    .filter(p => p.type === "text")
    .map(p => p.text ?? "")
    .join("");
}

export default function ChatBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: () => {
      setChatError("No se pudo conectar con el asistente. Llámanos al +34 920 254 044.");
    },
  });

  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    setChatError(null);
    sendMessage({ text: inputValue });
    setInputValue("");
  };

  const handleSuggestion = (text: string) => {
    setChatError(null);
    sendMessage({ text });
  };

  return (
    <>
      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: "13rem",
          right: "1.5rem",
          width: "340px",
          height: "460px",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          display: "flex",
          flexDirection: "column",
          zIndex: 200,
          overflow: "hidden",
          fontFamily: "Inter, sans-serif",
        }}>
          {/* Header */}
          <div style={{
            background: PRIMARY,
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <div style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 700,
                color: "white",
                fontSize: "1rem",
                flexShrink: 0,
              }}>M</div>
              <div>
                <div style={{ color: "white", fontWeight: 700, fontSize: "0.9rem" }}>
                  Asistente MOTOKASS
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.72rem", marginTop: "1px" }}>
                  ● En línea
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: "8px",
                color: "white",
                width: "28px",
                height: "28px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1rem",
              }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: "auto",
            padding: "1rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}>
            {/* Welcome */}
            <div style={{
              background: "#f1f5f9",
              borderRadius: "12px",
              padding: "0.85rem 1rem",
              fontSize: "0.84rem",
              color: "#374151",
              lineHeight: 1.5,
            }}>
              ¡Hola! Puedo ayudarte con información sobre motos, el taller o citas previas.
            </div>

            {/* Suggestions */}
            {messages.length === 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                {SUGGESTIONS.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    style={{
                      background: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      padding: "0.5rem 0.85rem",
                      fontSize: "0.78rem",
                      color: PRIMARY,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "#f0f4ff")}
                    onMouseLeave={e => (e.currentTarget.style.background = "white")}
                  >{s}</button>
                ))}
              </div>
            )}

            {/* Conversation */}
            {messages.map(m => {
              const text = getMessageText(m as any);
              if (!text) return null;
              return (
                <div
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div style={{
                    maxWidth: "82%",
                    padding: "0.6rem 0.9rem",
                    borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                    background: m.role === "user" ? PRIMARY : "#f1f5f9",
                    color: m.role === "user" ? "white" : "#1e293b",
                    fontSize: "0.83rem",
                    lineHeight: 1.55,
                    whiteSpace: "pre-wrap",
                  }}>{text}</div>
                </div>
              );
            })}

            {/* Error */}
            {chatError && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  background: "#fee2e2",
                  color: "#dc2626",
                  borderRadius: "14px 14px 14px 4px",
                  padding: "0.6rem 0.9rem",
                  fontSize: "0.83rem",
                  lineHeight: 1.55,
                }}>{chatError}</div>
              </div>
            )}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  background: "#f1f5f9",
                  borderRadius: "14px 14px 14px 4px",
                  padding: "0.6rem 1rem",
                  fontSize: "1.1rem",
                  letterSpacing: "0.15em",
                  color: "#94a3b8",
                }}>···</div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input form */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              gap: "0.5rem",
              padding: "0.75rem 1rem",
              borderTop: "1px solid #e2e8f0",
              flexShrink: 0,
            }}
          >
            <input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Escribe tu mensaje..."
              disabled={isLoading}
              style={{
                flex: 1,
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "0.55rem 0.85rem",
                fontSize: "0.83rem",
                outline: "none",
                fontFamily: "Inter, sans-serif",
                color: "#1e293b",
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !inputValue.trim()}
              style={{
                background: isLoading || !inputValue.trim() ? "#94a3b8" : PRIMARY,
                border: "none",
                borderRadius: "8px",
                width: "38px",
                height: "38px",
                cursor: isLoading || !inputValue.trim() ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={e => {
                if (!isLoading && inputValue.trim()) e.currentTarget.style.background = PRIMARY_DARK;
              }}
              onMouseLeave={e => {
                if (!isLoading && inputValue.trim()) e.currentTarget.style.background = PRIMARY;
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(o => !o)}
        aria-label={isOpen ? "Cerrar asistente" : "Abrir asistente MOTOKASS"}
        style={{
          position: "fixed",
          bottom: "9.5rem",
          right: "1.5rem",
          zIndex: 200,
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: PRIMARY,
          border: "none",
          color: "white",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 16px rgba(31,63,122,0.45)",
          transition: "transform 0.2s, box-shadow 0.2s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.transform = "scale(1.1)";
          e.currentTarget.style.boxShadow = "0 6px 24px rgba(31,63,122,0.55)";
        }}
        onMouseLeave={e => {
          e.currentTarget.style.transform = "scale(1)";
          e.currentTarget.style.boxShadow = "0 4px 16px rgba(31,63,122,0.45)";
        }}
      >
        {isOpen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
