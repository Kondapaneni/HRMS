import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Send, Plus, Users, User, ArrowLeft, MessageSquare, MoreVertical, Paperclip, Smile, Check, CheckCheck, Mic } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';

export default function Chat() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeChat, setActiveChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState([]);
  const [pendingMessageIds, setPendingMessageIds] = useState(new Set());
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
    refetchInterval: 1500, // Poll every 1.5s for sidebar updates
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider data stale so refetches actually run
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
    refetchInterval: activeChat ? 1500 : false, // Poll every 1.5s for instant feel
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // 3. Supabase Realtime for Messages (Global for instant delivery of all chats)
  useEffect(() => {
    const channel = supabase
      .channel('global-chat')
      .on('postgres_changes', {
        event: '*', // Listen for ALL message inserts and updates
        schema: 'public',
        table: 'chat_messages'
      }, (payload) => {
        // Force refetch chat list instantly
        queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });

        // If we are currently in the chat that was updated, invalidate its messages too
        if (activeChat && payload.new && payload.new.chatId === activeChat.id) {
          queryClient.invalidateQueries({ queryKey: ['chat', 'messages', activeChat.id] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChat, queryClient]);

  // Scroll to bottom on new message or initial load
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

    // Process Read Receipts for Active Chat
    if (messages.length > 0 && activeChat && profile) {
      // Find messages not sent by us that don't have us in readBy
      const unread = messages.filter(m => m.senderId !== profile.id && !m.readBy?.includes(profile.id));

      // Send read receipts (user has opened the chat = they've read the messages)
      if (unread.length > 0 && document.hasFocus()) {
        const ids = unread.map(m => m.id);

        // Optimistically clear the unread count locally for instant UI update!
        queryClient.setQueryData(['chat', 'list'], old =>
          old?.map(c => c.id === activeChat.id ? { ...c, unread_count: 0 } : c)
        );

        api.post(`/chat/${activeChat.id}/messages/receipts`, { messageIds: ids, status: 'read' })
          .then(() => {
            // Force a refresh from backend once the DB is updated
            queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
          })
          .catch(console.error);
      }
    }
  }, [messages, activeChat, profile, queryClient]);

  // 4. Send Message Mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ payload, tempId }) => {
      const res = await api.post(`/chat/${activeChat.id}/messages`, payload);
      return { data: res.data, tempId };
    },
    onMutate: async ({ payload, tempId }) => {
      // Optimistic update — add a temporary message with pending state (single tick)
      const tempMsg = {
        id: tempId,
        chatId: activeChat.id,
        senderId: profile.id,
        content: payload.content,
        deliveredTo: [],
        readBy: [],
        createdAt: new Date().toISOString(),
        _pending: true, // local flag for single tick
      };
      setPendingMessageIds(prev => new Set([...prev, tempId]));
      queryClient.setQueryData(['chat', 'messages', activeChat.id], old => [...(old || []), tempMsg]);
      setMessageText('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      scrollToBottom();
    },
    onSuccess: ({ data, tempId }) => {
      // Replace optimistic message with real server-confirmed message (double ticks)
      setPendingMessageIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      queryClient.setQueryData(['chat', 'messages', activeChat.id], old => {
        return (old || []).map(m => m.id === tempId ? data : m);
      });
      scrollToBottom();
    },
    onError: (err, { tempId }) => {
      // Remove the optimistic message on failure
      setPendingMessageIds(prev => {
        const next = new Set(prev);
        next.delete(tempId);
        return next;
      });
      queryClient.setQueryData(['chat', 'messages', activeChat.id], old => {
        return (old || []).filter(m => m.id !== tempId);
      });
      toast.error('Failed to send message');
    }
  });

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageText.trim() || !activeChat) return;

    try {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sendMessageMutation.mutate({
        payload: { content: messageText },
        tempId
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    }
  };

  // 5. Create Chat Mutation
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
    createChatMutation.mutate({
      type: 'personal',
      participants: [targetUserId]
    });
  };

  const handleCreateGroupChat = () => {
    if (!groupName.trim()) {
      toast.error('Group name is required');
      return;
    }
    if (selectedGroupParticipants.length === 0) {
      toast.error('Select at least one participant');
      return;
    }
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

  // Renders ticks for a message. Uses the provided chat's participants for context.
  const renderTicks = (msg, chat) => {
    if (!chat || !profile) return null;

    // Single tick = message is still being sent (optimistic/pending)
    if (msg._pending || pendingMessageIds.has(msg.id)) {
      return <Check size={14} className="text-slate-400 ml-1 inline-block shrink-0" />;
    }

    // Check if all other participants have read the message
    const chatParticipants = chat.participants.filter(p => p.id !== profile.id);
    const numOtherParticipants = chatParticipants.length;
    const readCount = (msg.readBy || []).filter(id => id !== profile.id).length;

    if (readCount > 0 && readCount >= numOtherParticipants) {
      return <CheckCheck size={14} className="text-[#53bdeb] ml-1 inline-block shrink-0" />;
    } else {
      return <CheckCheck size={14} className="text-slate-400 ml-1 inline-block shrink-0" />;
    }
  };

  // Wrapper for active chat messages
  const renderMessageTicks = (msg) => renderTicks(msg, activeChat);

  // Smart timestamp for sidebar (Today=HH:mm, Yesterday="Yesterday", older=dd/MM/yy)
  const getSmartTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'HH:mm');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yy');
  };

  // WhatsApp clone layout
  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-transparent font-sans -m-4 sm:-m-6 relative z-10 overflow-hidden">

      {/* Sidebar */}
      <div className={`w-full md:w-80 lg:w-96 flex flex-col bg-white/80 backdrop-blur-md border-r border-slate-200 shrink-0 ${activeChat || showNewChat ? 'hidden md:flex' : 'flex'}`}>

        {/* Profile / Actions Header */}
        <div className="h-16 bg-slate-50/50 flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
            {profile?.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-slate-500 bg-slate-200" />}
          </div>

        </div>

        {/* Search */}
        <div className="p-2 border-b border-slate-100 bg-white/50 shrink-0">
          <div className="bg-slate-100 rounded-lg flex items-center px-3 py-1.5">
            <Search size={18} className="text-slate-400 mr-3" />
            <input
              type="text"
              placeholder="Search or start new chat"
              className="bg-transparent border-none outline-none text-sm w-full"
            />
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto bg-transparent chat-scrollbar">
          {chats.map(chat => (
            <div
              key={chat.id}
              onClick={async () => {
                setActiveChat(chat);
                setShowNewChat(false);

                // Optimistically clear unread counts for instant UI feedback
                if (chat.unread_count > 0) {
                  // Cancel any in-flight polling that might return stale data
                  await queryClient.cancelQueries({ queryKey: ['chat', 'list'] });

                  queryClient.setQueryData(['chat', 'list'], old =>
                    old?.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c)
                  );
                }
              }}
              className={`flex items-center px-3 py-3 cursor-pointer hover:bg-slate-100/50 transition-colors ${activeChat?.id === chat.id ? 'bg-slate-100/80' : ''}`}
            >
              <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 mr-3">
                {getChatAvatar(chat) ? (
                  <img src={getChatAvatar(chat)} className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-full h-full p-2.5 text-white bg-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0 border-b border-slate-100 pb-3 h-full">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className="text-slate-900 font-medium truncate">{getChatName(chat)}</h3>
                  {chat.last_message && (
                    <span className={`text-xs shrink-0 ml-2 ${chat.unread_count > 0 ? 'text-[#25d366] font-semibold' : 'text-slate-500'}`}>
                      {getSmartTimestamp(chat.last_message.createdAt)}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center text-sm">
                  <p className={`truncate pr-2 ${chat.unread_count > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
                    {getDecryptedLastMessage(chat)}
                  </p>
                  {chat.unread_count > 0 && (
                    <span className="bg-[#25d366] text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shrink-0">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* New Chat Button */}
        <div className="min-h-[68px] px-4 bg-white/50 shrink-0 flex items-center justify-center border-t border-slate-200">
          <button
            onClick={() => { setShowNewChat(true); setActiveChat(null); }}
            className="flex items-center gap-2 text-sm font-medium text-white bg-slate-800 px-4 py-2 rounded-full hover:bg-slate-700 transition-all shadow-md"
          >
            <Plus size={18} /> New Chat
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-transparent relative min-h-0 overflow-hidden ${!activeChat && !showNewChat ? 'hidden md:flex items-center justify-center' : 'flex'}`}>

        {!activeChat && !showNewChat ? (
          <div className="text-center relative z-10">
            <div className="w-72 h-72 mx-auto mb-8 opacity-20">
              <MessageSquare className="w-full h-full text-slate-800" />
            </div>
            <h1 className="text-3xl font-light text-slate-700 mb-4">Acme Secure Chat</h1>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Send and receive messages with End-to-End Encryption. Internal communications remain strictly confidential.
            </p>
          </div>
        ) : showNewChat ? (
          /* New Chat Selection Pane */
          <div className="flex-1 bg-white relative z-10 flex flex-col">
            <div className="h-16 bg-[#008069] text-white flex items-center px-4 shrink-0">
              <button
                onClick={() => isCreatingGroup ? setIsCreatingGroup(false) : setShowNewChat(false)}
                className="mr-4 hover:bg-white/10 p-1 rounded-full"
              >
                <ArrowLeft size={20} />
              </button>
              <h2 className="font-semibold">{isCreatingGroup ? 'New Group' : 'New Chat'}</h2>
            </div>

            {isCreatingGroup ? (
              <div className="flex flex-col h-full overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                    <Users size={24} />
                  </div>
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="Group Subject"
                    className="flex-1 border-b-2 border-[#008069] px-2 py-1 outline-none"
                  />
                </div>
                <div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <span className="text-sm font-semibold text-slate-500">{selectedGroupParticipants.length} selected</span>
                  <button
                    onClick={handleCreateGroupChat}
                    disabled={createChatMutation.isPending || !groupName.trim() || selectedGroupParticipants.length === 0}
                    className="bg-[#00a884] text-white px-4 py-1.5 rounded-full text-sm font-semibold disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1 chat-scrollbar">
                  {users.filter(u => u.id !== profile?.id).map(u => (
                    <label key={u.id} className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedGroupParticipants.includes(u.id)}
                        onChange={() => toggleGroupParticipant(u.id)}
                        className="w-4 h-4 text-[#008069] rounded border-slate-300 focus:ring-[#008069]"
                      />
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                      </div>
                      <div className="flex-1 border-b border-slate-100 pb-2">
                        <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-slate-100">
                  <button onClick={() => setIsCreatingGroup(true)} className="flex items-center gap-4 w-full p-2 hover:bg-slate-50 rounded text-left">
                    <div className="w-10 h-10 rounded-full bg-[#008069] flex items-center justify-center text-white"><Users size={20} /></div>
                    <span className="font-medium">New Group</span>
                  </button>
                </div>
                <div className="p-4 flex-1 overflow-y-auto chat-scrollbar">
                  <h3 className="text-[#008069] text-sm font-semibold mb-4 uppercase tracking-wider">Contacts</h3>
                  <div className="space-y-1">
                    {users.filter(u => u.id !== profile?.id).map(u => (
                      <button key={u.id} onClick={() => handleCreatePersonalChat(u.id)} className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded text-left">
                        <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                          {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                        </div>
                        <div className="flex-1 border-b border-slate-100 pb-2">
                          <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                          <div className="text-xs text-slate-500">Available on Acme Chat</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Active Chat Pane */
          <div className="flex-1 flex flex-col relative z-10 min-h-0 overflow-hidden">
            {/* Header */}
            <div className="h-16 bg-white/80 backdrop-blur-md flex items-center justify-between px-4 border-b border-slate-200 shrink-0">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveChat(null)} className="md:hidden mr-2 text-slate-600"><ArrowLeft size={20} /></button>
                <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                  {getChatAvatar(activeChat) ? (
                    <img src={getChatAvatar(activeChat)} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-full h-full p-2 text-white bg-slate-400" />
                  )}
                </div>
                <div>
                  <h2 className="font-semibold text-slate-800 leading-tight">{getChatName(activeChat)}</h2>
                  <p className="text-xs text-slate-500 truncate max-w-xs">
                    {activeChat.participants.map(p => p.firstName).join(', ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-4 text-slate-500">
                <Search size={20} className="cursor-pointer hover:text-slate-700" />
                <MoreVertical size={20} className="cursor-pointer hover:text-slate-700" />
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 chat-scrollbar">

              {messages.map(msg => {
                const isMine = msg.senderId === profile?.id;
                const sender = activeChat.participants.find(p => p.id === msg.senderId);
                return (
                  <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 pb-1 shadow-sm relative ${isMine ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                      {!isMine && activeChat.type === 'group' && (
                        <div className="text-xs font-bold text-blue-500 mb-1">{sender?.firstName}</div>
                      )}
                      <div className="text-sm text-slate-800 whitespace-pre-wrap break-words pr-12">
                        {msg.content}
                      </div>
                      <div className="text-[10px] text-slate-400 text-right mt-1 ml-4 absolute bottom-1 right-2 flex items-center justify-end">
                        {format(new Date(msg.createdAt), 'HH:mm')}
                        {isMine && renderMessageTicks(msg)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="min-h-[68px] py-2 px-4 bg-white/80 backdrop-blur-md flex items-end gap-3 shrink-0 border-t border-slate-200">
              <div className="flex gap-3 text-slate-500 px-2 shrink-0 pb-3">
                <Smile size={24} className="cursor-pointer hover:text-slate-700" />
                <Paperclip size={24} className="cursor-pointer hover:text-slate-700" />
              </div>
              <form onSubmit={handleSendMessage} className="flex-1 flex bg-white rounded-2xl px-5 py-2 border border-slate-200 shadow-sm focus-within:border-[#00a884] focus-within:ring-1 focus-within:ring-[#00a884] items-end">
                <textarea
                  ref={textareaRef}
                  value={messageText}
                  onChange={e => {
                    setMessageText(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (messageText.trim()) handleSendMessage(e);
                    }
                  }}
                  placeholder="Type a message"
                  rows={1}
                  className="bg-transparent border-none outline-none w-full text-slate-700 resize-none overflow-y-auto chat-scrollbar py-1.5"
                  style={{ minHeight: '36px', maxHeight: '120px' }}
                />
              </form>
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                className={`w-10 h-10 mb-1 rounded-full flex items-center justify-center shrink-0 transition-colors ${messageText.trim() ? 'bg-[#00a884] text-white hover:bg-[#008f6f]' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
