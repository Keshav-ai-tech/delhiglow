import React, { useState, useEffect, useRef } from 'react';

export default function AIAssistant({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hello! I am your **Glow Concierge** bridal coordinator. 🌸\n\nI can recommend top salons in Delhi, outline beauty timelines, or guide you through selecting the perfect bridal look. What is your wedding date or beauty preference?"
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const chatEndRef = useRef(null);

  // Scroll to bottom whenever messages list updates
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Hide assistant globally for owner or staff roles
  if (user && (user.role === 'owner' || user.role === 'staff')) {
    return null;
  }

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputText;
    if (!text.trim()) return;

    if (!textToSend) {
      setInputText('');
    }

    const updatedMessages = [...messages, { role: 'user', content: text }];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: '✕ Apologies, my concierge connection encountered an issue. Please try again shortly.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '✕ Connection failure. Please ensure the backend server is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Suggest a salon in Delhi",
    "Pre-bridal skin prep timeline?",
    "How does Lehenga Stylist work?"
  ];

  // Helper to parse simple markdown bold strings into JSX
  const renderMessageContent = (text) => {
    return text.split('\n').map((line, idx) => {
      // Basic formatting for **bold** text
      const parts = line.split('**');
      const formattedLine = parts.map((part, i) => {
        if (i % 2 === 1) return <strong key={i} style={{ fontWeight: 700 }}>{part}</strong>;
        return part;
      });

      return (
        <div key={idx} style={{ minHeight: line === '' ? '12px' : 'auto', marginBottom: '4px' }}>
          {formattedLine}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Chat Bubble */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="ai-chat-bubble"
        title="Glow Concierge Assistant"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* Slide-in Chat Drawer */}
      {isOpen && (
        <div className="ai-chat-drawer animate-slide-in">
          {/* Header */}
          <div style={{ background: 'var(--charcoal)', color: 'var(--white)', padding: '16px 20px', borderBottom: '2px solid var(--gold)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🌸</span>
            <div>
              <h4 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '15px', color: 'var(--white)', fontWeight: 600 }}>Glow Concierge</h4>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 300 }}>AI Beauty & Skincare Assistant</span>
            </div>
          </div>

          {/* Messages Log */}
          <div style={{ flex: 1, padding: '20px', overflowY: 'auto', background: 'var(--ivory)' }}>
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                style={{ 
                  display: 'flex', 
                  justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', 
                  marginBottom: '16px' 
                }}
              >
                <div 
                  style={{ 
                    maxWidth: '85%', 
                    background: m.role === 'user' ? 'var(--crimson)' : 'var(--white)', 
                    color: m.role === 'user' ? 'var(--white)' : 'var(--charcoal)', 
                    padding: '12px 16px', 
                    borderRadius: m.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0', 
                    fontSize: '13.5px',
                    lineHeight: '1.6',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                    border: m.role === 'user' ? 'none' : '1px solid var(--glass-border)',
                    fontWeight: 300
                  }}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
            
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '16px' }}>
                <div style={{ background: 'var(--white)', padding: '12px 18px', borderRadius: '16px 16px 16px 0', border: '1px solid var(--glass-border)', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <span className="dot-typing" style={{ width: '6px', height: '6px', background: 'var(--charcoal-light)', borderRadius: '50%', display: 'inline-block' }} />
                  <span className="dot-typing" style={{ width: '6px', height: '6px', background: 'var(--charcoal-light)', borderRadius: '50%', display: 'inline-block', animationDelay: '0.2s' }} />
                  <span className="dot-typing" style={{ width: '6px', height: '6px', background: 'var(--charcoal-light)', borderRadius: '50%', display: 'inline-block', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Suggestions */}
          {messages.length === 1 && (
            <div style={{ padding: '10px 16px', background: 'var(--ivory-dark)', display: 'flex', gap: '8px', overflowX: 'auto', borderTop: '1px solid var(--glass-border)', webkitOverflowScrolling: 'touch' }}>
              {suggestions.map(s => (
                <button
                  key={s}
                  onClick={() => handleSendMessage(s)}
                  style={{
                    background: 'var(--white)',
                    border: '1px solid var(--gold)',
                    borderRadius: '50px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    color: 'var(--charcoal)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    fontWeight: 500,
                    transition: 'var(--transition)'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--ivory)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--white)'}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Chat Input Footer */}
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            style={{ 
              padding: '12px 16px', 
              borderTop: '1.5px solid var(--ivory-dark)', 
              background: 'var(--white)', 
              display: 'flex', 
              gap: '10px',
              alignItems: 'center'
            }}
          >
            <input 
              type="text"
              placeholder="Ask anything about bridal prep..."
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              disabled={loading}
              style={{
                flex: 1,
                padding: '10px 14px',
                border: '1.5px solid var(--ivory-dark)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '13.5px',
                outline: 'none',
                background: 'var(--ivory)'
              }}
            />
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || !inputText.trim()}
              style={{ 
                margin: 0, 
                padding: '10px 18px', 
                height: '38px',
                fontSize: '13px',
                justifyContent: 'center'
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
