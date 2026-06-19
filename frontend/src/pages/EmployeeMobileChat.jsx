import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Send, Plus, Users, User, ArrowLeft, Paperclip, Smile, Check, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { motion } from 'framer-motion';

const BackgroundOrbs = () => (
  <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
    <motion.div
      animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-multiply filter blur-[60px] opacity-20 pointer-events-none"
    />
    <motion.div
      animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-multiply filter blur-[60px] opacity-20 pointer-events-none"
    />
    <motion.div
      animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
      transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
      className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-multiply filter blur-[70px] opacity-20 pointer-events-none"
    />
  </div>
);

export default function EmployeeMobileChat() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeChat, setActiveChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState([]);
  const [pendingMessages, setPendingMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const prevChatIdRef = useRef(null);
  const prevMessagesLengthRef = useRef(0);

  // 1. Fetch Data
  const { data: chats = [] } = useQuery({
    queryKey: ['chat', 'list'],
    queryFn: async () => {
      const res = await api.get('/chat');
      return res.data;
    },
    refetchInterval: 1500,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['chat', 'users'],
    queryFn: async () => {
      const res = await api.get('/chat/users');
      return res.data;
    }
  });

  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat', 'messages', activeChat?.id],
    queryFn: async () => {
      if (!activeChat) return [];
      const res = await api.get(`/chat/${activeChat.id}/messages`);
      return res.data;
    },
    enabled: !!activeChat,
    refetchInterval: activeChat ? 1500 : false,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // 2. Realtime
  useEffect(() => {
    const channel = supabase
      .channel('global-chat-mobile')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
        if (activeChat && payload.new && payload.new.chatId === activeChat.id) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'messages', activeChat.id] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, queryClient]);

  const scrollToBottom = (instant = false) => {
    if (instant) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  useLayoutEffect(() => {
    const isNewChat = prevChatIdRef.current !== activeChat?.id;
    const isInitialLoad = isNewChat || (prevMessagesLengthRef.current === 0 && messages.length > 0);

    scrollToBottom(isInitialLoad);

    prevChatIdRef.current = activeChat?.id;
    prevMessagesLengthRef.current = messages.length;

    if (messages.length > 0 && activeChat && profile) {
      const unread = messages.filter(m => m.senderId !== profile.id && !m.readBy?.includes(profile.id));
      if (unread.length > 0 && document.hasFocus()) {
        const ids = unread.map(m => m.id);
        queryClient.setQueryData(['chat', 'list'], old =>
          old?.map(c => c.id === activeChat.id ? { ...c, unread_count: 0 } : c)
        );
        api.post(`/chat/${activeChat.id}/messages/receipts`, { messageIds: ids, status: 'read' })
          .then(() => queryClient.invalidateQueries({ queryKey: ['chat', 'list'] }))
          .catch(console.error);
      }
    }
  }, [messages, activeChat, profile, queryClient]);

  // 3. Send Message
  const sendMessageMutation = useMutation({
    mutationFn: async ({ payload, tempId }) => {
      const res = await api.post(`/chat/${activeChat.id}/messages`, payload);
      return { data: res.data, tempId };
    },
    onMutate: async ({ payload, tempId }) => {
      const tempMsg = {
        id: tempId,
        chatId: activeChat.id,
        senderId: profile.id,
        content: payload.content,
        deliveredTo: [],
        readBy: [],
        createdAt: new Date().toISOString(),
        _pending: true,
      };
      setPendingMessages(prev => [...prev, tempMsg]);
      setMessageText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      scrollToBottom();
    },
    onSuccess: ({ data, tempId }) => {
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
      queryClient.setQueryData(['chat', 'messages', activeChat.id], old => {
        if (old?.find(m => m.id === data.id)) return old;
        return [...(old || []), data];
      });
      scrollToBottom();
    },
    onError: (err, { tempId }) => {
      setPendingMessages(prev => prev.filter(m => m.id !== tempId));
      toast.error('Failed to send message');
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    try {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sendMessageMutation.mutate({ payload: { content: messageText }, tempId });
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  // 4. Create Chat
  const createChatMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/chat', payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat', 'list']);
      setShowNewChat(false);
      setIsCreatingGroup(false);
      setGroupName('');
      setSelectedGroupParticipants([]);
      toast.success('Chat created');
    }
  });

  const handleCreatePersonalChat = (targetUserId) => {
    createChatMutation.mutate({ type: 'personal', participants: [targetUserId] });
  };

  const handleCreateGroupChat = () => {
    if (!groupName.trim()) return toast.error('Group name is required');
    if (selectedGroupParticipants.length === 0) return toast.error('Select at least one participant');
    createChatMutation.mutate({
      type: 'group',
      name: groupName,
      participants: selectedGroupParticipants
    });
  };

  const toggleGroupParticipant = (userId) => {
    setSelectedGroupParticipants(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const getChatName = (chat) => {
    if (chat.type === 'group') return chat.name;
    const other = chat.participants.find(p => p.id !== profile?.id);
    return other ? `${other.firstName} ${other.lastName}` : 'Personal Chat';
  };

  const getChatAvatar = (chat) => {
    if (chat.type === 'group') return null;
    const other = chat.participants.find(p => p.id !== profile?.id);
    return other?.avatar || null;
  };

  const getDecryptedLastMessage = (chat) => {
    if (!chat.last_message) return 'Start chatting';
    return chat.last_message.content || 'Start chatting';
  };

  const renderTicks = (msg, chat) => {
    if (!chat || !profile) return null;
    if (msg._pending) {
      return <Check size={14} className="text-blue-200 ml-1 inline-block shrink-0" />;
    }

    // Check if all other participants have read the message
    const chatParticipants = chat.participants.filter(p => p.id !== profile.id);
    const numOtherParticipants = chatParticipants.length;
    const readCount = (msg.readBy || []).filter(id => id !== profile.id).length;

    if (readCount > 0 && readCount >= numOtherParticipants) {
      return <CheckCheck size={14} className="text-white ml-1 inline-block shrink-0 drop-shadow-sm" />;
    } else {
      return <CheckCheck size={14} className="text-blue-200 ml-1 inline-block shrink-0" />;
    }
  };

  const getSmartTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yy');
  };

  const getOverlayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yyyy');
  };

  // Rendering
  if (activeChat) {
    return (
      <div className="flex h-[100dvh] flex-col bg-slate-50 overflow-hidden relative">
        <BackgroundOrbs />
        {/* Header */}
        <div className="flex items-center px-4 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 shadow-sm relative shrink-0">
          <button
            onClick={() => setActiveChat(null)}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0 ml-2">
            {getChatAvatar(activeChat) ? (
              <img src={getChatAvatar(activeChat)} className="w-full h-full object-cover" />
            ) : (
              <Users className="w-full h-full p-2 text-white bg-slate-400" />
            )}
          </div>
          <div className="ml-3 flex-1 min-w-0">
            <h1 className="text-base font-bold text-slate-900 truncate">{getChatName(activeChat)}</h1>
            <p className="text-xs text-slate-500 truncate">
              {activeChat.participants.map(p => p.firstName).join(', ')}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[120px]">
          {[...messages, ...pendingMessages].map((msg, index, arr) => {
            const isMine = msg.senderId === profile?.id;
            const sender = activeChat.participants.find(p => p.id === msg.senderId);
            const msgDate = new Date(msg.createdAt).toDateString();
            const prevMsgDate = index > 0 ? new Date(arr[index-1].createdAt).toDateString() : null;
            const showDateOverlay = msgDate !== prevMsgDate;

            return (
              <React.Fragment key={msg.id}>
                {showDateOverlay && (
                  <div className="flex justify-center my-4">
                    <span className="bg-slate-200/60 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm backdrop-blur-sm">
                      {getOverlayDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2 pb-1.5 shadow-sm relative ${isMine ? 'bg-blue-600 text-white rounded-tr-sm' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'}`}>
                    {!isMine && activeChat.type === 'group' && (
                      <div className="text-xs font-bold text-blue-500 mb-1">{sender?.firstName}</div>
                    )}
                    <div className="text-[15px] whitespace-pre-wrap break-words pr-14 pb-2">
                      {msg.content}
                    </div>
                    <div className={`text-[10px] text-right absolute bottom-1 right-3 flex items-center justify-end ${isMine ? 'text-blue-100' : 'text-slate-400'}`}>
                      {format(new Date(msg.createdAt), 'HH:mm')}
                      {isMine && renderTicks(msg, activeChat)}
                    </div>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area fixed at bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-3 pb-8 z-20">
          <form onSubmit={handleSendMessage} className="flex items-end gap-2">
            <div className="flex-1 flex bg-slate-100 rounded-3xl px-4 py-2 items-end">
              <textarea
                ref={textareaRef}
                value={messageText}
                onChange={e => {
                  setMessageText(e.target.value);
                  e.target.style.height = 'auto';
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (messageText.trim()) handleSendMessage(e);
                  }
                }}
                placeholder="Message"
                rows={1}
                className="bg-transparent border-none outline-none w-full text-slate-900 resize-none py-1 text-[15px]"
                style={{ minHeight: '24px', maxHeight: '100px' }}
              />
            </div>
            <button
              type="submit"
              disabled={!messageText.trim() || sendMessageMutation.isPending}
              className={`w-11 h-11 mb-0.5 rounded-full flex items-center justify-center shrink-0 transition-all shadow-sm ${messageText.trim() ? 'bg-blue-600 text-white scale-100' : 'bg-slate-200 text-slate-400 scale-95'}`}
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (showNewChat) {
    return (
      <div className="flex h-[100dvh] flex-col bg-slate-50 overflow-hidden relative">
        <BackgroundOrbs />
        <div className="flex items-center px-4 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 shadow-sm relative shrink-0">
          <button
            onClick={() => isCreatingGroup ? setIsCreatingGroup(false) : setShowNewChat(false)}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="ml-2 text-lg font-bold text-slate-900">{isCreatingGroup ? 'New Group' : 'New Chat'}</h1>
        </div>

        {isCreatingGroup ? (
          <div className="flex flex-col h-full overflow-hidden bg-white/50 backdrop-blur-sm relative z-10">
            <div className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50">
              <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0 border border-slate-300">
                <Users size={24} />
              </div>
              <input
                type="text"
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                placeholder="Group Subject"
                className="flex-1 bg-transparent border-b-2 border-blue-600 px-2 py-2 outline-none font-medium text-slate-900"
              />
            </div>
            <div className="p-4 bg-white border-b border-slate-100 flex justify-between items-center shrink-0 shadow-sm z-10">
              <span className="text-sm font-semibold text-slate-500">{selectedGroupParticipants.length} selected</span>
              <button
                onClick={handleCreateGroupChat}
                disabled={createChatMutation.isPending || !groupName.trim() || selectedGroupParticipants.length === 0}
                className="bg-blue-600 text-white px-5 py-2 rounded-full text-sm font-bold disabled:opacity-50 shadow-sm"
              >
                Create Group
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 pb-safe">
              {users.filter(u => u.id !== profile?.id).map(u => (
                <label key={u.id} className="flex items-center gap-4 w-full p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedGroupParticipants.includes(u.id)}
                    onChange={() => toggleGroupParticipant(u.id)}
                    className="w-5 h-5 text-blue-600 rounded-full border-slate-300 focus:ring-blue-600"
                  />
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                    {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2.5 text-slate-400 bg-slate-100" />}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="font-bold text-slate-800">{u.firstName} {u.lastName}</div>
                    <div className="text-xs text-slate-500 font-medium">{u.designation || 'Employee'}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm overflow-hidden relative z-10">
            <button onClick={() => setIsCreatingGroup(true)} className="flex items-center gap-4 w-full p-4 hover:bg-slate-50 border-b border-slate-100 text-left transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200 shadow-sm"><Users size={24} /></div>
              <span className="font-bold text-blue-700 text-base">New Group Chat</span>
            </button>
            <div className="flex-1 overflow-y-auto pb-safe">
              <h3 className="px-5 py-3 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50">Contacts</h3>
              <div className="px-2 pt-2">
                {users.filter(u => u.id !== profile?.id).map(u => (
                  <button key={u.id} onClick={() => handleCreatePersonalChat(u.id)} className="flex items-center gap-4 w-full p-3 hover:bg-slate-50 rounded-2xl text-left transition-colors">
                    <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                      {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2.5 text-slate-400 bg-slate-100" />}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="font-bold text-slate-800 text-base">{u.firstName} {u.lastName}</div>
                      <div className="text-sm text-slate-500">{u.designation || 'Employee'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col bg-slate-50 overflow-hidden relative">
      <BackgroundOrbs />
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 shadow-sm relative shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/employee', { replace: true })}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl font-bold text-slate-900">Chats</h1>
        </div>
        <button
          onClick={() => setShowNewChat(true)}
          className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors shadow-sm border border-blue-100"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto bg-transparent relative z-10">
        {chats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 border border-blue-100">
              <MessageSquare className="w-8 h-8 text-blue-500" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg mb-2">No Chats Yet</h3>
            <p className="text-slate-500 text-sm max-w-xs mx-auto mb-6">Start a conversation with a colleague to see it here.</p>
            <button
              onClick={() => setShowNewChat(true)}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-bold shadow-sm active:scale-95 transition-transform"
            >
              Start Chatting
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {chats.map(chat => (
              <div
                key={chat.id}
                onClick={async () => {
                  setActiveChat(chat);
                  if (chat.unread_count > 0) {
                    await queryClient.cancelQueries({ queryKey: ['chat', 'list'] });
                    queryClient.setQueryData(['chat', 'list'], old =>
                      old?.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c)
                    );
                  }
                }}
                className={`flex items-center px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors active:bg-slate-100 ${chat.unread_count > 0 ? 'bg-blue-50/30' : ''}`}
              >
                <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden shrink-0 mr-4 border border-slate-100 shadow-sm relative">
                  {getChatAvatar(chat) ? (
                    <img src={getChatAvatar(chat)} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-full h-full p-3 text-slate-400 bg-slate-100" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-base truncate ${chat.unread_count > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'}`}>
                      {getChatName(chat)}
                    </h3>
                    {chat.last_message && (
                      <span className={`text-xs shrink-0 ml-2 ${chat.unread_count > 0 ? 'text-blue-600 font-bold' : 'text-slate-400'}`}>
                        {getSmartTimestamp(chat.last_message.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-sm truncate pr-2 ${chat.unread_count > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                      {getDecryptedLastMessage(chat)}
                    </p>
                    {chat.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-[11px] font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5 shrink-0 shadow-sm">
                        {chat.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
