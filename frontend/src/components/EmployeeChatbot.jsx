import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, RotateCcw, Copy, Check, Plus,
  ArrowUp, Sparkles
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const INITIAL_SUGGESTIONS = [
  { label: 'My Identity & ID', query: 'What is my name and employee ID?' },
  { label: 'My Profile Details', query: 'Tell me about myself and my employee details' },
  { label: 'My Leave Balance', query: 'How many leaves do I have left?' },
  { label: 'Today\'s Attendance', query: 'What is my attendance status today?' },
  { label: 'Reporting Manager', query: 'Who is my reporting manager?' },
  { label: 'Assigned Branch', query: 'Which branch am I assigned to?' },
  { label: 'Latest Payslip', query: 'What was my net salary in my latest payslip?' },
  { label: 'Work Shift & Week Off', query: 'What are my shift timings and week off?' },
  { label: 'Assigned Assets', query: 'What company hardware or assets are assigned to me?' },
  { label: 'Upcoming Holidays', query: 'When is the next company holiday?' }
];

const EmployeeChatbot = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showSuggestionsMenu, setShowSuggestionsMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Dynamic suggestion chips based on user's business app permissions
  const activeSuggestions = React.useMemo(() => {
    const list = [...INITIAL_SUGGESTIONS];
    const fa = profile?.featureAccess || {};
    const isAdmin = profile?.role === 'admin';
    if (fa.canLoanOrigination || isAdmin) {
      list.splice(4, 0, { label: 'Loan Applications', query: 'Show my loan applications' });
    }
    if (fa.canSalesOrigination || isAdmin) {
      list.splice(5, 0, { label: 'Sales Leads', query: 'What are my sales leads?' });
    }
    if (fa.canBranchOperations || isAdmin) {
      list.splice(6, 0, { label: 'Branch Operations', query: 'What applications are in Branch Operations?' });
    }
    list.push({ label: 'My Business Apps', query: 'What business apps do I have access to?' });
    return list;
  }, [profile]);

  // Initialize greeting on first load if empty (clean text, no emojis)
  useEffect(() => {
    if (messages.length === 0) {
      const firstName = profile?.firstName || 'there';
      const welcomeMsg = {
        role: 'assistant',
        content: `Hi **${firstName}**!\n\nI am your **HR Assistant**. I can answer all questions regarding your personal and employment records:\n* **Your Name & Employee ID** (e.g. "What is my name?")\n* **Your Profile & Role** (Designation, Department, Branch)\n* **Reporting Manager** & Contact info\n* **Leave balances** & leave requests\n* **Attendance**, check-in/out & logged hours\n* **Salary** & latest payslip breakdown\n* **Shift timings** & weekly off\n* **Assigned company assets**\n* **Business Apps** (Loans, Sales, Branch Operations)\n\nAsk me anything about your records or select one of the suggestions below.`
      };
      setMessages([welcomeMsg]);
    }
  }, [profile]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 250);
      setUnreadCount(0);
    }
  }, [isOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = typeof textToSend === 'string' ? textToSend.trim() : inputMessage.trim();
    if (!text || loading) return;

    const userMessage = { role: 'user', content: text };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setShowSuggestionsMenu(false);
    setLoading(true);

    try {
      // Build brief history for contextual conversation
      const conversationHistory = updatedMessages
        .slice(-6)
        .map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content
        }));

      const res = await api.post('/employee/chatbot/query', {
        message: text,
        history: conversationHistory
      });

      const botReply = res?.data?.response || "I'm sorry, I couldn't retrieve that information right now. Please try again.";
      const newMessages = [...updatedMessages, { role: 'assistant', content: botReply }];
      setMessages(newMessages);

      if (!isOpen) {
        setUnreadCount(prev => prev + 1);
      }
    } catch (err) {
      const errorReply = err?.response?.data?.error || "Sorry, I ran into an error retrieving your records. Please check back shortly.";
      setMessages([...updatedMessages, { role: 'assistant', content: `**Notice**: ${errorReply}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleResetChat = () => {
    const firstName = profile?.firstName || 'there';
    const welcomeMsg = {
      role: 'assistant',
      content: `Conversation reset. How can I assist you with your HR records today, **${firstName}**?`
    };
    setMessages([welcomeMsg]);
    toast.success('Conversation reset');
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard', { duration: 1500 });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple clean Markdown renderer
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-semibold text-[#1f1f1f] text-xs mt-2.5 mb-1 pb-0.5 border-b border-[#f1f3f4]">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Bullet list
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const itemText = line.trim().replace(/^[\*\-]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-1 my-1 text-xs text-[var(--text-2)] leading-relaxed">
            <span className="text-[var(--brand-deep)] font-bold select-none">•</span>
            <span>{parseInlineMarkdown(itemText)}</span>
          </div>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      // Regular paragraph
      return (
        <p key={idx} className="text-xs leading-relaxed text-[#1f1f1f]">
          {parseInlineMarkdown(line)}
        </p>
      );
    });
  };

  const parseInlineMarkdown = (text) => {
    // Process bold (**text**) and code (`text`)
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#1f1f1f]">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={i} className="bg-[var(--surface-alt)] border border-[var(--line)] px-1.5 py-0.5 rounded text-[11px] font-mono text-[var(--brand-deep)]">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* 1. Floating Circular Action Button (FAB) */}
      <div className="fixed bottom-[var(--chatbot-bottom)] right-5 md:right-6 z-40 select-none">
        <motion.button
          onClick={() => setIsOpen(prev => !prev)}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          aria-label={isOpen ? 'Close chat' : 'Open HR Assistant'}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white shadow-lg shadow-black/15 border border-[var(--line)] focus:outline-none transition-all cursor-pointer"
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <X className="w-6 h-6 text-white" />
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="relative"
              >
                <MessageSquare className="w-6 h-6 text-white" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--brand-deep)] text-[10px] font-bold text-white ring-2 ring-[var(--surface)]">
                    {unreadCount}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* 2. Floating Chat Modal Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed bottom-[var(--chatbot-modal-bottom)] right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[410px] h-[580px] max-h-[75vh] flex flex-col bg-[var(--surface)] border border-[var(--line)] rounded-[24px] shadow-2xl overflow-hidden antialiased font-sans"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--line)] bg-[var(--surface)]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] border border-[var(--line)] flex items-center justify-center text-[var(--brand-deep)] shrink-0 shadow-2xs">
                  <Sparkles className="w-4 h-4 text-[var(--brand-deep)]" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-[var(--text)] leading-tight">HR Assistant</h3>
                    <span className="inline-block w-2 h-2 rounded-full bg-[#1F9D55] ring-2 ring-[#1F9D55]/20" title="Online" />
                  </div>
                  <p className="text-[11px] text-[var(--muted)] leading-none mt-0.5">Answers questions on your data</p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1 text-[var(--muted)]">
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Start New Conversation"
                  className="p-1.5 rounded-full hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  className="p-1.5 rounded-full hover:bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[var(--bg)] scrollbar-thin">
              {messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.18 }}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`relative max-w-[86%] rounded-[18px] px-3.5 py-2.5 shadow-2xs text-xs ${
                        isUser
                          ? 'bg-[var(--ink)] text-white rounded-br-[4px]'
                          : 'bg-[var(--surface)] text-[var(--text)] border border-[var(--line)] rounded-bl-[4px]'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-white">{msg.content}</p>
                      ) : (
                        <div className="space-y-1">
                          {renderFormattedContent(msg.content)}
                        </div>
                      )}
                    </div>

                    {/* Copy action for assistant responses */}
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mt-1 ml-1 text-[var(--muted)]">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(msg.content, index)}
                          title="Copy response"
                          className="p-1 rounded-full text-[var(--muted)] hover:text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] transition-colors cursor-pointer"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-[#1F9D55]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 bg-[var(--surface)] px-3.5 py-2.5 rounded-[16px] rounded-bl-[4px] w-fit border border-[var(--line)] shadow-2xs"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-deep)] animate-bounce" style={{ animationDelay: '300ms' }} />
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips Carousel */}
            <div className="px-3 py-2 border-t border-[var(--line)] bg-[var(--surface)]">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                {activeSuggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={loading}
                    onClick={() => handleSendMessage(sug.query)}
                    className="shrink-0 text-xs font-medium bg-[var(--surface)] hover:bg-[var(--brand-tint)] text-[var(--text-2)] hover:text-[var(--brand-deep)] border border-[var(--line)] hover:border-[var(--brand)] px-3 py-1 rounded-full shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-[var(--line)] bg-[var(--surface)]">
              <div className="relative flex items-center bg-[var(--surface-alt)] focus-within:bg-[var(--surface)] border border-[var(--line)] focus-within:border-[var(--brand-deep)] focus-within:ring-2 focus-within:ring-[var(--brand)]/20 rounded-full px-2 py-1.5 transition-all">
                
                {/* Plus (+) Button for quick prompt menu */}
                <button
                  type="button"
                  onClick={() => setShowSuggestionsMenu(prev => !prev)}
                  title="Suggested questions"
                  className="p-1.5 text-[var(--muted)] hover:text-[var(--brand-deep)] rounded-full hover:bg-[var(--brand-tint)] transition-colors cursor-pointer"
                >
                  <Plus className={`w-4 h-4 transition-transform duration-200 ${showSuggestionsMenu ? 'rotate-45 text-[var(--brand-deep)]' : ''}`} />
                </button>

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about leaves, attendance, payroll, apps..."
                  disabled={loading}
                  className="flex-1 bg-transparent px-2.5 text-xs text-[var(--text)] placeholder-[var(--muted)] focus:outline-none disabled:opacity-60"
                />

                {/* Send Button */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || loading}
                  title="Send message"
                  className="w-8 h-8 rounded-full bg-[var(--ink)] text-white flex items-center justify-center hover:bg-[var(--ink-2)] disabled:bg-[var(--surface-alt)] disabled:text-[var(--muted)] transition-all shrink-0 active:scale-95 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                >
                  <ArrowUp className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {/* Suggestions Popup Popover */}
              <AnimatePresence>
                {showSuggestionsMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute bottom-16 left-4 right-4 bg-[var(--surface)] border border-[var(--line)] rounded-[20px] p-2.5 shadow-xl z-20"
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[var(--line)] px-2">
                      <span className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider">Suggested Topics</span>
                      <button 
                        type="button"
                        onClick={() => setShowSuggestionsMenu(false)} 
                        className="text-[var(--muted)] hover:text-[var(--text)] p-0.5 rounded-full cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {activeSuggestions.map((sug, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(sug.query)}
                          className="w-full text-left px-3 py-1.5 text-xs font-medium text-[var(--text-2)] hover:text-[var(--brand-deep)] hover:bg-[var(--brand-tint)] rounded-full transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <span>{sug.label}</span>
                          <span className="text-[10px] text-[var(--brand-deep)] opacity-0 group-hover:opacity-100 transition-opacity">Ask</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default EmployeeChatbot;
