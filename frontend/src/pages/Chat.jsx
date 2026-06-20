import React, { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Send, Plus, Users, User, ArrowLeft, MessageSquare, MoreVertical, Paperclip, Smile, Check, CheckCheck, Mic, FileText, Image as ImageIcon, X, Download, Camera, ChevronRight, Phone, Video, Shield, Edit2, UserPlus } from 'lucide-react';
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
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [adminToggleDialog, setAdminToggleDialog] = useState({ isOpen: false, targetUser: null, isCurrentlyAdmin: false });
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
  
  const [renameDialog, setRenameDialog] = useState({ isOpen: false, name: '' });
  
  const [addMembersDialog, setAddMembersDialog] = useState(false);
  const [pendingMembersDialog, setPendingMembersDialog] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [addMembersSearchQuery, setAddMembersSearchQuery] = useState('');
  
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');

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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries(['chat', 'list']);
      setShowNewChat(false);
      setIsCreatingGroup(false);
      setGroupCreationStep(1);
      setGroupName('');
      setSelectedGroupParticipants([]);
      setGroupAvatarFile(null);
      
      if (variables.payload && variables.payload.type === 'personal') {
        toast.success('Chat created successfully');
      } else {
        toast.success('Group created successfully');
      }
    }
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ chatId, targetUserId }) => {
      const res = await api.put(`/chat/${chatId}/admins/toggle`, { targetUserId });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chat', 'list']);
      toast.success('Admin status updated');
      
      // Optionally update local state for immediate feedback
      if (activeChat) {
        setActiveChat({
          ...activeChat,
          admin_ids: data.admin_ids
        });
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update admin status');
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ chatId, permissionKey, permissionValue }) => {
      const res = await api.put(`/chat/${chatId}/permissions`, { permissionKey, permissionValue });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chat', 'list']);
      toast.success('Group settings updated');
      
      if (activeChat) {
        setActiveChat({
          ...activeChat,
          permissions: data.permissions
        });
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update group settings');
    }
  });

  const handleTogglePermission = (permissionKey) => {
    if (!activeChat || activeChat.type !== 'group') return;
    const isAmIAdmin = activeChat.admin_ids?.includes(profile?.id);
    if (!isAmIAdmin) return;
    
    const currentValue = activeChat.permissions?.[permissionKey];
    updatePermissionsMutation.mutate({ 
      chatId: activeChat.id, 
      permissionKey, 
      permissionValue: !currentValue 
    });
  };

  const handleToggleAdmin = (targetUserId, currentAdmins) => {
    // Replaced by direct click handler invoking the modal
  };

  const renameGroupMutation = useMutation({
    mutationFn: async ({ chatId, name }) => {
      const res = await api.put(`/chat/${chatId}`, { name });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
      setActiveChat(prev => prev ? { ...prev, name: data.name } : null);
      toast.success('Group name updated');
      setRenameDialog({ isOpen: false, name: '' });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to rename group');
    }
  });

  const updateGroupAvatarMutation = useMutation({
    mutationFn: async ({ chatId, fileToUpload }) => {
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
        
      const res = await api.put(`/chat/${chatId}/avatar`, { group_avatar: data.publicUrl });
      return { ...res.data, group_avatar: data.publicUrl };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['chat', 'list']);
      setActiveChat(prev => prev ? { ...prev, group_avatar: data.group_avatar } : null);
      toast.success('Group avatar updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || err.message || 'Failed to update avatar');
    }
  });

  const addMembersMutation = useMutation({
    mutationFn: async ({ chatId, userIds }) => {
      const res = await api.post(`/chat/${chatId}/participants`, { userIds });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
      toast.success(data.status === 'pending' ? 'Approval requested for new members' : 'Members added successfully');
      setAddMembersDialog(false);
      setSelectedNewMembers([]);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add members');
    }
  });

  const managePendingMutation = useMutation({
    mutationFn: async ({ chatId, userId, action }) => {
      const res = await api.put(`/chat/${chatId}/participants/pending`, { userId, action });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
      toast.success(`Request ${data.action}d`);
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to process request');
    }
  });

  const removeParticipantMutation = useMutation({
    mutationFn: async ({ chatId, userId }) => {
      const res = await api.delete(`/chat/${chatId}/participants/${userId}`);
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'list'] });
      if (variables.userId === profile?.id) {
        toast.success('You have left the group');
        setActiveChat(null);
      } else {
        toast.success('Participant removed');
      }
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to process request');
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
    if (chat.type === 'group') return chat.group_avatar || null;
    const other = chat.participants.find(p => p.id !== profile?.id);
    return other?.avatar || null;
  };

  const getDecryptedLastMessage = (chat) => {
    if (!chat.last_message) return 'Start chatting';
    if (chat.last_message.content) return chat.last_message.content;
    if (chat.last_message.attachmentType) {
      if (chat.last_message.attachmentType.startsWith('image/')) return '📷 Photo';
      return '📄 Document';
    }
    return 'Start chatting';
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
      <div className={`flex-1 flex-col bg-transparent relative min-h-0 overflow-hidden ${showContactInfo ? 'hidden' : (!activeChat && !showNewChat ? 'hidden md:flex items-center justify-center' : 'flex')}`}>

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
                        <input type="text" value={contactSearchQuery} onChange={e => setContactSearchQuery(e.target.value)} placeholder="Search name or number" className="bg-transparent border-none outline-none text-sm w-full" />
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto chat-scrollbar bg-white">
                      <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider bg-slate-50 border-b border-slate-100">Frequently contacted</div>
                      {users
                        .filter(u => u.id !== profile?.id)
                        .filter(u => `${u.firstName} ${u.lastName}`.toLowerCase().includes(contactSearchQuery.toLowerCase()))
                        .map(u => (
                        <div key={u.id} onClick={() => toggleGroupParticipant(u.id)} className="flex items-center gap-4 w-full p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors">
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
                        </div>
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
                          <div onClick={() => setGroupPermissions({...groupPermissions, editSettings: !groupPermissions.editSettings})} className="flex items-start justify-between p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="flex-1 mr-4">
                              <div className="text-lg text-slate-900 font-medium mb-1">Edit group settings</div>
                              <div className="text-sm text-slate-500 leading-relaxed">This includes the group name, icon, description, disappearing message timer, advanced chat privacy, and the ability to pin, keep or unkeep messages.</div>
                            </div>
                            <div className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 mt-1 transition-colors ${groupPermissions.editSettings ? 'bg-[#00a884]' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${groupPermissions.editSettings ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                          <div onClick={() => setGroupPermissions({...groupPermissions, sendMessages: !groupPermissions.sendMessages})} className="flex items-center justify-between p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="text-lg text-slate-900 font-medium">Send new messages</div>
                            <div className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${groupPermissions.sendMessages ? 'bg-[#00a884]' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${groupPermissions.sendMessages ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                          <div onClick={() => setGroupPermissions({...groupPermissions, addMembers: !groupPermissions.addMembers})} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="text-lg text-slate-900 font-medium">Add other members</div>
                            <div className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${groupPermissions.addMembers ? 'bg-[#00a884]' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${groupPermissions.addMembers ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 mt-3 mb-6 px-2">Turning off these settings means that only group admins can perform this action.</p>

                        <h3 className="text-slate-900 font-bold mb-3 text-lg">Admins can</h3>
                        <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
                          <div onClick={() => setGroupPermissions({...groupPermissions, approveNewMembers: !groupPermissions.approveNewMembers})} className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors">
                            <div className="text-lg text-slate-900 font-medium">Approve new members</div>
                            <div className={`w-11 h-6 shrink-0 flex items-center rounded-full p-1 transition-colors ${groupPermissions.approveNewMembers ? 'bg-[#00a884]' : 'bg-slate-300'}`}>
                              <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${groupPermissions.approveNewMembers ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                          </div>
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
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setShowContactInfo(!showContactInfo)}>
                <button onClick={(e) => { e.stopPropagation(); setActiveChat(null); }} className="md:hidden mr-2 text-slate-600"><ArrowLeft size={20} /></button>
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
                <Search onClick={() => setShowMessageSearch(!showMessageSearch)} size={20} className={`cursor-pointer transition-colors ${showMessageSearch ? 'text-[#008069]' : 'hover:text-slate-700'}`} />
                <MoreVertical onClick={() => setShowContactInfo(!showContactInfo)} size={20} className="cursor-pointer hover:text-slate-700" />
              </div>
            </div>

            <AnimatePresence>
              {showMessageSearch && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-white border-b border-slate-200 px-4 py-2 shrink-0 relative z-10 shadow-sm overflow-hidden">
                  <div className="relative flex items-center">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search size={16} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      autoFocus
                      value={messageSearchQuery}
                      onChange={(e) => setMessageSearchQuery(e.target.value)}
                      placeholder="Search messages..."
                      className="w-full bg-slate-100 border-none text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-[#008069] block pl-10 p-2 transition-all outline-none"
                    />
                    {messageSearchQuery && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <button onClick={() => setMessageSearchQuery('')} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                          <X size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-3 chat-scrollbar">

              {[...messages, ...pendingMessages]
                .filter(msg => !messageSearchQuery || (msg.content && msg.content.toLowerCase().includes(messageSearchQuery.toLowerCase())))
                .map((msg, index, arr) => {
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
            {activeChat.type === 'group' && activeChat.permissions?.sendMessages === false && !activeChat.admin_ids?.includes(profile?.id) ? (
              <div className="bg-slate-50 py-4 px-4 text-center text-sm text-slate-500 font-medium border-t border-slate-200 shrink-0">
                Only admins can send messages in this group.
              </div>
            ) : (
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
            )}
          </div>
        )}
      </div>

      {/* Contact Info Sidebar */}
      {showContactInfo && activeChat && (
        <div className="flex-1 flex flex-col bg-slate-50 border-l border-slate-200 relative z-10 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)]">
          <div className="h-16 bg-white flex items-center px-4 border-b border-slate-200 shrink-0 shadow-sm z-10">
            <button onClick={() => setShowContactInfo(false)} className="mr-4 p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"><X size={20} /></button>
            <h2 className="font-semibold text-slate-800">{activeChat.type === 'group' ? 'Group info' : 'Contact info'}</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto chat-scrollbar bg-slate-50">
            <div className="bg-white flex flex-col items-center pt-8 pb-6 shadow-sm mb-2">
              <div className="w-40 h-40 rounded-full bg-slate-200 overflow-hidden shadow-md mb-4 relative group">
                {getChatAvatar(activeChat) ? (
                  <img src={getChatAvatar(activeChat)} className="w-full h-full object-cover" />
                ) : (
                  activeChat.type === 'group' ? <Users className="w-full h-full p-8 text-white bg-slate-400" /> : <User className="w-full h-full p-8 text-white bg-slate-400" />
                )}
                
                {/* Admin avatar change overlay */}
                {activeChat.type === 'group' && (() => {
                  const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
                  const canEdit = activeChat.permissions?.editSettings !== false || amIAdmin;
                  return canEdit && (
                    <label className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center cursor-pointer transition-all">
                      <div className="flex flex-col items-center text-white">
                        <Camera size={24} className="mb-1" />
                        <span className="text-xs font-semibold">CHANGE</span>
                      </div>
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            updateGroupAvatarMutation.mutate({ 
                              chatId: activeChat.id, 
                              fileToUpload: e.target.files[0] 
                            });
                          }
                        }}
                      />
                    </label>
                  );
                })()}
              </div>
              <div className="flex items-center justify-center gap-2 mb-1 group px-4">
                <h2 className="text-2xl font-semibold text-slate-900 text-center">{getChatName(activeChat)}</h2>
                {activeChat.type === 'group' && (() => {
                  const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
                  const canEdit = activeChat.permissions?.editSettings !== false || amIAdmin;
                  return canEdit && (
                    <button onClick={() => setRenameDialog({ isOpen: true, name: activeChat.name })} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full opacity-0 group-hover:opacity-100 transition-all">
                      <Edit2 size={16} />
                    </button>
                  );
                })()}
              </div>
              
              {activeChat.type === 'personal' && (() => {
                const other = activeChat.participants.find(p => p.id !== profile?.id);
                return (
                  <>
                    <p className="text-slate-500 text-sm mb-4">{other?.designation || 'Employee'}</p>

                  </>
                );
              })()}
              {activeChat.type === 'group' && (
                <p className="text-slate-500 text-sm mb-4">Group • {activeChat.participants.length} participants</p>
              )}
            </div>

            <div className="bg-white p-4 shadow-sm mb-2 text-slate-800">
               <div className="text-[#008069] text-xs font-semibold uppercase tracking-wider mb-2">About and phone number</div>
               <div className="text-md mb-1 font-medium">Available on Acme Chat</div>
               <div className="text-sm text-slate-500 mb-4">About</div>
               <div className="border-t border-slate-100 pt-3 text-md font-medium">
                 {activeChat.type === 'personal' ? (activeChat.participants.find(p => p.id !== profile?.id)?.phone || 'No phone number') : 'Group details'}
               </div>
               {activeChat.type === 'personal' && <div className="text-sm text-slate-500">Phone</div>}
            </div>

            {activeChat.type === 'group' && (() => {
              const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
              return (
              <div className="bg-white p-4 shadow-sm mb-2 text-slate-800">
                <div className="text-[#008069] text-xs font-semibold uppercase tracking-wider mb-3">Group Settings</div>
                <div className="space-y-1">
                  <div 
                    onClick={() => handleTogglePermission('editSettings')}
                    className={`flex justify-between items-center p-2 -mx-2 rounded ${amIAdmin ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                  >
                    <span className="text-sm font-medium">Edit Group Info</span>
                    <span className={`text-xs px-2 py-1 rounded text-slate-600 ${amIAdmin ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' : 'bg-slate-100'}`}>
                      {activeChat.permissions?.editSettings ? 'All Members' : 'Admins Only'}
                    </span>
                  </div>
                  <div 
                    onClick={() => handleTogglePermission('sendMessages')}
                    className={`flex justify-between items-center p-2 -mx-2 rounded ${amIAdmin ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                  >
                    <span className="text-sm font-medium">Send Messages</span>
                    <span className={`text-xs px-2 py-1 rounded text-slate-600 ${amIAdmin ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' : 'bg-slate-100'}`}>
                      {activeChat.permissions?.sendMessages ? 'All Members' : 'Admins Only'}
                    </span>
                  </div>
                  <div 
                    onClick={() => handleTogglePermission('addMembers')}
                    className={`flex justify-between items-center p-2 -mx-2 rounded ${amIAdmin ? 'cursor-pointer hover:bg-slate-50 transition-colors' : ''}`}
                  >
                    <span className="text-sm font-medium">Add New Members</span>
                    <span className={`text-xs px-2 py-1 rounded text-slate-600 ${amIAdmin ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm' : 'bg-slate-100'}`}>
                      {activeChat.permissions?.addMembers ? 'All Members' : 'Admins Only'}
                    </span>
                  </div>
                </div>
              </div>
              );
            })()}

            {activeChat.type === 'group' && (() => {
              const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
              const canAdd = activeChat.permissions?.addMembers !== false || amIAdmin;
              const pendingCount = activeChat.pending_participants?.length || 0;
              return (
              <div className="bg-white shadow-sm mb-2">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                  <div className="text-[#008069] text-xs font-semibold uppercase tracking-wider">Participants</div>
                  <div className="flex gap-2">
                    {amIAdmin && pendingCount > 0 && (
                      <button onClick={() => setPendingMembersDialog(true)} className="text-xs text-orange-600 font-semibold flex items-center hover:bg-orange-50 px-2 py-1 rounded transition-colors border border-orange-200">
                        Pending ({pendingCount})
                      </button>
                    )}
                    {canAdd && (
                      <button onClick={() => setAddMembersDialog(true)} className="text-xs text-[#008069] font-semibold flex items-center hover:bg-slate-50 px-2 py-1 rounded transition-colors border border-slate-200">
                        <UserPlus size={14} className="mr-1" /> Add
                      </button>
                    )}
                  </div>
                </div>
                <div className="max-h-60 overflow-y-auto chat-scrollbar">
                  {activeChat.participants.map(p => {
                    const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
                    const isClickable = amIAdmin && p.id !== profile?.id;
                    return (
                    <div 
                      key={p.id} 
                      onClick={() => {
                        if (isClickable) {
                          setAdminToggleDialog({ isOpen: true, targetUser: p, isCurrentlyAdmin: activeChat.admin_ids?.includes(p.id) });
                        }
                      }}
                      className={`flex items-center gap-3 p-3 ${isClickable ? 'hover:bg-slate-50 cursor-pointer' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{p.firstName} {p.lastName} {p.id === profile?.id ? '(You)' : ''}</div>
                        <div className="text-xs text-slate-500 truncate">{p.designation || 'Employee'}</div>
                      </div>
                      {activeChat.admin_ids?.includes(p.id) && (
                        <span className="text-[10px] bg-emerald-100 text-[#008069] px-2 py-0.5 rounded border border-emerald-200 font-bold">Admin</span>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
              );
            })()}
          </div>
          <div 
            onClick={() => {
              if (activeChat.type === 'group') {
                const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
                if (amIAdmin && activeChat.admin_ids.length === 1) {
                  if (activeChat.participants.length > 1) {
                    toast.error('You must promote another member to admin before exiting.');
                    return;
                  } else {
                    toast.error('You are the only member in the group, you cannot exit.');
                    return;
                  }
                }
                if (window.confirm('Are you sure you want to exit this group?')) {
                  removeParticipantMutation.mutate({ chatId: activeChat.id, userId: profile?.id });
                }
              }
            }}
            className="bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] cursor-pointer hover:bg-slate-50 transition-colors shrink-0 z-10 border-t border-slate-100"
          >
             <div className="flex items-center gap-3 p-3 text-red-500 font-medium">
               <div className="w-10 h-10 flex items-center justify-center shrink-0">
                 <X size={24} />
               </div>
               <div className="flex-1">
                 {activeChat.type === 'group' ? 'Exit group' : 'Block contact'}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Admin Toggle Dialog */}
      {/* Admin Toggle / Participant Options Dialog */}
      <AnimatePresence>
        {adminToggleDialog.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-5">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-200">
                    {adminToggleDialog.targetUser?.avatar ? <img src={adminToggleDialog.targetUser.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-900 text-center mb-6">
                  Manage {adminToggleDialog.targetUser?.firstName}
                </h3>
                
                <div className="space-y-3">
                  <button onClick={() => {
                    toggleAdminMutation.mutate({ chatId: activeChat.id, targetUserId: adminToggleDialog.targetUser.id });
                    setAdminToggleDialog({ isOpen: false, targetUser: null, isCurrentlyAdmin: false });
                  }} className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors border border-slate-200 text-left flex justify-between items-center">
                    <span>{adminToggleDialog.isCurrentlyAdmin ? 'Remove Admin Privileges' : 'Make Group Admin'}</span>
                    <Shield size={18} className={adminToggleDialog.isCurrentlyAdmin ? 'text-slate-400' : 'text-[#008069]'} />
                  </button>
                  
                  <button onClick={() => {
                    if (window.confirm(`Are you sure you want to remove ${adminToggleDialog.targetUser?.firstName} from the group?`)) {
                      removeParticipantMutation.mutate({ chatId: activeChat.id, userId: adminToggleDialog.targetUser.id });
                      setAdminToggleDialog({ isOpen: false, targetUser: null, isCurrentlyAdmin: false });
                    }
                  }} className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-100 text-left flex justify-between items-center">
                    <span>Remove from Group</span>
                    <X size={18} />
                  </button>
                  
                  <button onClick={() => setAdminToggleDialog({ isOpen: false, targetUser: null, isCurrentlyAdmin: false })} className="w-full px-4 py-3 bg-white hover:bg-slate-50 text-slate-600 font-medium rounded-lg transition-colors text-center mt-2">
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rename Group Dialog */}
      <AnimatePresence>
        {renameDialog.isOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="p-5">
                <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">Rename Group</h3>
                <input 
                  type="text" 
                  value={renameDialog.name}
                  onChange={(e) => setRenameDialog(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#008069] focus:border-transparent mb-6 transition-all"
                  placeholder="Group Name"
                  autoFocus
                />
                <div className="flex gap-3">
                  <button onClick={() => setRenameDialog({ isOpen: false, name: '' })} className="flex-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      if (renameDialog.name.trim()) {
                        renameGroupMutation.mutate({ chatId: activeChat.id, name: renameDialog.name.trim() });
                      }
                    }} 
                    disabled={!renameDialog.name.trim() || renameGroupMutation.isPending}
                    className="flex-1 px-4 py-2 bg-[#008069] hover:bg-[#00695c] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Members Dialog */}
      <AnimatePresence>
        {addMembersDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900 text-center mb-4">Add Members</h3>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={addMembersSearchQuery}
                    onChange={(e) => setAddMembersSearchQuery(e.target.value)}
                    placeholder="Search by name or designation..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-[#008069] focus:border-transparent block pl-10 p-2.5 transition-all"
                  />
                </div>
              </div>
              <div className="p-2 overflow-y-auto chat-scrollbar flex-1">
                {users
                  .filter(u => u.id !== profile?.id && !activeChat?.participants.some(p => p.id === u.id) && !activeChat?.pending_participants?.includes(u.id))
                  .filter(u => (u.firstName + ' ' + u.lastName).toLowerCase().includes(addMembersSearchQuery.toLowerCase()) || (u.designation || '').toLowerCase().includes(addMembersSearchQuery.toLowerCase()))
                  .map(u => (
                  <div key={u.id} onClick={() => setSelectedNewMembers(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])} className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded cursor-pointer transition-colors">
                    <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                      {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                    </div>
                    <div className="flex-1 border-b border-slate-50 pb-2">
                      <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                      <div className="text-xs text-slate-500">{u.designation || 'Employee'}</div>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${selectedNewMembers.includes(u.id) ? 'bg-[#008069] border-[#008069]' : 'border-slate-300'}`}>
                      {selectedNewMembers.includes(u.id) && <Check size={12} className="text-white" />}
                    </div>
                  </div>
                ))}
                {users.filter(u => u.id !== profile?.id && !activeChat?.participants.some(p => p.id === u.id) && !activeChat?.pending_participants?.includes(u.id)).length === 0 && (
                  <div className="text-center text-slate-500 py-8 text-sm">No new users available to add.</div>
                )}
                {users.filter(u => u.id !== profile?.id && !activeChat?.participants.some(p => p.id === u.id) && !activeChat?.pending_participants?.includes(u.id)).length > 0 && 
                 users.filter(u => u.id !== profile?.id && !activeChat?.participants.some(p => p.id === u.id) && !activeChat?.pending_participants?.includes(u.id))
                      .filter(u => (u.firstName + ' ' + u.lastName).toLowerCase().includes(addMembersSearchQuery.toLowerCase()) || (u.designation || '').toLowerCase().includes(addMembersSearchQuery.toLowerCase())).length === 0 && (
                  <div className="text-center text-slate-500 py-8 text-sm">No results found for "{addMembersSearchQuery}"</div>
                )}
              </div>
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button onClick={() => { setAddMembersDialog(false); setSelectedNewMembers([]); setAddMembersSearchQuery(''); }} className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  onClick={() => addMembersMutation.mutate({ chatId: activeChat.id, userIds: selectedNewMembers })}
                  disabled={selectedNewMembers.length === 0 || addMembersMutation.isPending}
                  className="flex-1 px-4 py-2 bg-[#008069] hover:bg-[#00695c] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                  Add {selectedNewMembers.length > 0 ? `(${selectedNewMembers.length})` : ''}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending Members Dialog */}
      <AnimatePresence>
        {pendingMembersDialog && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-900">Pending Approvals</h3>
                <button onClick={() => setPendingMembersDialog(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <div className="p-2 overflow-y-auto chat-scrollbar flex-1">
                {activeChat?.pending_participants?.map(uid => {
                  const u = users.find(user => user.id === uid);
                  if (!u) return null;
                  return (
                    <div key={u.id} className="flex items-center gap-3 w-full p-2 border-b border-slate-50">
                      <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                        {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                        <div className="text-xs text-slate-500">Requested to join</div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => managePendingMutation.mutate({ chatId: activeChat.id, userId: u.id, action: 'reject' })} className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors">
                          <X size={16} />
                        </button>
                        <button onClick={() => managePendingMutation.mutate({ chatId: activeChat.id, userId: u.id, action: 'approve' })} className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-100 transition-colors">
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
