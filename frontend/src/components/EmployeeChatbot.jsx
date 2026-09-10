import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, RotateCcw, Copy, Check, Plus,
  Sparkles, ArrowUp, Calendar, Clock, DollarSign, Palmtree,
  Laptop, ShieldAlert, ChevronDown, Bot
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const INITIAL_SUGGESTIONS = [
  { label: '🌿 My leave balance', query: 'How many leaves do I have left?' },
  { label: '⏱️ Today’s punch status', query: 'What is my attendance status today?' },
  { label: '🏢 My assigned branch', query: 'Which branch am I assigned to?' },
  { label: '💰 Latest payslip info', query: 'What was my net salary in my latest payslip?' },
  { label: '🗓️ Work shift & week off', query: 'What are my shift timings and week off?' },
  { label: '🎈 Upcoming holidays', query: 'When is the next company holiday?' },
  { label: '👤 Who is my manager?', query: 'Who is my reporting manager?' },
  { label: '💻 Assigned assets', query: 'What company hardware or assets are assigned to me?' }
];

const EmployeeChatbot = () => {
  const { profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem('hrms_employee_chat_history');
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [showSuggestionsMenu, setShowSuggestionsMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize greeting on first load if empty
  useEffect(() => {
    if (messages.length === 0) {
      const firstName = profile?.firstName || 'there';
      const welcomeMsg = {
        role: 'assistant',
        content: `Hi **${firstName}**! 👋\n\nI am your **HR Assistant**. I can answer questions regarding your:\n* 🌿 **Leave balances** & requests\n* ⏱️ **Attendance**, punch records & hours\n* 🏢 **Assigned branch** & office\n* 💰 **Payslips** & take-home pay\n* 🗓️ **Shift timings** & week offs\n* 💻 **Company assets**\n* 🎈 **Company holidays**\n\nFeel free to ask a question or select one of the suggestions below!`
      };
      setMessages([welcomeMsg]);
      try {
        sessionStorage.setItem('hrms_employee_chat_history', JSON.stringify([welcomeMsg]));
      } catch (_) {}
    }
  }, [profile]);

  // Persist messages to sessionStorage
  useEffect(() => {
    if (messages.length > 0) {
      try {
        sessionStorage.setItem('hrms_employee_chat_history', JSON.stringify(messages));
      } catch (_) {}
    }
  }, [messages]);

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
      setMessages([...updatedMessages, { role: 'assistant', content: `⚠️ **Notice**: ${errorReply}` }]);
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
      content: `Chat cleared! How can I assist you with your HR records today, **${firstName}**?`
    };
    setMessages([welcomeMsg]);
    try {
      sessionStorage.setItem('hrms_employee_chat_history', JSON.stringify([welcomeMsg]));
    } catch (_) {}
    toast.success('Conversation reset');
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Copied to clipboard', { duration: 1500 });
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Simple Markdown renderer for bolding, bullet points, headers, and code
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Heading 3
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-neutral-900 dark:text-neutral-100 text-sm mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }
      // Bullet list
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const itemText = line.trim().replace(/^[\*\-]\s+/, '');
        return (
          <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-xs text-neutral-700 dark:text-neutral-300">
            <span className="text-neutral-400 select-none">•</span>
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
        <p key={idx} className="text-xs leading-relaxed text-neutral-800 dark:text-neutral-200">
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
        return <strong key={i} className="font-semibold text-neutral-900 dark:text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="bg-neutral-200/60 dark:bg-neutral-800 px-1 py-0.5 rounded text-[11px] font-mono text-indigo-600 dark:text-indigo-400">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  return (
    <>
      {/* 1. Floating Circular Action Button (FAB) matching Reference Image 2 */}
      <div className="fixed bottom-24 md:bottom-6 right-5 md:right-6 z-40 select-none">
        <motion.button
          onClick={() => setIsOpen(prev => !prev)}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label={isOpen ? 'Close chat' : 'Open HR Assistant'}
          className="relative flex items-center justify-center w-14 h-14 rounded-full bg-[#111827] text-white shadow-2xl hover:shadow-[#111827]/40 border border-neutral-800 focus:outline-none transition-shadow"
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
                <X className="w-6 h-6 text-neutral-200" />
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
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      {/* 2. Floating Chat Modal Window matching Reference Image 1 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 320 }}
            className="fixed bottom-40 md:bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[410px] h-[570px] max-h-[78vh] flex flex-col bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-neutral-100 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#111827] dark:bg-neutral-800 flex items-center justify-center text-white shadow-xs">
                  <Bot className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white leading-tight">HR Assistant</h3>
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-none mt-0.5">Answers questions on your data</p>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-1 text-neutral-600 dark:text-neutral-300">
                <button
                  onClick={handleResetChat}
                  title="Start New Conversation"
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Assistant"
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Conversation Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-neutral-200 dark:scrollbar-thumb-neutral-800">
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
                      className={`relative max-w-[86%] rounded-2xl px-3.5 py-2.5 shadow-2xs text-xs ${
                        isUser
                          ? 'bg-[#111827] text-white rounded-br-xs'
                          : 'bg-neutral-100/90 dark:bg-neutral-800/90 text-neutral-900 dark:text-neutral-100 border border-neutral-200/60 dark:border-neutral-700/60 rounded-bl-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="space-y-1">
                          {renderFormattedContent(msg.content)}
                        </div>
                      )}
                    </div>

                    {/* Copy action for assistant responses matching Reference Image 1 */}
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mt-1 ml-1 text-neutral-400">
                        <button
                          onClick={() => copyToClipboard(msg.content, index)}
                          title="Copy response"
                          className="p-1 rounded hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
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
                  className="flex items-center gap-1.5 bg-neutral-100 dark:bg-neutral-800 px-3.5 py-2.5 rounded-2xl rounded-bl-xs w-fit border border-neutral-200/60 dark:border-neutral-700/60"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips Carousel */}
            <div className="px-3 py-1.5 border-t border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {INITIAL_SUGGESTIONS.map((sug, idx) => (
                  <button
                    key={idx}
                    disabled={loading}
                    onClick={() => handleSendMessage(sug.query)}
                    className="shrink-0 text-[11px] font-medium bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-200 dark:border-neutral-700 px-2.5 py-1 rounded-full shadow-2xs transition-all active:scale-95"
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar matching Reference Image 1 */}
            <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-white dark:bg-neutral-900">
              <div className="relative flex items-center bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-full px-2 py-1.5 focus-within:border-neutral-400 dark:focus-within:border-neutral-600 transition-colors">
                
                {/* Plus (+) Button for quick prompt menu */}
                <button
                  type="button"
                  onClick={() => setShowSuggestionsMenu(prev => !prev)}
                  title="Suggested questions"
                  className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-full hover:bg-neutral-200/70 dark:hover:bg-neutral-700 transition-colors"
                >
                  <Plus className={`w-4 h-4 transition-transform duration-200 ${showSuggestionsMenu ? 'rotate-45' : ''}`} />
                </button>

                {/* Text input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a support question..."
                  disabled={loading}
                  className="flex-1 bg-transparent px-2.5 text-xs text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none disabled:opacity-60"
                />

                {/* Circular Black Send Button with ArrowUp (matching Image 1) */}
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim() || loading}
                  title="Send message"
                  className="w-8 h-8 rounded-full bg-[#111827] text-white flex items-center justify-center hover:bg-neutral-800 disabled:opacity-40 disabled:hover:bg-[#111827] transition-all shrink-0 active:scale-95"
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
                    className="absolute bottom-16 left-4 right-4 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl p-2 shadow-xl z-20"
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1 border-b border-neutral-100 dark:border-neutral-700 px-2">
                      <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">Suggested Topics</span>
                      <button onClick={() => setShowSuggestionsMenu(false)} className="text-neutral-400 hover:text-neutral-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {INITIAL_SUGGESTIONS.map((sug, i) => (
                        <button
                          key={i}
                          onClick={() => handleSendMessage(sug.query)}
                          className="w-full text-left px-2.5 py-1.5 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors flex items-center gap-2"
                        >
                          <span>{sug.label}</span>
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
