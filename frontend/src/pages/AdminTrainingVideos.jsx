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
  UserCheck,
  Zap,
  HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import PageLoader from '../components/PageLoader';
import { compressVideo, uploadToSupabaseWithProgress, formatBytes } from '../utils/videoCompressor';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Assigned', 'Open'

  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedVideoForAssign, setSelectedVideoForAssign] = useState(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [modalAssignedEmployees, setModalAssignedEmployees] = useState([]);
  
  // Compression & Upload State
  const [enableCompression, setEnableCompression] = useState(true);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressProgress, setCompressProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ loaded: 0, total: 0, percent: 0, speedMBps: '0.0' });
  const [compressionResult, setCompressionResult] = useState(null);

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
      toast.success('Training video published successfully!');
      setIsModalOpen(false);
      setTitle('');
      setVideoFile(null);
      setCompressionResult(null);
      setIsCompressing(false);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add video');
      setIsUploading(false);
      setIsCompressing(false);
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

    let fileToUpload = videoFile;
    setCompressionResult(null);

    // Step 1: Optional In-Browser Compression
    if (enableCompression) {
      setIsCompressing(true);
      setCompressProgress(0);
      try {
        const result = await compressVideo(videoFile, {
          maxHeight: 720,
          videoBitrate: 1800000,
          onProgress: (pct) => setCompressProgress(pct)
        });

        setCompressionResult(result);
        if (!result.skipped && result.compressedFile) {
          fileToUpload = result.compressedFile;
        }
      } catch (err) {
        console.warn('Compression error, continuing with original file:', err);
      } finally {
        setIsCompressing(false);
      }
    }

    // Step 2: Upload to Cloud Storage with Real-Time Progress Bar
    setIsUploading(true);
    setUploadProgress({ loaded: 0, total: fileToUpload.size, percent: 0, speedMBps: '0.0' });

    const fileExt = fileToUpload.name.split('.').pop() || 'mp4';
    const cleanTitle = title.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const fileName = `${Date.now()}_${cleanTitle}.${fileExt}`;

    try {
      await uploadToSupabaseWithProgress({
        bucket: 'training_videos',
        fileName,
        fileBlob: fileToUpload,
        onProgress: (progress) => {
          setUploadProgress(progress);
        }
      });

      await addVideoMutation.mutateAsync({
        title: title.trim(),
        video_url: window.location.origin + `/Training-Video/${fileName}`
      });
    } catch (err) {
      toast.error(err.message || 'Failed to upload video');
      setIsUploading(false);
      setIsCompressing(false);
    }
  };

  const handleDelete = (id, videoTitle) => {
    if (!window.confirm(`Are you sure you want to delete "${videoTitle}"?`)) return;
    deleteMutation.mutate(id);
  };

  const isBusy = isCompressing || isUploading || addVideoMutation.isPending;

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
            Curate orientation courses, upload training videos with in-browser compression, and manage targeted employee enrollments.
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
          title="Assigned Courses" 
          value={stats.assignedCourses} 
          subtitle="With targeted employees" 
          icon={GraduationCap} 
          colorTheme="purple" 
        />
        <StatCard 
          title="Enrolled Staff" 
          value={stats.enrolledStaff} 
          subtitle="Active learning participants" 
          icon={Users} 
          colorTheme="green" 
        />
        <StatCard 
          title="Open Courses" 
          value={stats.total - stats.assignedCourses} 
          subtitle="Available for all staff" 
          icon={Film} 
          colorTheme="amber" 
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="bg-white rounded-2xl border border-[#e0e3e7] p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368]" />
          <input
            type="search"
            placeholder="Search modules by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-[#f8fafd] focus:bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-1 focus:ring-[#4285F4] rounded-full text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto">
          {['All', 'Assigned', 'Open'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer shrink-0 ${
                filterTab === tab
                  ? 'bg-[#1a73e8] text-white shadow-2xs'
                  : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-12 text-center shadow-xs">
          <div className="w-12 h-12 bg-[#f8fafd] border border-[#e0e3e7] rounded-full flex items-center justify-center mx-auto mb-3 text-[#5f6368]">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[#1f1f1f] mb-1">No training videos found</h3>
          <p className="text-xs text-[#5f6368] max-w-sm mx-auto mb-4">
            {searchQuery ? 'Try adjusting your search filters.' : 'Get started by uploading your first learning module video.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVideos.map((video) => {
            const hasAssigned = video.assigned_employee_ids && video.assigned_employee_ids.length > 0;
            const assignedCount = hasAssigned ? video.assigned_employee_ids.length : 0;

            return (
              <div 
                key={video.id} 
                className="bg-white rounded-2xl border border-[#e0e3e7] overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Video Box */}
                  <div className="w-full h-48 sm:h-52 bg-slate-950 relative overflow-hidden flex items-center justify-center group-hover:opacity-95 transition-opacity">
                    <video
                      src={video.video_url}
                      controls
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-contain max-h-full"
                    />
                  </div>

                  {/* Video Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-semibold text-[#1f1f1f] line-clamp-2 leading-snug">
                        {video.title}
                      </h3>
                      <button
                        onClick={() => handleDelete(video.id, video.title)}
                        className="text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] p-1.5 rounded-full transition-colors shrink-0 cursor-pointer"
                        title="Delete video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#5f6368] pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#5f6368]" />
                        {new Date(video.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer / Assignment Action */}
                <div className="px-4 py-3.5 border-t border-[#e0e3e7] bg-[#f8fafd]/40 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                    hasAssigned 
                      ? 'bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]' 
                      : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
                  }`}>
                    <Users className="w-3.5 h-3.5" />
                    {hasAssigned ? `${assignedCount} Assigned` : 'All Staff (Open)'}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVideoForAssign(video);
                      setModalAssignedEmployees(video.assigned_employee_ids || []);
                      setAssignSearchQuery('');
                      setIsAssignModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] hover:underline cursor-pointer"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Manage Staff</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Video Slideover Right Drawer with In-Browser Compression & Progress Bar */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !isBusy) setIsModalOpen(false); }}
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

            {/* Modal Header */}
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
                onClick={() => !isBusy && setIsModalOpen(false)}
                disabled={isBusy}
                className="text-[#5f6368] hover:text-[#1f1f1f] hover:bg-[#f1f3f4] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleUpload} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4 text-xs">
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
                  className="w-full px-4 py-2.5 bg-white border border-[#dadce0] focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs font-medium text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5f6368] uppercase tracking-wider mb-1.5">
                  Select Video File (MP4 / WebM / QuickTime) *
                </label>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="video/mp4,video/quicktime,video/webm"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setVideoFile(e.target.files[0]);
                      setCompressionResult(null);
                    }
                  }}
                  disabled={isBusy}
                />

                <div 
                  onClick={() => !isBusy && fileInputRef.current?.click()}
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer ${
                    videoFile
                      ? 'bg-[#e8f0fe]/30 border-[#4285F4]'
                      : 'bg-[#f8fafd] border-[#dadce0] hover:border-[#4285F4] hover:bg-[#f1f3f4]'
                  } ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="w-12 h-12 rounded-full bg-white shadow-xs border border-[#e0e3e7] flex items-center justify-center mb-2.5 text-[#1a73e8]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-xs text-[#1f1f1f] text-center max-w-sm truncate">
                    {videoFile ? videoFile.name : 'Click to select or drop video file'}
                  </span>
                  
                  {videoFile ? (
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-bold text-[#1a73e8] bg-[#e8f0fe] px-2.5 py-0.5 rounded-full border border-[#d2e3fc]">
                      <HardDrive className="w-3 h-3" />
                      <span>Original Size: {formatBytes(videoFile.size)}</span>
                    </div>
                  ) : (
                    <span className="text-[10px] text-[#5f6368] mt-1">
                      Supported formats: MP4, MOV, WebM
                    </span>
                  )}
                </div>
              </div>

              {/* Compression Option Toggle */}
              {videoFile && !isBusy && (
                <div className="p-3.5 bg-[#f8fafd] rounded-2xl border border-[#e0e3e7] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="enableCompression"
                    checked={enableCompression}
                    onChange={(e) => setEnableCompression(e.target.checked)}
                    className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-[#dadce0] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="enableCompression" className="cursor-pointer space-y-0.5">
                    <div className="flex items-center gap-1.5 font-bold text-xs text-[#1f1f1f]">
                      <Zap className="w-3.5 h-3.5 text-[#b06000]" />
                      <span>Compress Video In-Browser (Recommended)</span>
                    </div>
                    <p className="text-[11px] text-[#5f6368]">
                      Downsamples resolution to 720p HD and optimizes bitrate right in your browser. Uploads 8x faster and streams without lag.
                    </p>
                  </label>
                </div>
              )}

              {/* Live Processing Card (Compressing + Uploading) */}
              {isBusy && (
                <div className="p-4 bg-[#f8fafd] rounded-2xl border border-[#d2e3fc] space-y-3">
                  {/* Step 1: Compression */}
                  {enableCompression && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-[#1f1f1f]">
                          {isCompressing ? (
                            <Sparkles className="w-3.5 h-3.5 text-[#8430ce] animate-pulse" />
                          ) : compressionResult ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#137333]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                          )}
                          <span>Step 1: In-Browser Compression</span>
                        </span>
                        <span className="text-xs font-bold text-[#8430ce]">
                          {isCompressing ? `${compressProgress}%` : compressionResult ? `Saved ${compressionResult.savingsPercent}%` : 'Pending'}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[#e0e3e7] overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-[#8430ce] to-[#1a73e8] transition-all duration-200"
                          style={{ width: `${isCompressing ? compressProgress : compressionResult ? 100 : 0}%` }}
                        />
                      </div>

                      {compressionResult && !compressionResult.skipped && (
                        <p className="text-[11px] text-[#137333] font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Reduced from {formatBytes(compressionResult.originalSize)} to {formatBytes(compressionResult.compressedSize)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Step 2: Upload Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-[#1f1f1f]">
                        {isUploading ? (
                          <Upload className="w-3.5 h-3.5 text-[#1a73e8] animate-bounce" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-[#5f6368]" />
                        )}
                        <span>Step 2: Uploading to Cloud Storage</span>
                      </span>
                      <span className="text-xs font-bold text-[#1a73e8]">
                        {uploadProgress.percent}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-[#e0e3e7] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-gradient-to-r from-[#4285F4] via-[#34A853] to-[#4285F4] bg-[length:200%_100%] transition-all duration-150 animate-pulse"
                        style={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>

                    {isUploading && uploadProgress.total > 0 && (
                      <div className="flex items-center justify-between text-[10.5px] text-[#5f6368] font-medium pt-0.5">
                        <span>{formatBytes(uploadProgress.loaded)} of {formatBytes(uploadProgress.total)}</span>
                        <span>Speed: {uploadProgress.speedMBps} MB/s</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end items-center gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isBusy}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleUpload}
                disabled={isBusy || !title.trim() || !videoFile}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {isCompressing ? (
                  <>
                    <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    <span>Compressing ({compressProgress}%)...</span>
                  </>
                ) : isUploading ? (
                  <>
                    <Upload className="w-3.5 h-3.5 animate-pulse" />
                    <span>Uploading ({uploadProgress.percent}%)...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5" />
                    <span>Compress &amp; Publish</span>
                  </>
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
                    return (
                      <div
                        key={emp.id}
                        onClick={() => {
                          if (isSelected) {
                            setModalAssignedEmployees(prev => prev.filter(id => id !== emp.id));
                          } else {
                            setModalAssignedEmployees(prev => [...prev, emp.id]);
                          }
                        }}
                        className={`p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#e8f0fe] border-[#4285F4] text-[#1a73e8]'
                            : 'bg-white border-[#e0e3e7] hover:bg-[#f8fafd] text-[#1f1f1f]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white border border-[#dadce0] shadow-2xs flex items-center justify-center font-bold text-xs text-[#5f6368]">
                            {emp.firstName ? emp.firstName[0] : 'E'}
                          </div>
                          <div>
                            <p className="font-semibold text-xs text-[#1f1f1f]">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[10.5px] text-[#5f6368]">
                              {emp.employeeId || 'ID'} • {emp.department || 'General'}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[#1a73e8] border-[#1a73e8] text-white'
                            : 'border-[#dadce0] bg-white'
                        }`}>
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[#e0e3e7] bg-[#f8fafd] flex justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-4 py-2 rounded-full text-xs font-semibold border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={assignVideoMutation.isPending}
                onClick={() => {
                  assignVideoMutation.mutate({
                    id: selectedVideoForAssign.id,
                    assigned_employee_ids: modalAssignedEmployees
                  });
                }}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-xs font-semibold bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {assignVideoMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Enrollment</span>
                )}
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
