import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import SearchBar from '../components/ui/SearchBar';
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
  HardDrive,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';
import { compressVideo, uploadToSignedUrlWithProgress, formatBytes } from '../utils/videoCompressor';
import { StatCard, Button, Avatar } from '../components/ui';
import { fetchAllAdminEmployees } from '../utils/fetchAllAdminEmployees';

const AdminTrainingVideos = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState('All'); // 'All', 'Assigned', 'Open'
  const [page, setPage] = useState(1);
  const limit = 12;

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
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: videoResponse = { videos: [], total: 0, stats: {} }, isLoading: videosLoading } = useQuery({
    queryKey: ['admin', 'trainingVideos', page, debouncedSearchQuery, filterTab],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        search: debouncedSearchQuery,
        filter: filterTab.toLowerCase()
      });
      const res = await api.get(`/admin/training/videos?${params.toString()}`);
      return res.data || { videos: [], total: 0, stats: {} };
    },
    placeholderData: (previousData) => previousData
  });

  const videos = videoResponse.videos || videoResponse.data || [];
  const totalVideos = Number(videoResponse.total || 0);
  const totalPages = Math.max(1, Math.ceil(totalVideos / limit));
  const stats = videoResponse.stats || {
    total: totalVideos,
    assignedCourses: videos.filter((video) => video.assigned_employee_ids?.length > 0).length,
    enrolledStaff: 0
  };
  const filteredVideos = videos;

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['admin', 'employeesList'],
    queryFn: async () => {
      return fetchAllAdminEmployees();
    },
    staleTime: 5 * 60 * 1000
  });



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
      setPage(1);
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
          const compResult = await compressVideo(videoFile, {
            onProgress: (progress) => setCompressProgress(progress)
          });

          fileToUpload = compResult.compressedFile || videoFile;
          setCompressionResult(compResult);
          if (!compResult.skipped) {
            toast.success(`Video compressed! Saved ${compResult.savingsPercent}%`);
          }
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

      const signedResponse = await api.post('/admin/training/videos/upload-url', {
        content_type: fileToUpload.type
      });
      const { upload_url, video_url } = signedResponse.data;

      await uploadToSignedUrlWithProgress({
        uploadUrl: upload_url,
        fileBlob: fileToUpload,
        contentType: fileToUpload.type,
        onProgress: (progress) => setUploadProgress(progress)
      });

      addVideoMutation.mutate({
        title,
        video_url
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
            {totalVideos} Videos
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
        <SearchBar
          placeholder="Search modules by title..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          wrapperClassName="w-full md:w-80"
        />

        <div className="flex items-center gap-1.5 self-start md:self-auto overflow-x-auto w-full md:w-auto">
          {['All', 'Assigned', 'Open'].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => { setFilterTab(tab); setPage(1); }}
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

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1">
          <p className="text-xs text-[var(--muted)]">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalVideos)} of {totalVideos} training videos
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || videosLoading}
              className="px-3 py-1.5 rounded-full border border-[var(--line)] text-xs font-medium text-[var(--text)] disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-[var(--muted)] tabular-nums">Page {page} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page >= totalPages || videosLoading}
              className="px-3 py-1.5 rounded-full border border-[var(--line)] text-xs font-medium text-[var(--text)] disabled:opacity-40"
            >
              Next
            </button>
          </div>
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
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  TRAINING HUB
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Upload Training Video
                </h2>
              </div>
              <button
                type="button"
                onClick={() => !isBusy && setIsModalOpen(false)}
                disabled={isBusy}
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer disabled:opacity-30"
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
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isBusy}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleUpload}
                disabled={isBusy || !title.trim() || !videoFile}
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isCompressing ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Compressing ({compressProgress}%)...</span>
                  </>
                ) : isUploading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Uploading ({uploadProgress.percent}%)...</span>
                  </>
                ) : (
                  <>
                    <Upload size={14} />
                    <span>Compress & Publish</span>
                  </>
                )}
              </button>
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
            <div className="bg-[var(--surface)] shrink-0 px-6 py-4.5 border-b border-[var(--line)] flex justify-between items-center">
              <div>
                <span className="text-[10.5px] font-semibold text-[var(--muted)] uppercase tracking-wider block">
                  COURSE ENROLLMENT
                </span>
                <h2 className="text-lg font-semibold text-[var(--text)] tracking-tight">
                  Assign Employees
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)] p-1.5 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search and Quick Selection */}
            <div className="p-4 border-b border-[var(--line)] bg-[var(--surface)] space-y-2.5">
              <SearchBar
                placeholder="Search employees by name..."
                value={assignSearchQuery}
                onChange={(e) => setAssignSearchQuery(e.target.value)}
              />

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
            <div className="px-6 py-4 border-t border-[var(--line)] bg-[var(--surface)] flex justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="px-5 py-2 text-xs font-semibold text-[var(--muted)] hover:text-[var(--text)] bg-[var(--surface-alt)] border border-[var(--line)] rounded-full hover:bg-[var(--line)]/50 transition-colors cursor-pointer"
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
                className="px-6 py-2 text-xs font-semibold text-white bg-[var(--ink)] hover:bg-[var(--ink-2)] rounded-full shadow-xs transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {assignVideoMutation.isPending ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
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