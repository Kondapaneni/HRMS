import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Search, Send, Plus, Users, User, ArrowLeft, Paperclip, Smile, Check, CheckCheck, FileText, Image as ImageIcon, X, Download, Camera, ChevronRight, Phone, Video, MoreVertical, MessageSquare, Shield, Edit2, UserPlus, LogOut, Clock } from 'lucide-react';
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

export default function EmployeeMobileChat() {
  const navigate = useNavigate();
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
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [messageSearchQuery, setMessageSearchQuery] = useState('');
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
  const [messageReadByDialog, setMessageReadByDialog] = useState({ isOpen: false, message: null });
  const [confirmDialog, setConfirmDialog] = useState({ 
    isOpen: false, 
    title: '', 
    message: '', 
    confirmText: 'Confirm', 
    onConfirm: null 
  });
  
  const [addMembersDialog, setAddMembersDialog] = useState(false);
  const [pendingMembersDialog, setPendingMembersDialog] = useState(false);
  const [selectedNewMembers, setSelectedNewMembers] = useState([]);
  const [addMembersSearchQuery, setAddMembersSearchQuery] = useState('');

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

  useEffect(() => {
    setShowMessageSearch(false);
    setMessageSearchQuery('');
  }, [activeChat]);

  // Sync activeChat when chats list updates (e.g. after toggling admin, adding/removing members)
  useEffect(() => {
    if (activeChat && chats.length > 0) {
      const updatedChat = chats.find(c => c.id === activeChat.id);
      if (updatedChat && JSON.stringify(updatedChat) !== JSON.stringify(activeChat)) {
        setActiveChat(updatedChat);
      }
    }
  }, [chats, activeChat]);

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
        
        const proxyUrl = window.location.origin + "/Chat-Attachment/" + filePath;
          
        attachmentData = {
          attachmentUrl: proxyUrl,
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
    if (!messageText.trim() && !attachment) return;

    const tempId = `temp-${Date.now()}`;
    const payload = { content: messageText.trim() };
    
    sendMessageMutation.mutate({ payload, tempId, fileToUpload: attachment });
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

  // 4. Create Chat
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
      
      const proxyUrl = window.location.origin + "/Chat-Attachment/" + filePath;
        
      const res = await api.put(`/chat/${chatId}/avatar`, { group_avatar: proxyUrl });
      return { ...res.data, group_avatar: proxyUrl };
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
        
        const proxyUrl = window.location.origin + "/Chat-Attachment/" + filePath;
          
        avatarData = { group_avatar: proxyUrl };
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

  const updatePermissionsMutation = useMutation({
    mutationFn: async ({ chatId, permissionKey, permissionValue }) => {
      const res = await api.put(`/chat/${chatId}/permissions`, { permissionKey, permissionValue });
      return res.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['chat', 'list'], (old) => {
        if (!old) return old;
        return old.map(chat => 
          chat.id === variables.chatId 
            ? { ...chat, permissions: data.permissions }
            : chat
        );
      });
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

  const handleCreatePersonalChat = (targetUserId) => {
    createChatMutation.mutate({ payload: { type: 'personal', participants: [targetUserId] } });
  };

  const handleCreateGroupChat = () => {
    if (selectedGroupParticipants.length === 0) return toast.error('Select at least one participant');
    if (!groupName.trim()) return toast.error('Group name is required');
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

  const renderTicks = (msg, chat) => {
    if (!chat || !profile) return null;
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
  if (showContactInfo && activeChat && activeChat.type === 'group') {
    return (
      <div className="flex flex-col h-[100dvh] bg-slate-50/50 font-sans relative z-10 overflow-hidden">
        {/* Header */}
        <div className="bg-white px-4 py-4 border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowContactInfo(false)} className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors -ml-2">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Group Info</h2>
              <p className="text-xs text-slate-500">Manage group settings and members</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto chat-scrollbar p-4 space-y-4 pb-6">
          {/* Profile Card */}
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="p-6 flex flex-col items-center">
              <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full bg-slate-200 overflow-hidden shadow-md">
                  {getChatAvatar(activeChat) ? (
                    <img src={getChatAvatar(activeChat)} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-full h-full p-5 text-white bg-slate-400" />
                  )}
                </div>
                {activeChat.admin_ids?.includes(profile?.id) && (
                  <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white cursor-pointer shadow-lg border-2 border-white">
                    <Camera size={14} />
                    <input 
                      type="file" 
                      className="hidden" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file && activeChat) {
                          updateGroupAvatarMutation.mutate({ chatId: activeChat.id, fileToUpload: file });
                        }
                      }}
                    />
                  </label>
                )}
              </div>
              <div className="flex items-center justify-center gap-2 mb-2 group">
                <h2 className="text-xl font-bold text-slate-900 text-center">{getChatName(activeChat)}</h2>
                {(() => {
                  const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
                  const canEdit = activeChat.permissions?.editSettings !== false || amIAdmin;
                  return canEdit && (
                    <button onClick={() => setRenameDialog({ isOpen: true, name: activeChat.name })} className="p-1.5 text-slate-400 active:text-blue-600 active:bg-blue-50 rounded-full transition-all">
                      <Edit2 size={16} />
                    </button>
                  );
                })()}
              </div>
              <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-3 py-1 text-xs font-semibold">
                <Users className="h-3.5 w-3.5 mr-1.5" /> {activeChat.participants.length} Participants
              </span>
            </div>
          </div>

          {/* Group Settings Card */}
          {(() => {
            const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
            return (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="p-4 border-b border-slate-100">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                  <Shield className="h-4 w-4 text-slate-500" /> Group Settings
                </h3>
              </div>
              <div className="p-4 space-y-1">
                <div 
                  onClick={() => handleTogglePermission('editSettings')}
                  className={`flex justify-between items-center p-2.5 rounded-md ${amIAdmin ? 'active:bg-slate-50 cursor-pointer transition-colors' : ''}`}
                >
                  <span className="text-sm font-medium text-slate-700">Edit Group Info</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {activeChat.permissions?.editSettings ? 'All Members' : 'Admins Only'}
                    </span>
                    {amIAdmin && (
                      <div className={`w-9 h-5 shrink-0 flex items-center rounded-full p-0.5 transition-colors ${activeChat.permissions?.editSettings ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${activeChat.permissions?.editSettings ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    )}
                  </div>
                </div>
                <div 
                  onClick={() => handleTogglePermission('sendMessages')}
                  className={`flex justify-between items-center p-2.5 rounded-md ${amIAdmin ? 'active:bg-slate-50 cursor-pointer transition-colors' : ''}`}
                >
                  <span className="text-sm font-medium text-slate-700">Send Messages</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {activeChat.permissions?.sendMessages ? 'All Members' : 'Admins Only'}
                    </span>
                    {amIAdmin && (
                      <div className={`w-9 h-5 shrink-0 flex items-center rounded-full p-0.5 transition-colors ${activeChat.permissions?.sendMessages ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${activeChat.permissions?.sendMessages ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    )}
                  </div>
                </div>
                <div 
                  onClick={() => handleTogglePermission('addMembers')}
                  className={`flex justify-between items-center p-2.5 rounded-md ${amIAdmin ? 'active:bg-slate-50 cursor-pointer transition-colors' : ''}`}
                >
                  <span className="text-sm font-medium text-slate-700">Add New Members</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {activeChat.permissions?.addMembers ? 'All Members' : 'Admins Only'}
                    </span>
                    {amIAdmin && (
                      <div className={`w-9 h-5 shrink-0 flex items-center rounded-full p-0.5 transition-colors ${activeChat.permissions?.addMembers ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${activeChat.permissions?.addMembers ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    )}
                  </div>
                </div>
                <div 
                  onClick={() => handleTogglePermission('approveNewMembers')}
                  className={`flex justify-between items-center p-2.5 rounded-md ${amIAdmin ? 'active:bg-slate-50 cursor-pointer transition-colors' : ''}`}
                >
                  <span className="text-sm font-medium text-slate-700">Approve New Members</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500">
                      {activeChat.permissions?.approveNewMembers ? 'On' : 'Off'}
                    </span>
                    {amIAdmin && (
                      <div className={`w-9 h-5 shrink-0 flex items-center rounded-full p-0.5 transition-colors ${activeChat.permissions?.approveNewMembers ? 'bg-blue-500' : 'bg-slate-300'}`}>
                        <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${activeChat.permissions?.approveNewMembers ? 'translate-x-4' : 'translate-x-0'}`} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* Pending Approvals Card */}
          {(() => {
            const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
            if (!amIAdmin) return null;
            return (
              <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                <div className="p-4 border-b border-slate-100">
                  <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                    <Clock className="h-4 w-4 text-slate-500" /> Pending Approvals
                    {activeChat.pending_participants?.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[10px] font-bold">{activeChat.pending_participants.length}</span>
                    )}
                  </h3>
                </div>
                <div className="p-4">
                  {activeChat.pending_participants?.length > 0 ? (
                    <div className="space-y-2">
                      {activeChat.pending_participants.map(uid => {
                        const u = users.find(user => user.id === uid);
                        if (!u) return null;
                        return (
                          <div key={u.id} className="flex items-center justify-between p-2 rounded-md hover:bg-slate-50 transition-colors">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden shrink-0">
                                {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-1.5 text-white bg-slate-400" />}
                              </div>
                              <span className="text-sm font-medium text-slate-800">{u.firstName} {u.lastName}</span>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              <button onClick={() => managePendingMutation.mutate({ chatId: activeChat.id, userId: u.id, action: 'reject' })} className="w-7 h-7 rounded-full bg-red-50 text-red-600 flex items-center justify-center active:bg-red-100 transition-colors border border-red-200">
                                <X size={14} />
                              </button>
                              <button onClick={() => managePendingMutation.mutate({ chatId: activeChat.id, userId: u.id, action: 'approve' })} className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center active:bg-emerald-100 transition-colors border border-emerald-200">
                                <Check size={14} />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 py-1">No pending approvals</div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Participants Card */}
          {(() => {
            const amIAdmin = activeChat.admin_ids?.includes(profile?.id);
            const canAdd = activeChat.permissions?.addMembers !== false || amIAdmin;
            return (
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <h3 className="text-sm font-semibold flex items-center gap-2 text-slate-900">
                  <Users className="h-4 w-4 text-slate-500" /> Participants
                  <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-bold">{activeChat.participants.length}</span>
                </h3>
                {canAdd && (
                  <button onClick={() => setAddMembersDialog(true)} className="inline-flex items-center rounded-md text-xs font-medium border border-slate-300 bg-white active:bg-slate-50 text-slate-700 px-2.5 py-1.5 transition-colors shadow-sm">
                    <UserPlus size={13} className="mr-1.5" /> Add
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto chat-scrollbar divide-y divide-slate-50">
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
                    className={`flex items-center gap-3 px-4 py-3 ${isClickable ? 'active:bg-slate-50 cursor-pointer' : ''} transition-colors`}
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden shrink-0 border border-slate-100">
                      {p.avatar ? <img src={p.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-800">{p.firstName} {p.lastName} {p.id === profile?.id ? '(You)' : ''}</div>
                      <div className="text-xs text-slate-500 truncate">{p.designation || 'Employee'}</div>
                    </div>
                    {activeChat.admin_ids?.includes(p.id) && (
                      <span className="inline-flex items-center rounded-full bg-blue-50 text-blue-700 px-2 py-0.5 text-[10px] font-semibold border border-blue-100">Admin</span>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
            );
          })()}

          {/* Exit Group Card */}
          <div 
            onClick={() => {
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
              setConfirmDialog({
                isOpen: true,
                title: 'Exit Group',
                message: 'Are you sure you want to exit this group?',
                confirmText: 'Exit',
                onConfirm: () => {
                  removeParticipantMutation.mutate({ chatId: activeChat.id, userId: profile?.id });
                }
              });
            }}
            className="rounded-lg border border-red-200 bg-red-50/50 cursor-pointer active:bg-red-50 transition-colors shadow-sm"
          >
            <div className="flex items-center gap-3 p-4 text-red-600 font-medium">
              <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <LogOut size={18} />
              </div>
              <span className="text-sm">Exit Group</span>
            </div>
          </div>
        </div>

        
        {/* Admin Toggle Dialog */}
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
                    }} className="w-full px-4 py-3 bg-slate-50 active:bg-slate-100 text-slate-700 font-medium rounded-lg transition-colors border border-slate-200 text-left flex justify-between items-center">
                      <span>{adminToggleDialog.isCurrentlyAdmin ? 'Remove Admin Privileges' : 'Make Group Admin'}</span>
                      <Shield size={18} className={adminToggleDialog.isCurrentlyAdmin ? 'text-slate-400' : 'text-[#008069]'} />
                    </button>
                    
                    <button onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: 'Remove from Group',
                        message: `Are you sure you want to remove ${adminToggleDialog.targetUser?.firstName} from the group?`,
                        confirmText: 'Remove',
                        onConfirm: () => {
                          removeParticipantMutation.mutate({ chatId: activeChat.id, userId: adminToggleDialog.targetUser.id });
                          setAdminToggleDialog({ isOpen: false, targetUser: null, isCurrentlyAdmin: false });
                        }
                      });
                    }} className="w-full px-4 py-3 bg-red-50 active:bg-red-100 text-red-600 font-medium rounded-lg transition-colors border border-red-100 text-left flex justify-between items-center">
                      <span>Remove from Group</span>
                      <X size={18} />
                    </button>
                    
                    <button onClick={() => setAdminToggleDialog({ isOpen: false, targetUser: null, isCurrentlyAdmin: false })} className="w-full px-4 py-3 bg-white active:bg-slate-50 text-slate-600 font-medium rounded-lg transition-colors text-center mt-2">
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>



        {/* Generic Confirm Dialog */}
        <AnimatePresence>
          {confirmDialog.isOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
                <div className="p-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
                    <X size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    {confirmDialog.title}
                  </h3>
                  <p className="text-sm text-slate-500 mb-8">
                    {confirmDialog.message}
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: '' })} className="flex-1 px-4 py-3 bg-slate-100 active:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors">
                      Cancel
                    </button>
                    <button onClick={() => {
                      if (confirmDialog.onConfirm) confirmDialog.onConfirm();
                      setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: null, confirmText: '' });
                    }} className="flex-1 px-4 py-3 bg-red-500 active:bg-red-600 text-white font-bold rounded-xl transition-colors shadow-md shadow-red-500/20">
                      {confirmDialog.confirmText}
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
                    <button onClick={() => setRenameDialog({ isOpen: false, name: '' })} className="flex-1 px-4 py-2 bg-slate-100 active:bg-slate-200 text-slate-700 font-medium rounded-lg transition-colors">
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        if (renameDialog.name.trim()) {
                          renameGroupMutation.mutate({ chatId: activeChat.id, name: renameDialog.name.trim() });
                        }
                      }} 
                      disabled={!renameDialog.name.trim() || renameGroupMutation.isPending}
                      className="flex-1 px-4 py-2 bg-[#008069] active:bg-[#00695c] disabled:opacity-50 text-white font-medium rounded-lg transition-colors shadow-sm"
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
          <div className="flex items-center flex-1 min-w-0 cursor-pointer" onClick={() => activeChat.type === 'group' && setShowContactInfo(!showContactInfo)}>
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
          
          <div className="flex gap-1 ml-2">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowMessageSearch(!showMessageSearch);
                if (showMessageSearch) setMessageSearchQuery('');
              }} 
              className={`p-2 rounded-full transition-colors ${showMessageSearch ? 'bg-[#e7fce3] text-[#008069]' : 'text-slate-500 hover:bg-slate-100'}`}
            >
              <Search className="w-5 h-5" />
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showMessageSearch && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="bg-white border-b border-slate-200 shadow-sm z-10 overflow-hidden shrink-0"
            >
              <div className="p-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    value={messageSearchQuery}
                    onChange={(e) => setMessageSearchQuery(e.target.value)}
                    placeholder="Search messages..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-[#008069] focus:border-transparent block pl-10 pr-10 p-2.5 transition-all"
                    autoFocus
                  />
                  {messageSearchQuery && (
                    <button 
                      onClick={() => setMessageSearchQuery('')}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-[120px]">
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
                    <span className="bg-slate-200/60 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm backdrop-blur-sm">
                      {getOverlayDate(msg.createdAt)}
                    </span>
                  </div>
                )}
                {msg.isSystemMessage ? (
                  <div className="flex justify-center my-3 relative z-10">
                    <span className="bg-slate-200/80 text-slate-700 text-xs font-medium px-4 py-1.5 rounded-full shadow-sm border border-slate-200/50 text-center backdrop-blur-sm">
                      {msg.content}
                    </span>
                  </div>
                ) : (
                  <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                    <div 
                      onClick={() => {
                        if (isMine && activeChat.type === 'group') {
                          setMessageReadByDialog({ isOpen: true, message: msg });
                        }
                      }}
                      className={`max-w-[85%] rounded-2xl px-4 py-2 pb-1.5 shadow-sm relative ${isMine ? 'bg-[#d9fdd3] text-slate-800 rounded-tr-sm cursor-pointer hover:bg-[#cbf0c4] active:bg-[#cbf0c4] transition-colors' : 'bg-white border border-slate-100 text-slate-800 rounded-tl-sm'}`}
                    >
                      {!isMine && activeChat.type === 'group' && (
                        <div className="text-xs font-bold text-blue-500 mb-1">{sender?.firstName}</div>
                      )}
                      <div className="text-[15px] whitespace-pre-wrap break-words pr-14 pb-2">
                        {msg.attachmentUrl && (
                          <div className="mb-2 w-full max-w-xs">
                            {msg.attachmentType?.startsWith('image/') ? (
                              <img src={msg.attachmentUrl} alt="attachment" className="rounded-lg w-full object-cover border border-slate-100 shadow-sm" style={{ maxHeight: '250px' }} />
                            ) : (
                              <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className={`flex items-center gap-2 p-3 rounded-lg border shadow-sm transition-colors ${isMine ? 'bg-white/30 border-white/40 text-slate-800 hover:bg-white/40' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                                <div className={`p-2 rounded-lg shrink-0 ${isMine ? 'bg-white/40 text-slate-800' : 'bg-white border border-slate-200 text-blue-600'}`}>
                                  <FileText size={20} />
                                </div>
                                <div className="overflow-hidden">
                                  <div className="text-sm font-semibold truncate">{msg.attachmentName || 'Document'}</div>
                                  <div className={`text-[10px] ${isMine ? 'text-slate-600' : 'text-slate-500'}`}>{(msg.attachmentSize / 1024 / 1024).toFixed(2)} MB</div>
                                </div>
                                <Download size={16} className={`ml-auto shrink-0 ${isMine ? 'text-slate-700' : 'text-slate-400'}`} />
                              </a>
                            )}
                          </div>
                        )}
                        {msg.content}
                      </div>
                      <div className={`text-[10px] text-right absolute bottom-1 right-3 flex items-center justify-end ${isMine ? 'text-slate-400' : 'text-slate-400'}`}>
                        {format(new Date(msg.createdAt), 'HH:mm')}
                        {isMine && renderTicks(msg, activeChat)}
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area fixed at bottom */}
        {activeChat.type === 'group' && activeChat.permissions?.sendMessages === false && !activeChat.admin_ids?.includes(profile?.id) ? (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-50 py-4 px-4 text-center text-sm text-slate-500 font-medium border-t border-slate-200 z-20 pb-8">
            Only admins can send messages in this group.
          </div>
        ) : (
          <div className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 z-20">
            <AnimatePresence>
              {attachment && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="p-3 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 flex items-center justify-between shadow-sm">
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

            <form onSubmit={handleSendMessage} className="flex items-end gap-1.5 p-2 pb-8">
              <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
              
              <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)} className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full shrink-0 transition-colors mb-0.5">
                <Smile size={24} />
              </button>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="p-2.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-full shrink-0 transition-colors mb-0.5">
                <Paperclip size={24} />
              </button>

              <div className="flex-1 flex bg-slate-100 rounded-3xl px-4 py-2.5 items-end shadow-inner border border-slate-200/60 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
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
                      if (messageText.trim() || attachment) handleSendMessage(e);
                    }
                  }}
                  placeholder="Message..."
                  rows={1}
                  className="bg-transparent border-none outline-none w-full text-slate-800 font-medium resize-none overflow-y-auto chat-scrollbar placeholder:text-slate-400"
                  style={{ minHeight: '24px', maxHeight: '100px' }}
                />
              </div>
              <button
                type="submit"
                disabled={(!messageText.trim() && !attachment) || sendMessageMutation.isPending}
                className={`w-11 h-11 mb-0.5 ml-0.5 rounded-full flex items-center justify-center shrink-0 transition-all shadow-md ${messageText.trim() || attachment ? 'bg-blue-600 text-white scale-100 shadow-blue-200' : 'bg-slate-200 text-slate-400 scale-90 shadow-none'}`}
              >
                <Send size={20} />
              </button>
            </form>

            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 280, opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-slate-200 bg-slate-50 relative z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
                  <EmojiPicker onEmojiClick={(e) => setMessageText(prev => prev + e.emoji)} width="100%" height={280} searchDisabled skinTonesDisabled />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        {/* Message Read By Dialog */}
        <AnimatePresence>
          {messageReadByDialog.isOpen && messageReadByDialog.message && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-900/50 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <CheckCheck size={20} className="text-[#53bdeb]" /> Message Info
                  </h3>
                  <button onClick={() => setMessageReadByDialog({ isOpen: false, message: null })} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                
                <div className="p-4 border-b border-slate-100 bg-white">
                  <div className="bg-[#d9fdd3] p-3 rounded-lg text-sm text-slate-800 shadow-sm relative">
                    <div className="whitespace-pre-wrap break-words">{messageReadByDialog.message.content || (messageReadByDialog.message.attachmentUrl ? '📎 Attachment' : 'Message')}</div>
                    <div className="text-[10px] text-slate-500 text-right mt-1">
                      {format(new Date(messageReadByDialog.message.createdAt), 'HH:mm')}
                    </div>
                  </div>
                </div>

                <div className="p-2 overflow-y-auto chat-scrollbar flex-1">
                  <div className="px-3 py-2 text-xs font-semibold text-[#008069] uppercase tracking-wider">Read by</div>
                  {(() => {
                    const readByIds = (messageReadByDialog.message.readBy || []).filter(id => id !== profile?.id);
                    if (readByIds.length === 0) {
                      return <div className="text-center text-slate-500 py-6 text-sm font-medium">No one has read this yet.</div>;
                    }
                    
                    return readByIds.map(uid => {
                      const u = activeChat.participants.find(p => p.id === uid) || users.find(user => user.id === uid);
                      if (!u) return null;
                      return (
                        <div key={u.id} className="flex items-center gap-3 w-full p-2 hover:bg-slate-50 rounded transition-colors">
                          <div className="w-10 h-10 rounded-full bg-slate-200 overflow-hidden shrink-0">
                            {u.avatar ? <img src={u.avatar} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-white bg-slate-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-800">{u.firstName} {u.lastName}</div>
                            <div className="text-xs text-slate-500">{u.designation || 'Employee'}</div>
                          </div>
                          <CheckCheck size={16} className="text-[#53bdeb]" />
                        </div>
                      );
                    });
                  })()}
                </div>
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
                  <button onClick={() => setMessageReadByDialog({ isOpen: false, message: null })} className="px-6 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors w-full">
                    Close
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (showNewChat) {
    return (
      <div className="flex h-[100dvh] flex-col bg-slate-50 overflow-hidden relative">
        <BackgroundOrbs />
        <div className="flex items-center px-4 py-4 bg-white/80 backdrop-blur-md border-b border-slate-200 z-10 shadow-sm relative shrink-0">
          <button
            onClick={() => {
              if (isCreatingGroup) {
                if (groupCreationStep > 1) setGroupCreationStep(groupCreationStep - 1);
                else { setIsCreatingGroup(false); setGroupCreationStep(1); }
              } else {
                setShowNewChat(false);
              }
            }}
            className="p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="ml-2 text-lg font-bold text-slate-900">{isCreatingGroup ? (groupCreationStep === 3 ? 'Group permissions' : 'New Group') : 'New Chat'}</h1>
        </div>

        {isCreatingGroup ? (
          <div className="flex flex-col h-full overflow-hidden bg-slate-50 relative z-10">
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
                    placeholder="Group Name"
                    className="flex-1 border-b-2 border-[#008069] px-2 py-2 outline-none font-medium text-slate-900 bg-transparent"
                  />
                </div>
                <div className="bg-white mt-2 border-y border-slate-100">
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
                <div className="p-4 bg-transparent shrink-0 flex justify-center pb-safe">
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
                <div className="flex-1 overflow-y-auto chat-scrollbar bg-slate-50 pb-safe">
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
          <div className="flex-1 flex flex-col bg-white/50 backdrop-blur-sm overflow-hidden relative z-10">
            <button onClick={() => setIsCreatingGroup(true)} className="flex items-center gap-4 w-full p-4 hover:bg-slate-50 border-b border-slate-100 text-left transition-colors">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 border border-blue-200 shadow-sm"><Users size={24} /></div>
              <span className="font-bold text-blue-700 text-base">New Group Chat</span>
            </button>
            <div className="flex-1 overflow-y-auto pb-safe">
              <h3 className="px-5 py-3 text-slate-500 text-xs font-bold uppercase tracking-wider bg-slate-50">Contacts</h3>
              <div className="px-2 pt-3 pb-6">
                <div className="bg-white rounded-[24px] shadow-sm border border-slate-100/50 overflow-hidden divide-y divide-slate-50">
                  {users.filter(u => u.id !== profile?.id).map(u => (
                    <button key={u.id} onClick={() => handleCreatePersonalChat(u.id)} className="flex items-center gap-4 w-full p-3 hover:bg-slate-50 text-left transition-colors">
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
          <div className="bg-white rounded-[24px] mx-3 mt-3 mb-6 shadow-sm border border-slate-100/50 overflow-hidden divide-y divide-slate-100">
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
