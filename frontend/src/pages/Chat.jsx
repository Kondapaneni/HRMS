import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Send, Plus, Users, User, ArrowLeft, MessageSquare, MoreVertical, Paperclip, Smile, Check, CheckCheck, Mic, FileText, Image as ImageIcon, X, Download, Camera, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker from 'emoji-picker-react';

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

export default function Chat() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [activeChat, setActiveChat] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupCreationStep, setGroupCreationStep] = useState(1);
  const [groupName, setGroupName] = useState('');
  const [selectedGroupParticipants, setSelectedGroupParticipants] = useState([]);
  const [groupAvatarFile, setGroupAvatarFile] = useState(null);
  const [groupPermissions, setGroupPermissions] = useState({
    editSettings: true,
    sendMessages: true,
    addMembers: true,
    approveNewMembers: false
  });
  const groupAvatarInputRef = useRef(null);
  const [pendingMessages, setPendingMessages] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
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
    mutationFn: async ({ payload, tempId, fileToUpload }) => {
      let attachmentData = null;
      if (fileToUpload) {
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${profile.id}/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, fileToUpload);
          
        if (uploadError) throw new Error('File upload failed');
        
        const { data } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(filePath);
          
        attachmentData = {
          attachmentUrl: data.publicUrl,
          attachmentType: fileToUpload.type,
          attachmentName: fileToUpload.name,
          attachmentSize: fileToUpload.size
        };
      }
      
      const finalPayload = { ...payload, ...attachmentData };
      const res = await api.post(`/chat/${activeChat.id}/messages`, finalPayload);
      return { data: res.data, tempId };
    },
    onMutate: async ({ payload, tempId, fileToUpload }) => {
      const tempMsg = {
        id: tempId,
        chatId: activeChat.id,
        senderId: profile.id,
        content: payload.content,
        deliveredTo: [],
        readBy: [],
        createdAt: new Date().toISOString(),
        _pending: true,
        attachmentUrl: fileToUpload ? URL.createObjectURL(fileToUpload) : null,
        attachmentType: fileToUpload ? fileToUpload.type : null,
        attachmentName: fileToUpload ? fileToUpload.name : null,
        attachmentSize: fileToUpload ? fileToUpload.size : null
      };

      setPendingMessages(prev => [...prev, tempMsg]);

      setMessageText('');
      setAttachment(null);
      setShowEmojiPicker(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
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
    if (!messageText.trim() && !attachment) return;

    try {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sendMessageMutation.mutate({
        payload: { content: messageText.trim() },
        tempId,
        fileToUpload: attachment
      });
    } catch (err) {
      console.error(err);
      toast.error('Failed to send message');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Check size limit (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }
    
    setAttachment(file);
    setShowEmojiPicker(false);
  };

  // 5. Create Chat Mutation
  const createChatMutation = useMutation({
    mutationFn: async ({ payload, fileToUpload }) => {
      let avatarData = null;
      if (fileToUpload) {
        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `groups/${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat_attachments')
          .upload(filePath, fileToUpload);
          
        if (uploadError) throw new Error('Group icon upload failed');
        
        const { data } = supabase.storage
          .from('chat_attachments')
          .getPublicUrl(filePath);
          
        avatarData = { group_avatar: data.publicUrl };
      }
      
      const res = await api.post('/chat', { ...payload, ...avatarData });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chat', 'list']);
      setShowNewChat(false);
      setIsCreatingGroup(false);
      setGroupCreationStep(1);
      setGroupName('');
      setSelectedGroupParticipants([]);
      setGroupAvatarFile(null);
      toast.success('Group created successfully');
    }
  });

  const handleCreatePersonalChat = (targetUserId) => {
    createChatMutation.mutate({
      payload: {
        type: 'personal',
        participants: [targetUserId]
      }
    });
  };

  const handleCreateGroupChat = () => {
    if (selectedGroupParticipants.length === 0) {
      toast.error('Select at least one participant');
      return;
    }
    createChatMutation.mutate({
      payload: {
        type: 'group',
        name: groupName || 'Group Chat',
        participants: selectedGroupParticipants,
        permissions: groupPermissions
      },
      fileToUpload: groupAvatarFile
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
    if (msg._pending) {
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

  const getOverlayDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'dd/MM/yyyy');
  };

  // WhatsApp clone layout
  return (
    <div className="flex h-[calc(100vh-3.5rem)] bg-transparent font-sans -m-4 sm:-m-6 relative z-10 overflow-hidden">
      <BackgroundOrbs />

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
            <div className="h-16 bg-[#008069] text-white flex items-center px-4 shrink-0 shadow-sm z-20">
              <button
                onClick={() => {
                  if (isCreatingGroup) {
                    if (groupCreationStep > 1) setGroupCreationStep(groupCreationStep - 1);
                    else { setIsCreatingGroup(false); setGroupCreationStep(1); }
                  } else {
                    setShowNewChat(false);
                  }
                }}
                className="mr-4 hover:bg-white/10 p-2 rounded-full transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <h2 className="font-semibold text-lg">{isCreatingGroup ? (groupCreationStep === 3 ? 'Group permissions' : 'New group') : 'New chat'}</h2>
            </div>

            {isCreatingGroup ? (
              <div className="flex flex-col h-full overflow-hidden bg-slate-50">
                {groupCreationStep === 1 && (
                  <>
                    <div className="p-3 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
                      <div className="text-sm font-semibold text-slate-500">{selectedGroupParticipants.length}/1023 selected</div>
                      <button
                        onClick={() => setGroupCreationStep(2)}
                        disabled={selectedGroupParticipants.length === 0}
                        className="text-[#008069] font-bold disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="p-2 bg-white border-b border-slate-100">
                      <div className="bg-slate-100 rounded-lg flex items-center px-3 py-1.5">
                        <Search size={18} className="text-slate-400 mr-2" />
                        <input type="text" placeholder="Search name or number" className="bg-transparent border-none outline-none text-sm w-full" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto chat-scrollbar bg-white">
                      <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">Frequently contacted</div>
                      {users.filter(u => u.id !== profile?.id).map(u => (
                        <label key={u.id} className="flex items-center gap-4 w-full p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50">
                          <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0">
                            {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2.5 text-white bg-slate-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-slate-800 text-lg">{u.firstName} {u.lastName}</div>
                            <div className="text-sm text-slate-500">{u.designation || 'Employee'}</div>
                          </div>
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selectedGroupParticipants.includes(u.id) ? 'bg-[#008069] border-[#008069]' : 'border-slate-300'}`}>
                            {selectedGroupParticipants.includes(u.id) && <Check size={14} className="text-white" />}
                          </div>
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {groupCreationStep === 2 && (
                  <>
                    <div className="p-4 bg-white border-b border-slate-100 flex items-center gap-4 shadow-sm z-10">
                      <button onClick={() => groupAvatarInputRef.current?.click()} className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200 hover:bg-slate-200 transition-colors relative overflow-hidden">
                        {groupAvatarFile ? <img src={URL.createObjectURL(groupAvatarFile)} className="w-full h-full object-cover" /> : <Camera size={24} />}
                        <input type="file" ref={groupAvatarInputRef} onChange={e => e.target.files[0] && setGroupAvatarFile(e.target.files[0])} className="hidden" accept="image/*" />
                      </button>
                      <input
                        type="text"
                        value={groupName}
                        onChange={e => setGroupName(e.target.value)}
                        placeholder="Group name (optional)"
                        className="flex-1 border-b-2 border-[#008069] px-2 py-2 outline-none font-medium text-slate-900"
                      />
                    </div>
                    <div className="bg-white mt-2 border-y border-slate-100">
                      <div className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50">
                        <span className="text-slate-800 text-lg">Disappearing messages</span>
                        <div className="flex items-center text-slate-500">
                          <span className="mr-2">Off</span>
                          <ChevronRight size={20} />
                        </div>
                      </div>
                      <div onClick={() => setGroupCreationStep(3)} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50">
                        <span className="text-slate-800 text-lg">Group permissions</span>
                        <ChevronRight size={20} className="text-slate-500" />
                      </div>
                    </div>
                    <div className="mt-4 px-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Members: {selectedGroupParticipants.length} of 1023</span>
                    </div>
                    <div className="flex-1 overflow-y-auto chat-scrollbar p-4 flex flex-wrap content-start gap-4">
                      {selectedGroupParticipants.map(id => {
                        const u = users.find(user => user.id === id);
                        if (!u) return null;
                        return (
                          <div key={u.id} className="flex flex-col items-center relative w-16">
                            <div className="w-14 h-14 rounded-full bg-slate-200 overflow-hidden mb-1">
                              {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-white bg-slate-400" />}
                            </div>
                            <button onClick={() => toggleGroupParticipant(u.id)} className="absolute -top-1 -right-1 w-6 h-6 bg-slate-400 text-white rounded-full flex items-center justify-center border-2 border-slate-50 hover:bg-red-500 transition-colors shadow-sm">
                              <X size={14} />
                            </button>
                            <span className="text-xs text-slate-700 font-medium truncate w-full text-center">{u.firstName}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="p-4 bg-transparent shrink-0 flex justify-center">
                      <button
                        onClick={handleCreateGroupChat}
                        disabled={createChatMutation.isPending}
                        className="bg-[#00a884] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-[#008f6f] disabled:opacity-50 transition-all active:scale-95"
                      >
                        <Check size={28} />
                      </button>
                    </div>
                  </>
                )}

                {groupCreationStep === 3 && (
                  <>
                    <div className="flex-1 overflow-y-auto chat-scrollbar bg-slate-50">
                      <div className="p-4">
                        <h3 className="text-slate-900 font-bold mb-3 text-lg">Members can</h3>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                          <label className="flex items-start justify-between p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="flex-1 mr-4">
                              <div className="text-lg text-slate-900 font-medium mb-1">Edit group settings</div>
                              <div className="text-sm text-slate-500 leading-relaxed">This includes the group name, icon, description, disappearing message timer, advanced chat privacy, and the ability to pin, keep or unkeep messages.</div>
                            </div>
                            <input type="checkbox" checked={groupPermissions.editSettings} onChange={e => setGroupPermissions({...groupPermissions, editSettings: e.target.checked})} className="w-6 h-6 rounded-full text-[#00a884] focus:ring-[#00a884] mt-1 cursor-pointer" />
                          </label>
                          <label className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="text-lg text-slate-900 font-medium">Send new messages</div>
                            <input type="checkbox" checked={groupPermissions.sendMessages} onChange={e => setGroupPermissions({...groupPermissions, sendMessages: e.target.checked})} className="w-6 h-6 rounded-full text-[#00a884] focus:ring-[#00a884] cursor-pointer" />
                          </label>
                          <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="text-lg text-slate-900 font-medium">Add other members</div>
                            <input type="checkbox" checked={groupPermissions.addMembers} onChange={e => setGroupPermissions({...groupPermissions, addMembers: e.target.checked})} className="w-6 h-6 rounded-full text-[#00a884] focus:ring-[#00a884] cursor-pointer" />
                          </label>
                        </div>
                        <p className="text-sm text-slate-500 mt-3 mb-6 px-2">Turning off these settings means that only group admins can perform this action.</p>

                        <h3 className="text-slate-900 font-bold mb-3 text-lg">Admins can</h3>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                          <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="text-lg text-slate-900 font-medium">Approve new members</div>
                            <input type="checkbox" checked={groupPermissions.approveNewMembers} onChange={e => setGroupPermissions({...groupPermissions, approveNewMembers: e.target.checked})} className="w-6 h-6 rounded-full text-[#00a884] focus:ring-[#00a884] cursor-pointer" />
                          </label>
                        </div>
                        <p className="text-sm text-slate-500 mt-3 px-2">When turned on, admins must approve anyone who wants to join this group.</p>
                      </div>
                    </div>
                  </>
                )}
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
                        <span className="bg-white/80 text-slate-500 text-[11px] font-bold px-3 py-1 rounded-md uppercase tracking-wider shadow-sm backdrop-blur-sm">
                          {getOverlayDate(msg.createdAt)}
                        </span>
                      </div>
                    )}
                    <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[75%] md:max-w-[65%] rounded-lg px-3 py-2 pb-1 shadow-sm relative ${isMine ? 'bg-[#d9fdd3] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
                        {!isMine && activeChat.type === 'group' && (
                          <div className="text-xs font-bold text-blue-500 mb-1">{sender?.firstName}</div>
                        )}
                        <div className="text-sm text-slate-800 whitespace-pre-wrap break-words pr-14 pb-2">
                          {msg.attachmentUrl && (
                            <div className="mb-2 w-full max-w-xs md:max-w-md">
                              {msg.attachmentType?.startsWith('image/') ? (
                                <img src={msg.attachmentUrl} alt="attachment" className="rounded-lg w-full object-cover border border-slate-200 shadow-sm" style={{ maxHeight: '300px' }} />
                              ) : (
                                <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-lg border shadow-sm transition-colors ${isMine ? 'bg-white/40 border-white/50 hover:bg-white/50' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'}`}>
                                  <div className={`p-2 rounded-lg shrink-0 ${isMine ? 'bg-white/50 text-slate-800' : 'bg-white border border-slate-200 text-blue-600'}`}>
                                    <FileText size={20} />
                                  </div>
                                  <div className="overflow-hidden">
                                    <div className="text-sm font-semibold truncate">{msg.attachmentName || 'Document'}</div>
                                    <div className={`text-xs ${isMine ? 'text-slate-600' : 'text-slate-500'}`}>{(msg.attachmentSize / 1024 / 1024).toFixed(2)} MB</div>
                                  </div>
                                  <Download size={16} className={`ml-auto shrink-0 ${isMine ? 'text-slate-700' : 'text-slate-400'}`} />
                                </a>
                              )}
                            </div>
                          )}
                          {msg.content}
                        </div>
                        <div className="text-[10px] text-slate-400 text-right absolute bottom-1 right-2 flex items-center justify-end">
                          {format(new Date(msg.createdAt), 'HH:mm')}
                          {isMine && renderMessageTicks(msg)}
                        </div>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="bg-white/80 backdrop-blur-md flex flex-col shrink-0 border-t border-slate-200 relative z-20">
              <AnimatePresence>
                {attachment && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="p-3 mx-4 mt-2 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                        {attachment.type.startsWith('image/') ? <ImageIcon size={20} /> : <FileText size={20} />}
                      </div>
                      <div className="truncate">
                        <div className="text-sm font-bold text-slate-800 truncate">{attachment.name}</div>
                        <div className="text-xs text-slate-500 font-medium">{(attachment.size / 1024 / 1024).toFixed(2)} MB</div>
                      </div>
                    </div>
                    <button onClick={() => setAttachment(null)} className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
                      <X size={20} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="min-h-[68px] py-2 px-4 flex items-end gap-3">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                
                <div className="flex gap-2 text-slate-500 px-1 shrink-0 pb-2">
                  <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Smile size={24} className="cursor-pointer hover:text-slate-700" />
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <Paperclip size={24} className="cursor-pointer hover:text-slate-700" />
                  </button>
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
                        if (messageText.trim() || attachment) handleSendMessage(e);
                      }
                    }}
                    placeholder="Type a message..."
                    rows={1}
                    className="bg-transparent border-none outline-none w-full text-slate-700 resize-none overflow-y-auto chat-scrollbar py-1.5"
                    style={{ minHeight: '36px', maxHeight: '120px' }}
                  />
                </form>
                <button
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && !attachment) || sendMessageMutation.isPending}
                  className={`w-11 h-11 mb-1 rounded-full flex items-center justify-center shrink-0 transition-all ${messageText.trim() || attachment ? 'bg-[#00a884] text-white hover:bg-[#008f6f] shadow-md scale-100' : 'bg-slate-200 text-slate-400 cursor-not-allowed scale-95'}`}
                >
                  <Send size={18} />
                </button>
              </div>
              
              <AnimatePresence>
                {showEmojiPicker && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 320, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 bg-slate-50">
                    <EmojiPicker onEmojiClick={(e) => setMessageText(prev => prev + e.emoji)} width="100%" height={320} searchDisabled skinTonesDisabled />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
