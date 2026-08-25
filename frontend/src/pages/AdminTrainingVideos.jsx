import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  Play, 
  Plus, 
  Trash2, 
  X, 
  Upload, 
  Users, 
  Search, 
  Video, 
  PlaySquare, 
  GraduationCap, 
  CheckCircle2, 
  Building2, 
  Clock, 
  Sparkles,
  Check,
  Filter,
  Film,
  FileVideo,
  UserCheck
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import PageLoader from '../components/PageLoader';

const StatCard = ({ title, value, subtitle, icon: Icon, colorTheme }) => {
  const themes = {
    blue: {
      iconBg: 'bg-[#e8f0fe]',
      iconColor: 'text-[#1a73e8]',
    },
    purple: {
      iconBg: 'bg-[#f3e8fd]',
      iconColor: 'text-[#8430ce]',
    },
    green: {
      iconBg: 'bg-[#e6f4ea]',
      iconColor: 'text-[#137333]',
    },
    amber: {
      iconBg: 'bg-[#fef7e0]',
      iconColor: 'text-[#b06000]',
    }
  };

  const theme = themes[colorTheme] || themes.blue;

  return (
    <div className="bg-white rounded-2xl border border-[#e0e3e7] p-5 shadow-xs transition-all duration-200 hover:shadow-md hover:border-[#dadce0]">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-[#5f6368] uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold text-[#1f1f1f] tracking-tight">{value}</p>
          {subtitle && <p className="text-xs text-[#5f6368] font-normal pt-0.5">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.iconColor} shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

const AdminTrainingVideos = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Assigned', 'Open'

  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedVideoForAssign, setSelectedVideoForAssign] = useState(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [modalAssignedEmployees, setModalAssignedEmployees] = useState([]);
  
  const fileInputRef = useRef(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['admin', 'trainingVideos'],
    queryFn: async () => {
      const res = await api.get('/admin/training/videos');
      return res.data || [];
    }
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['admin', 'employeesList'],
    queryFn: async () => {
      const res = await api.get('/admin/employees?limit=1000');
      return res.data?.employees || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const stats = useMemo(() => {
    const total = videos.length;
    const assignedCourses = videos.filter(v => v.assigned_employee_ids && v.assigned_employee_ids.length > 0).length;
    const allEnrolledSet = new Set();
    videos.forEach(v => {
      if (Array.isArray(v.assigned_employee_ids)) {
        v.assigned_employee_ids.forEach(id => allEnrolledSet.add(id));
      }
    });
    const enrolledStaff = allEnrolledSet.size;
    return { total, assignedCourses, enrolledStaff };
  }, [videos]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchSearch = debouncedSearchQuery === '' ||
        (v.title && v.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()));

      let matchTab = true;
      const hasAssignments = v.assigned_employee_ids && v.assigned_employee_ids.length > 0;
      if (filterTab === 'Assigned') matchTab = hasAssignments;
      else if (filterTab === 'Open') matchTab = !hasAssignments;

      return matchSearch && matchTab;
    });
  }, [videos, debouncedSearchQuery, filterTab]);

  const addVideoMutation = useMutation({
    mutationFn: async (videoData) => {
      await api.post('/admin/training/videos', videoData);
    },
    onSuccess: () => {
      toast.success('Training video uploaded successfully!');
      setIsModalOpen(false);
      setTitle('');
      setVideoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add video');
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/training/videos/${id}`);
    },
    onSuccess: () => {
      toast.success('Training video deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
    },
    onError: () => {
      toast.error('Failed to delete video');
    }
  });

  const assignVideoMutation = useMutation({
    mutationFn: async ({ id, assigned_employee_ids }) => {
      await api.put(`/admin/training/videos/${id}/assign`, { assigned_employee_ids });
    },
    onSuccess: () => {
      toast.success('Employees assigned successfully');
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to assign employees');
    }
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !videoFile) {
      toast.error('Title and video file are required');
      return;
    }

    setIsUploading(true);
    const fileName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training_videos')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Upload failed');
      }

      await addVideoMutation.mutateAsync({
        title: title.trim(),
        video_url: window.location.origin + `/Training-Video/${fileName}`
      });
    } catch (err) {
      toast.error(err.message || 'Failed to add video');
      setIsUploading(false);
    }
  };

  const handleDelete = (id, videoTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${videoTitle}"?`)) return;
    deleteMutation.mutate(id);
  };

  if (videosLoading) {
    return <PageLoader message="Loading Training Videos..." />;
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
            <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
            <span className="text-[11px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Continuous Learning</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-normal text-[#1f1f1f] tracking-tight flex items-center gap-2">
            Training Videos & Modules <span className="text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full">{videos.length} Videos</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#5f6368] mt-0.5">
            Curate orientation courses, upload training videos, and manage targeted employee enrollments.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Video</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Training Modules" 
          value={stats.total} 
          subtitle="Total hosted video modules" 
          icon={PlaySquare} 
          colorTheme="blue" 
        />
        <StatCard 
          title="Enrolled Staff" 
          value={stats.enrolledStaff} 
          subtitle="Distinct active employees" 
          icon={Users} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Assigned Courses" 
          value={stats.assignedCourses} 
          subtitle="Targeted curriculum videos" 
          icon={GraduationCap} 
          colorTheme="green" 
        />
        <StatCard 
          title="Open Library" 
          value={stats.total - stats.assignedCourses} 
          subtitle="Accessible company-wide" 
          icon={Film} 
          colorTheme="amber" 
        />
      </div>

      {/* Main Filter & Search Toolbar */}
      <div className="rounded-2xl border border-[#e0e3e7] bg-white shadow-xs overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-[#e0e3e7] bg-[#f8fafd] flex flex-col md:flex-row gap-3 items-center justify-between">
          
          {/* Tab Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 max-w-full">
            {[
              { id: 'All', label: `All Modules (${videos.length})` },
              { id: 'Assigned', label: `Assigned Courses (${stats.assignedCourses})` },
              { id: 'Open', label: `Open Library (${stats.total - stats.assignedCourses})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-white border border-[#dadce0] text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#1f1f1f]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Google Search Bar */}
          <div className="relative w-full md:w-80 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
            <input
              type="search"
              placeholder="Search training video title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            />
          </div>
        </div>

        {/* Empty State */}
        {filteredVideos.length === 0 ? (
          <div className="p-12 text-center text-[#5f6368] flex flex-col items-center justify-center space-y-2">
            <PlaySquare className="w-12 h-12 text-[#dadce0] mb-1" />
            <p className="text-sm font-semibold text-[#1f1f1f]">No training videos found</p>
            <p className="text-xs text-[#5f6368] max-w-sm">
              {searchQuery ? "Try adjusting your search query." : "Upload your first training video module to start your organization's learning curriculum."}
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Upload Video
            </button>
          </div>
        ) : (
          /* Video Cards Grid */
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredVideos.map(video => {
              const assignedCount = Array.isArray(video.assigned_employee_ids) ? video.assigned_employee_ids.length : 0;

              return (
                <div 
                  key={video.id} 
                  className="bg-white rounded-2xl border border-[#e0e3e7] shadow-xs hover:shadow-md hover:border-[#dadce0] transition-all duration-200 overflow-hidden flex flex-col justify-between"
                >
                  {/* Video Player Box */}
                  <div>
                    <div className="aspect-video bg-[#202124] relative overflow-hidden">
                      <video 
                        src={video.video_url}
                        className="w-full h-full object-cover"
                        controls
                        preload="metadata"
                      />
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[#1f1f1f] line-clamp-1" title={video.title}>
                          {video.title}
                        </h3>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#5f6368]">
                        <span className="inline-flex items-center gap-1 text-[11px] bg-[#f8fafd] border border-[#e0e3e7] px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3 text-[#5f6368]" />
                          Added {new Date(video.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>

                        <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                          assignedCount > 0 
                            ? 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' 
                            : 'bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0]'
                        }`}>
                          <Users className="w-3 h-3" />
                          {assignedCount > 0 ? `${assignedCount} Assigned` : 'Open Library'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="px-4 py-3 bg-[#f8fafd] border-t border-[#e0e3e7] flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        setSelectedVideoForAssign(video);
                        setModalAssignedEmployees(video.assigned_employee_ids || []);
                        setAssignSearchQuery('');
                        setIsAssignModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#1a73e8] bg-white hover:bg-[#e8f0fe] border border-[#d2e3fc] transition-all cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Staff ({assignedCount})</span>
                    </button>

                    <button
                      onClick={() => handleDelete(video.id, video.title)}
                      className="p-1.5 rounded-full border border-[#fce8e6] bg-[#fce8e6] hover:bg-[#fad2cf] text-[#c5221f] transition-all cursor-pointer"
                      title="Delete Video"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slideover Right Drawer: Upload Video (createPortal) */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !isUploading) setIsModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
          >
            {/* Top 4-Color Google Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Training Hub</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">Upload Training Video</h2>
              </div>
              <button
                type="button"
                onClick={() => !isUploading && setIsModalOpen(false)}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleUpload} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-5 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Employee Security Orientation & Protocols"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-xl text-xs font-medium text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all"
                  disabled={isUploading}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                  Select MP4 Video File *
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVideoFile(e.target.files[0]);
                    }
                  }}
                />

                <div 
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                    videoFile
                      ? 'bg-[#e8f0fe]/30 border-[#4285F4]'
                      : 'bg-[#f8fafd] border-[#dadce0] hover:border-[#4285F4] hover:bg-[#f1f3f4]'
                  } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-[#e0e3e7] flex items-center justify-center mb-2.5 text-[#1a73e8]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-xs text-[#1f1f1f] text-center">
                    {videoFile ? videoFile.name : 'Click or drop video file here'}
                  </span>
                  <span className="text-[10px] text-[#5f6368] mt-1">
                    Supported: MP4, WebM (up to 100MB)
                  </span>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isUploading}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleUpload}
                disabled={isUploading || !title.trim() || !videoFile}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    <span>Uploading Video...</span>
                  </>
                ) : (
                  <span>Upload & Publish</span>
                )}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Slideover Right Drawer: Assign Employees (createPortal) */}
      {isAssignModalOpen && selectedVideoForAssign && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAssignModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-sm"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
            className="bg-white shadow-2xl w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10 border-l border-[#e0e3e7]"
          >
            {/* Top 4-Color Google Accent Line */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#4285F4] via-[#EA4335] via-[#FBBC05] to-[#34A853] absolute top-0 left-0" />

            {/* Header */}
            <div className="px-6 py-4 border-b border-[#e0e3e7] flex justify-between items-center bg-[#f8fafd] mt-1 shrink-0">
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                  <span className="text-[10.5px] font-semibold text-[#5f6368] uppercase tracking-wider ml-1">Course Enrollment</span>
                </div>
                <h2 className="text-lg font-semibold text-[#1f1f1f]">Assign Employees</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Quick Selection */}
            <div className="p-4 border-b border-[#e0e3e7] bg-white space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#5f6368]" />
                <input
                  type="search"
                  placeholder="Search employees by name..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#f1f3f4] focus:bg-white border border-[#dadce0] rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[#5f6368] font-medium">
                  {modalAssignedEmployees.length} employee(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAssignedEmployees(employees.map(e => e.id))}
                    className="text-[#1a73e8] font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-[#dadce0]">•</span>
                  <button
                    type="button"
                    onClick={() => setModalAssignedEmployees([])}
                    className="text-[#5f6368] font-semibold hover:underline cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            </div>

            {/* Employee List Body */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-1.5">
              {employeesLoading ? (
                <p className="text-xs text-[#5f6368] p-4 text-center">Loading employee directory...</p>
              ) : (
                (() => {
                  const filtered = employees.filter(emp => {
                    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
                    return name.includes(assignSearchQuery.toLowerCase()) || (emp.department && emp.department.toLowerCase().includes(assignSearchQuery.toLowerCase()));
                  });

                  if (filtered.length === 0) {
                    return <p className="text-xs text-[#5f6368] p-4 text-center">No matching employees found.</p>;
                  }

                  return filtered.map(emp => {
                    const isSelected = modalAssignedEmployees.includes(emp.id);
                    const initials = `${(emp.firstName || '').charAt(0)}${(emp.lastName || '').charAt(0)}`.toUpperCase() || 'E';

                    return (
                      <label 
                        key={emp.id}
                        className={`flex items-center gap-3 p-2.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected 
                            ? 'bg-[#e8f0fe] border-[#4285F4] shadow-2xs' 
                            : 'bg-white border-[#e0e3e7] hover:border-[#dadce0]'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModalAssignedEmployees(prev => [...prev, emp.id]);
                            } else {
                              setModalAssignedEmployees(prev => prev.filter(id => id !== emp.id));
                            }
                          }}
                        />
                        <div className="w-7 h-7 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 truncate text-xs">
                          <p className="font-semibold text-[#1f1f1f] truncate">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-[#5f6368] truncate">{emp.department || 'General'}</p>
                        </div>
                      </label>
                    );
                  });
                })()
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  assignVideoMutation.mutate({
                    id: selectedVideoForAssign.id,
                    assigned_employee_ids: modalAssignedEmployees
                  });
                }}
                disabled={assignVideoMutation.isPending}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {assignVideoMutation.isPending ? 'Saving...' : 'Save Assignments'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default AdminTrainingVideos;
