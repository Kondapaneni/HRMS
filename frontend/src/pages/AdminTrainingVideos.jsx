import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { 
  Plus, 
  Trash2, 
  X, 
  Upload, 
  Users, 
  Search, 
  PlaySquare, 
  GraduationCap, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Check, 
  Film, 
  UserCheck,
  Zap,
  HardDrive
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { supabase } from '../lib/supabase';
import PageLoader from '../components/PageLoader';
import { compressVideo, uploadToSupabaseWithProgress, formatBytes } from '../utils/videoCompressor';
import { StatCard, Button, Avatar } from '../components/ui';

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
      return res.data?.videos || res.data?.data || (Array.isArray(res.data) ? res.data : []);
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
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
      setIsModalOpen(false);
      setTitle('');
      setVideoFile(null);
      setCompressionResult(null);
      setIsUploading(false);
      setIsCompressing(false);
      toast.success('Training module published successfully!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to register video module');
      setIsUploading(false);
      setIsCompressing(false);
    }
  });

  const assignVideoMutation = useMutation({
    mutationFn: async ({ id, assigned_employee_ids }) => {
      await api.put(`/admin/training/videos/${id}/assign`, { assigned_employee_ids });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
      setIsAssignModalOpen(false);
      setSelectedVideoForAssign(null);
      toast.success('Course employee enrollments updated!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to update video enrollment');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/training/videos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
      toast.success('Training video deleted');
    },
    onError: () => toast.error('Failed to delete training video')
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim()) return toast.error('Please enter a module title');
    if (!videoFile) return toast.error('Please select a video file');

    try {
      let fileToUpload = videoFile;

      if (enableCompression) {
        setIsCompressing(true);
        setCompressProgress(0);

        try {
          const compResult = await compressVideo(videoFile, (progress) => {
            setCompressProgress(progress);
          });

          fileToUpload = compResult.file;
          setCompressionResult(compResult);
          toast.success(`Video compressed! Saved ${compResult.savingsPercent}%`);
        } catch (compressErr) {
          console.warn('In-browser compression skipped or failed, uploading original:', compressErr);
          toast('Proceeding with standard upload...', { icon: 'ℹ️' });
          fileToUpload = videoFile;
        } finally {
          setIsCompressing(false);
        }
      }

      setIsUploading(true);
      setUploadProgress({ loaded: 0, total: fileToUpload.size, percent: 0, speedMBps: '0.0' });

      const cleanFileName = fileToUpload.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${Date.now()}_${cleanFileName}`;

      const { publicUrl } = await uploadToSupabaseWithProgress(
        supabase,
        'training-videos',
        fileName,
        fileToUpload,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      addVideoMutation.mutate({
        title,
        video_url: publicUrl
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
    <div className="space-y-4 font-sans antialiased">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-[var(--text)]">
            Training Videos &amp; Modules
          </h1>
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Curate orientation courses, upload training videos with in-browser compression, and manage targeted employee enrollments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-[9px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
            {videos.length} Videos
          </span>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Upload Video</span>
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid gap-3.5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Training Modules" 
          value={stats.total} 
          subtitle="Total hosted video modules" 
          icon={PlaySquare} 
        />
        <StatCard 
          title="Assigned Courses" 
          value={stats.assignedCourses} 
          subtitle="With targeted employees" 
          badgeText="Active"
          badgeType="info"
          icon={GraduationCap} 
        />
        <StatCard 
          title="Enrolled Staff" 
          value={stats.enrolledStaff} 
          subtitle="Active learning participants" 
          badgeText="Enrolled"
          badgeType="success"
          icon={Users} 
        />
        <StatCard 
          title="Open Courses" 
          value={stats.total - stats.assignedCourses} 
          subtitle="Available for all staff" 
          icon={Film} 
        />
      </div>

      {/* Search and Filters Bar */}
      <div className="rounded-[24px] bg-[var(--surface)] p-[18px] flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--icon-muted)] pointer-events-none" />
          <input
            type="search"
            placeholder="Search modules by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 text-xs bg-[var(--surface-alt)] border border-[var(--line)] rounded-full text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
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
                  ? 'bg-[var(--ink)] text-white shadow-xs'
                  : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:text-[var(--text)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Videos Grid */}
      {filteredVideos.length === 0 ? (
        <div className="rounded-[24px] bg-[var(--surface)] p-12 text-center">
          <div className="w-12 h-12 bg-[var(--surface-alt)] rounded-[14px] flex items-center justify-center mx-auto mb-3 text-[var(--icon-muted)]">
            <Film className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-semibold text-[var(--text)] mb-1">No training videos found</h3>
          <p className="text-xs text-[var(--muted)] max-w-sm mx-auto mb-4">
            {searchQuery ? 'Try adjusting your search filters.' : 'Get started by uploading your first learning module video.'}
          </p>
          {!searchQuery && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Upload Video</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map((video) => {
            const hasAssigned = video.assigned_employee_ids && video.assigned_employee_ids.length > 0;
            const assignedCount = hasAssigned ? video.assigned_employee_ids.length : 0;

            return (
              <div 
                key={video.id} 
                className="rounded-[24px] bg-[var(--surface)] border border-[var(--line)] overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Video Box */}
                  <div className="w-full h-48 sm:h-52 bg-black relative overflow-hidden flex items-center justify-center">
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
                      <h3 className="text-sm font-semibold text-[var(--text)] line-clamp-2 leading-snug">
                        {video.title}
                      </h3>
                      <button
                        onClick={() => handleDelete(video.id, video.title)}
                        className="text-[var(--muted)] hover:text-[var(--status-danger-text)] hover:bg-[var(--status-danger-bg)] p-1.5 rounded-full transition-colors shrink-0 cursor-pointer"
                        title="Delete video"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[var(--muted)] pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(video.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer / Assignment Action */}
                <div className="px-4 py-3.5 border-t border-[var(--line)] bg-[var(--surface-alt)]/40 flex items-center justify-between">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-[8px] ${
                    hasAssigned 
                      ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)]' 
                      : 'bg-[var(--surface-alt)] text-[var(--muted)]'
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
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--brand-deep)] hover:underline cursor-pointer"
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

      {/* Upload Video Slideover Right Drawer */}
      {isModalOpen && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget && !isBusy) setIsModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs font-sans antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)]/50 shrink-0">
              <div>
                <span className="text-xs font-semibold text-[var(--brand-deep)]">Training Hub</span>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Upload Training Video
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !isBusy && setIsModalOpen(false)}
                disabled={isBusy}
                className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--surface-alt)] transition-colors cursor-pointer disabled:opacity-30"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleUpload} className="p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  Module Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Employee Security Orientation & Protocols"
                  className="w-full h-10 px-3.5 bg-[var(--surface-alt)] border border-[var(--line)] rounded-[12px] text-xs font-medium text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-[var(--brand)] transition-all"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
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
                  className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-[16px] transition-all cursor-pointer ${
                    videoFile
                      ? 'bg-[var(--brand-tint)]/40 border-[var(--brand)]'
                      : 'bg-[var(--surface-alt)] border-[var(--line)] hover:border-[var(--brand)]'
                  } ${isBusy ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  <div className="w-12 h-12 rounded-[14px] bg-[var(--surface)] shadow-xs flex items-center justify-center mb-2.5 text-[var(--brand-deep)]">
                    <Upload className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-xs text-[var(--text)] text-center max-w-sm truncate">
                    {videoFile ? videoFile.name : 'Click to select or drop video file'}
                  </span>
                  
                  {videoFile ? (
                    <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[8px]">
                      <HardDrive className="w-3 h-3" />
                      <span>Original Size: {formatBytes(videoFile.size)}</span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[var(--muted)] mt-1">
                      Supported formats: MP4, MOV, WebM
                    </span>
                  )}
                </div>
              </div>

              {/* Compression Option Toggle */}
              {videoFile && !isBusy && (
                <div className="p-3.5 bg-[var(--surface-alt)] rounded-[16px] border border-[var(--line)] flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="enableCompression"
                    checked={enableCompression}
                    onChange={(e) => setEnableCompression(e.target.checked)}
                    className="w-4 h-4 rounded-[4px] accent-[var(--brand-deep)] mt-0.5 cursor-pointer"
                  />
                  <label htmlFor="enableCompression" className="cursor-pointer space-y-0.5">
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-[var(--text)]">
                      <Zap className="w-3.5 h-3.5 text-[var(--status-warning-text)]" />
                      <span>Compress Video In-Browser (Recommended)</span>
                    </div>
                    <p className="text-[11px] text-[var(--muted)]">
                      Downsamples resolution to 720p HD and optimizes bitrate right in your browser. Uploads faster and streams without lag.
                    </p>
                  </label>
                </div>
              )}

              {/* Live Processing Card (Compressing + Uploading) */}
              {isBusy && (
                <div className="p-4 bg-[var(--surface-alt)] rounded-[16px] border border-[var(--line)] space-y-3">
                  {/* Step 1: Compression */}
                  {enableCompression && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="flex items-center gap-1.5 text-[var(--text)]">
                          {isCompressing ? (
                            <Sparkles className="w-3.5 h-3.5 text-[var(--brand-deep)] animate-pulse" />
                          ) : compressionResult ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-success-text)]" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                          )}
                          <span>Step 1: In-Browser Compression</span>
                        </span>
                        <span className="text-xs font-semibold text-[var(--brand-deep)]">
                          {isCompressing ? `${compressProgress}%` : compressionResult ? `Saved ${compressionResult.savingsPercent}%` : 'Pending'}
                        </span>
                      </div>

                      <div className="w-full h-2 rounded-full bg-[var(--line)] overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-[var(--brand-deep)] transition-all duration-200"
                          style={{ width: `${isCompressing ? compressProgress : compressionResult ? 100 : 0}%` }}
                        />
                      </div>

                      {compressionResult && !compressionResult.skipped && (
                        <p className="text-[11px] text-[var(--status-success-text)] font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Reduced from {formatBytes(compressionResult.originalSize)} to {formatBytes(compressionResult.compressedSize)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Step 2: Upload Progress */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="flex items-center gap-1.5 text-[var(--text)]">
                        {isUploading ? (
                          <Upload className="w-3.5 h-3.5 text-[var(--brand-deep)] animate-bounce" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                        )}
                        <span>Step 2: Uploading to Cloud Storage</span>
                      </span>
                      <span className="text-xs font-semibold text-[var(--brand-deep)]">
                        {uploadProgress.percent}%
                      </span>
                    </div>

                    <div className="w-full h-2.5 rounded-full bg-[var(--line)] overflow-hidden">
                      <div 
                        className="h-full rounded-full bg-[var(--brand)] transition-all duration-150"
                        style={{ width: `${uploadProgress.percent}%` }}
                      />
                    </div>

                    {isUploading && uploadProgress.total > 0 && (
                      <div className="flex items-center justify-between text-[11px] text-[var(--muted)] font-medium pt-0.5">
                        <span>{formatBytes(uploadProgress.loaded)} of {formatBytes(uploadProgress.total)}</span>
                        <span>Speed: {uploadProgress.speedMBps} MB/s</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </form>

            {/* Footer */}
            <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)]/50 flex justify-end items-center gap-2.5 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                onClick={handleUpload}
                disabled={isBusy || !title.trim() || !videoFile}
                loading={isBusy}
              >
                {isCompressing ? (
                  `Compressing (${compressProgress}%)...`
                ) : isUploading ? (
                  `Uploading (${uploadProgress.percent}%)...`
                ) : (
                  <>
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    <span>Compress &amp; Publish</span>
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

      {/* Slideover Right Drawer: Assign Employees */}
      {isAssignModalOpen && selectedVideoForAssign && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setIsAssignModalOpen(false); }}
          className="fixed inset-0 z-[9999] flex justify-end bg-black/40 backdrop-blur-xs font-sans antialiased"
        >
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="bg-[var(--surface)] shadow-[0_24px_60px_rgba(19,19,21,0.18)] w-full max-w-md h-[100dvh] flex flex-col overflow-hidden relative z-10"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-[var(--line)] flex justify-between items-center bg-[var(--surface-alt)]/50 shrink-0">
              <div>
                <span className="text-xs font-semibold text-[var(--brand-deep)]">Course Enrollment</span>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  Assign Employees
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] rounded-full hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Quick Selection */}
            <div className="p-4 border-b border-[var(--line)] bg-[var(--surface)] space-y-2.5">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--icon-muted)] pointer-events-none" />
                <input
                  type="search"
                  placeholder="Search employees by name..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  className="w-full h-10 pl-10 pr-4 text-xs bg-[var(--surface-alt)] border border-[var(--line)] rounded-full text-[var(--text)] placeholder:text-[var(--muted)] outline-none focus:ring-2 focus:ring-[var(--brand)]"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[var(--muted)] font-medium">
                  {modalAssignedEmployees.length} employee(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalAssignedEmployees(employees.map(e => e.id))}
                    className="text-[var(--brand-deep)] font-semibold hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-[var(--line)]">•</span>
                  <button
                    type="button"
                    onClick={() => setModalAssignedEmployees([])}
                    className="text-[var(--muted)] font-semibold hover:underline cursor-pointer"
                  >
                    Deselect
                  </button>
                </div>
              </div>
            </div>

            {/* Employee List Body */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar space-y-1.5">
              {employeesLoading ? (
                <p className="text-xs text-[var(--muted)] p-4 text-center">Loading employee directory...</p>
              ) : (
                (() => {
                  const filtered = employees.filter(emp => {
                    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
                    return name.includes(assignSearchQuery.toLowerCase()) || (emp.department && emp.department.toLowerCase().includes(assignSearchQuery.toLowerCase()));
                  });

                  if (filtered.length === 0) {
                    return <p className="text-xs text-[var(--muted)] p-4 text-center">No matching employees found.</p>;
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
                        className={`p-3 rounded-[16px] border flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[var(--brand-tint)] border-[var(--brand)] text-[var(--brand-deep)]'
                            : 'bg-[var(--surface)] border-[var(--line)] hover:bg-[var(--surface-alt)] text-[var(--text)]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={`${emp.firstName || ''} ${emp.lastName || ''}`} size="sm" />
                          <div>
                            <p className="font-semibold text-xs text-[var(--text)]">
                              {emp.firstName} {emp.lastName}
                            </p>
                            <p className="text-[11px] text-[var(--muted)]">
                              {emp.employeeId || 'ID'} • {emp.department || 'General'}
                            </p>
                          </div>
                        </div>

                        <div className={`w-5 h-5 rounded-[6px] flex items-center justify-center border transition-all ${
                          isSelected
                            ? 'bg-[var(--brand-deep)] border-[var(--brand-deep)] text-white'
                            : 'border-[var(--line)] bg-[var(--surface)]'
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
            <div className="p-4 border-t border-[var(--line)] bg-[var(--surface-alt)]/50 flex justify-end gap-2.5 shrink-0">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={assignVideoMutation.isPending}
                loading={assignVideoMutation.isPending}
                onClick={() => {
                  assignVideoMutation.mutate({
                    id: selectedVideoForAssign.id,
                    assigned_employee_ids: modalAssignedEmployees
                  });
                }}
              >
                Save Enrollment
              </Button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminTrainingVideos;