import { useState, useRef, useEffect, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism'
import './ChatWidget.css'

const SUGGESTION_CATEGORIES = [
  {
    title: 'Portfolio Analytics',
    questions: [
      'How many high priority demands are there?',
      'Which application has the highest workload?',
      'Which department raised the most requests?',
      'Top applications by demand count.',
    ]
  },
  {
    title: 'Project Insights',
    questions: [
      'Summarize the current demand portfolio.',
      'Which project types are most common?',
      'Which work area has the highest demand?',
      'Show project status distribution.',
    ]
  },
  {
    title: 'Request Search',
    questions: [
      'Show high priority requests.',
      'Show Feature Enhancement requests.',
    ]
  }
]

const TYPING_PHRASES = [
  'Searching knowledge base...',
  'Analyzing portfolio...',
  'Preparing response...',
  'Generating answer...'
]

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}



/** Mini forecast summary card shown inside chat messages */
function ForecastMiniCard({ forecast }) {
  if (!forecast || forecast.error) return null;
  const growthSign = forecast.growth_pct >= 0 ? '+' : '';
  return (
    <div className="chat-forecast-card">
      <div className="chat-forecast-card-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
          <path d="M3 3v18h18" />
          <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
        </svg>
        Forecast Summary
      </div>
      <div className="chat-forecast-stats">
        <div className="chat-forecast-stat">
          <span className="chat-forecast-stat-label">Expected Demand</span>
          <span className="chat-forecast-stat-val">{forecast.forecast?.at(-1)?.yhat || 'N/A'}</span>
        </div>
        <div className="chat-forecast-stat">
          <span className="chat-forecast-stat-label">Confidence</span>
          <span className="chat-forecast-stat-val" style={{ textTransform: 'capitalize' }}>{forecast.confidence}</span>
        </div>
        <div className="chat-forecast-stat">
          <span className="chat-forecast-stat-label">Trend</span>
          <span className="chat-forecast-stat-val" style={{ textTransform: 'capitalize' }}>{forecast.trend}</span>
        </div>
        <div className="chat-forecast-stat">
          <span className="chat-forecast-stat-label">Growth</span>
          <span className="chat-forecast-stat-val">{growthSign}{forecast.growth_pct}%</span>
        </div>
      </div>
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className="chat-copy-btn" onClick={handleCopy} title="Copy response">
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" width={14} height={14}><path d="M20 6L9 17l-5-5" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={14} height={14}>
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  )
}

function SourcesSection({ sources }) {
  const [expanded, setExpanded] = useState(false);
  if (!sources || sources.length === 0) return null;

  return (
    <div className="chat-sources">
      <button className="chat-sources-toggle" onClick={() => setExpanded(!expanded)}>
        Sources {expanded ? '▲' : '▼'}
      </button>
      {expanded && (
        <div className="chat-sources-list">
          {sources.map((src, i) => (
            <div key={i} className="chat-source-item">
              <div className="chat-source-header">
                {src.metadata?.['Application'] || 'Knowledge Base Document'}
                <span className="chat-source-score">{Math.round((1 - src.score) * 100)}% match</span>
              </div>
              <div className="chat-source-meta">
                Demand ID: {src.metadata?.['Demand ID'] || 'N/A'} • {src.metadata?.['Project Type'] || 'N/A'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [hasUnread, setHasUnread] = useState(true)

  const [openAccordion, setOpenAccordion] = useState(null)
  const [typingIndex, setTypingIndex] = useState(0)
  const [showScrollBtn, setShowScrollBtn] = useState(false)

  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const inputRef = useRef(null)
  const panelRef = useRef(null)

  // Click outside to close (only if not clicking the toggle button)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (open && panelRef.current && !panelRef.current.contains(e.target)) {
        // Check if the click is on the main widget button
        const btn = document.getElementById('chat-widget-main-btn');
        if (btn && btn.contains(e.target)) return;
        setOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (open && e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  // Typing indicator cycle
  useEffect(() => {
    let interval;
    if (loading) {
      interval = setInterval(() => {
        setTypingIndex((prev) => (prev + 1) % TYPING_PHRASES.length);
      }, 1500);
    } else {
      setTypingIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    setShowScrollBtn(false)
  }

  // Auto-scroll on new message if near bottom
  useEffect(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      if (isNearBottom) {
        scrollToBottom();
      } else if (messages.length > 0 && !loading) {
        setShowScrollBtn(true);
      }
    } else {
      scrollToBottom();
    }
  }, [messages, loading]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
    setShowScrollBtn(!isNearBottom);
  };

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setHasUnread(false)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [open])

  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 150)}px`;
    }
  };

  const handleInputChange = (e) => {
    setInput(e.target.value);
    adjustTextareaHeight();
  };

  const sendMessage = useCallback(async (queryText) => {
    const q = (queryText || input).trim()
    if (!q || loading) return

    setInput('')
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setError(null)

    const userMsg = {
      id: Date.now(),
      role: 'user',
      text: q,
      time: new Date(),
    }

    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = messages.slice(-15).map(m => ({
        role: m.role,
        content: m.text
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: q, history }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.message || 'Failed to get a response.')
      }

      const assistantMsg = {
        id: Date.now() + 1,
        role: 'assistant',
        text: data.answer || 'No response received.',
        time: new Date(),
        intent: data.intent,
        forecast: data.forecast || null,
        sources: data.sources || [],
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const handleNewChat = () => {
    setMessages([]);
    setError(null);
    setInput('');
    if (inputRef.current) inputRef.current.style.height = 'auto';
    setOpenAccordion(null);
  };

  const showWelcome = messages.length === 0;

  return (
    <>
      {/* ── Floating button ── */}
      <button
        id="chat-widget-main-btn"
        className="chat-widget-btn"
        onClick={() => setOpen(v => !v)}
        aria-label="Open AI Assistant"
        title="DE-BP3 AI Assistant"
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10a9.97 9.97 0 0 1-5.08-1.38L2 22l1.38-4.92A9.97 9.97 0 0 1 2 12 10 10 0 0 1 12 2z" />
            <path d="M8 10h8M8 14h5" />
          </svg>
        )}
        {!open && hasUnread && <span className="chat-widget-unread" aria-hidden="true" />}
      </button>

      {open && (
        <div
          className="chat-backdrop"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div
          ref={panelRef}
          className={`chat-panel ${isExpanded ? 'expanded' : ''}`}
          role="dialog"
          aria-label="DE-BP3 AI Assistant"
          aria-modal="true"
        >
          {/* Header */}
          <div className="chat-panel-header">
            <div className="chat-panel-header-left">
              <div className="chat-avatar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10-10A10 10 0 0 1 12 2zm0 4a2 2 0 0 0-2 2v2a2 2 0 0 0 4 0V8a2 2 0 0 0-2-2zM8 17a4 4 0 0 1 8 0" />
                </svg>
              </div>
              <div>
                <div className="chat-panel-title">DE-BP3 AI Assistant</div>
                <div className="chat-panel-subtitle">
                  <span className="chat-status-dot" />
                  Online • Enterprise Knowledge
                </div>
              </div>
            </div>
            <div className="chat-panel-header-right">
              <button className="chat-header-btn" onClick={handleNewChat} title="New Chat" aria-label="New Chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <button className="chat-header-btn" onClick={() => setIsExpanded(!isExpanded)} title={isExpanded ? 'Collapse' : 'Expand'} aria-label={isExpanded ? 'Collapse' : 'Expand'}>
                {isExpanded ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" /></svg>
                )}
              </button>
              <button className="chat-header-btn" onClick={() => setOpen(false)} title="Close" aria-label="Close chat">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Messages Container */}
          <div className="chat-messages-container">
            <div className="chat-messages" role="log" aria-live="polite" ref={messagesContainerRef} onScroll={handleScroll}>

              {/* Welcome Section */}
              {showWelcome && (
                <div className="chat-welcome">
                  <div className="chat-welcome-title">
                    👋 Welcome
                  </div>
                  <p>I can help you explore the DE-BP3 demand portfolio through analytics, request search, and project insights.</p>

                  <div className="chat-accordion">
                    {SUGGESTION_CATEGORIES.map((cat, idx) => (
                      <div key={idx} className={`chat-accordion-item ${openAccordion === idx ? 'open' : ''}`}>
                        <div className="chat-accordion-header" onClick={() => setOpenAccordion(openAccordion === idx ? null : idx)}>
                          {cat.title}
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}
                            style={{ transform: openAccordion === idx ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                        <div className="chat-accordion-content">
                          <div className="chat-suggestion-list">
                            {cat.questions.map((q, qidx) => (
                              <button key={qidx} className="chat-suggestion-item" onClick={() => sendMessage(q)}>
                                {q}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Message list */}
              {messages.map(msg => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className="chat-msg-avatar">
                    {msg.role === 'assistant' ? 'AI' : 'U'}
                  </div>
                  <div className="chat-bubble-wrapper">
                    {msg.role === 'assistant' && <CopyButton text={msg.text} />}
                    <div className="chat-bubble">
                      {msg.role === 'assistant' ? (
                        <div className="chat-markdown">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={{
                              strong(props) {
                                const { children, node, ...rest } = props;
                                // Simple extraction if children is an array or string
                                const content = Array.isArray(children) ? children.join('') : String(children);
                                // Regex matches numbers, currency, percentages (e.g. 289, $120, 18%, 1.2M)
                                if (/^[\$€£]?\d+(,\d+)*(\.\d+)?[%kKmMbB]?$/.test(content.trim())) {
                                  return <span className="chat-metric-pill" {...rest}>{children}</span>;
                                }
                                return <strong {...rest}>{children}</strong>;
                              },
                              code(props) {
                                const { children, className, node, ...rest } = props;
                                const match = /language-(\w+)/.exec(className || '')
                                return match ? (
                                  <div className="chat-code-block-wrapper">
                                    <SyntaxHighlighter
                                      {...rest}
                                      children={String(children).replace(/\n$/, '')}
                                      style={vs}
                                      language={match[1]}
                                      PreTag="div"
                                    />
                                  </div>
                                ) : (
                                  <code {...rest} className={className}>
                                    {children}
                                  </code>
                                )
                              }
                            }}
                          >
                            {msg.text}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.text}
                        </span>
                      )}
                      {msg.forecast && <ForecastMiniCard forecast={msg.forecast} />}
                      {msg.sources && <SourcesSection sources={msg.sources} />}
                    </div>
                    <div className="chat-timestamp">{formatTime(msg.time)}</div>
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {loading && (
                <div className="chat-typing">
                  <div className="chat-msg-avatar" style={{ background: 'linear-gradient(135deg,#1F4E79,#3B82F6)', color: '#fff' }}>
                    AI
                  </div>
                  <div className="typing-text-wrapper">
                    <div className="typing-spinner" />
                    <span>{TYPING_PHRASES[typingIndex]}</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="chat-error-msg" role="alert">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  {error}
                </div>
              )}

              <div ref={messagesEndRef} style={{ height: 1 }} />
            </div>

            {/* Scroll to Bottom Button */}
            {showScrollBtn && (
              <button className="chat-scroll-btn" onClick={scrollToBottom}>
                ↓ Scroll to latest
              </button>
            )}
          </div>

          {/* Input area */}
          <div className="chat-input-area">
            <div className="chat-input-row">
              <textarea
                ref={inputRef}
                className="chat-input"
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Ask about demands, applications, priorities…"
                rows={1}
                maxLength={500}
                disabled={loading}
                aria-label="Chat input"
              />
              <button
                className="chat-send-btn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                aria-label="Send message"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
            <div className="chat-input-hint">
              <span className="chat-input-hint-left">Shift+Enter for new line</span>
              <span>Answers from DE-BP3 knowledge base only</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
