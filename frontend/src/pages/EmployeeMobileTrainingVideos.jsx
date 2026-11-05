import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  ArrowLeft, 
  CheckCircle2, 
  Circle, 
  Search, 
  GraduationCap, 
  Clock, 
  Check, 
  ChevronRight,
  ChevronLeft,
  Film,
  Sparkles,
  Award,
  RotateCcw,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';
import PageLoader from '../components/PageLoader';
import toast from 'react-hot-toast';

const EmployeeMobileTrainingVideos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [confirmingVideo, setConfirmingVideo] = useState(null);
  const videoPlayerRef = useRef(null);

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['employee', 'trainingVideos'],
    queryFn: async () => {
      const res = await api.get('/employee/training/videos');
      return res.data;
    }
  });

  const toggleProgressMutation = useMutation({
    mutationFn: async ({ videoId, completed }) => {
      const res = await api.post('/employee/training/progress', {
        video_id: videoId,
        completed
      });
      return res.data;
    },
    onMutate: async ({ videoId, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['employee', 'trainingVideos'] });
      const previousVideos = queryClient.getQueryData(['employee', 'trainingVideos']);
      queryClient.setQueryData(['employee', 'trainingVideos'], (old = []) => {
        return old.map(v => v.id === videoId ? { ...v, is_completed: completed } : v);
      });
      return { previousVideos };
    },
    onError: (err, variables, context) => {
      if (context?.previousVideos) {
        queryClient.setQueryData(['employee', 'trainingVideos'], context.previousVideos);
      }
      toast.error(err.response?.data?.error || 'Failed to update progress');
    },
    onSuccess: (data) => {
      if (data.completed) {
        toast.success('Module marked as completed!');
      } else {
        toast('Marked as uncompleted', { icon: '↩️' });
      }
      queryClient.invalidateQueries({ queryKey: ['employee', 'trainingVideos'] });
    }
  });

  const triggerToggleComplete = (video, e) => {
    if (e) e.stopPropagation();
    setConfirmingVideo(video);
  };

  const handleConfirmToggle = () => {
    if (!confirmingVideo) return;
    const newStatus = !confirmingVideo.is_completed;
    toggleProgressMutation.mutate({ videoId: confirmingVideo.id, completed: newStatus });
    setConfirmingVideo(null);
  };

  // Default to first video if not set
  useEffect(() => {
    if (videos.length > 0 && !selectedVideoId) {
      setSelectedVideoId(videos[0].id);
    }
  }, [videos, selectedVideoId]);

  const activeVideo = useMemo(() => {
    return videos.find(v => v.id === selectedVideoId) || videos[0] || null;
  }, [videos, selectedVideoId]);

  const activeIndex = useMemo(() => {
    return videos.findIndex(v => v.id === activeVideo?.id);
  }, [videos, activeVideo]);

  const filteredVideos = useMemo(() => {
    return videos.filter(v => {
      const matchesSearch = v.title.toLowerCase().includes(searchQuery.toLowerCase());
      if (activeFilter === 'completed') return matchesSearch && v.is_completed;
      if (activeFilter === 'pending') return matchesSearch && !v.is_completed;
      return matchesSearch;
    });
  }, [videos, searchQuery, activeFilter]);

  const completedCount = useMemo(() => {
    return videos.filter(v => v.is_completed).length;
  }, [videos]);

  const progressPercent = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

  const handleSelectVideo = (video) => {
    setSelectedVideoId(video.id);
  };

  const handlePrevVideo = () => {
    if (activeIndex > 0) {
      handleSelectVideo(videos[activeIndex - 1]);
    }
  };

  const handleNextVideo = () => {
    if (activeIndex >= 0 && activeIndex < videos.length - 1) {
      handleSelectVideo(videos[activeIndex + 1]);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Training Videos..." />;
  }

  return (
    <div className="space-y-4 pb-14 select-none font-sans antialiased text-[var(--text)]">

      {/* Header */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[11px] font-semibold text-[var(--muted)] uppercase tracking-wider mb-1">
            Learning &amp; Development
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-semibold text-[var(--text)] tracking-tight leading-tight min-w-0">
              Training <span className="text-[var(--brand-deep)]">Videos</span>
            </h2>

            <button
              type="button"
              onClick={() => navigate('/employee')}
              className="shrink-0 h-9 px-4 inline-flex items-center justify-center gap-1.5 rounded-[14px] text-xs font-semibold bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] border border-[var(--line)] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[var(--muted)]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[var(--text-2)] mt-1">
            {completedCount} of {videos.length} Modules Completed ({progressPercent}%)
          </p>
        </div>
      </section>

      {/* Curriculum Progress Bar Card */}
      {videos.length > 0 && (
        <section className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-2.5 mx-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">Curriculum Progress</p>
                <p className="text-[10.5px] text-[var(--muted)]">{completedCount} of {videos.length} completed</p>
              </div>
            </div>
            <span className="text-xs font-semibold text-[var(--brand-deep)] bg-[var(--brand-tint)] border border-[var(--brand)]/20 px-2.5 py-0.5 rounded-full shadow-2xs">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--brand-tint)] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[var(--brand)]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </section>
      )}

      {/* KPI Stats Grid */}
      <section className="grid grid-cols-2 gap-3 relative z-20 mx-0.5">
        {/* Total Modules */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Total Modules</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
              <Film className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--text)]">{videos.length}</p>
        </div>

        {/* Completed */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Completed</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-success-bg)] text-[var(--status-success-text)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-success-text)]">{completedCount}</p>
        </div>

        {/* To Watch */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">To Watch</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--status-warning-text)]">{videos.length - completedCount}</p>
        </div>

        {/* Course Progress */}
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Progress</span>
            <div className="p-1.5 rounded-[8px] bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[var(--accent-pink-deep)]">{progressPercent}%</p>
        </div>
      </section>

      {videos.length === 0 ? (
        /* Empty State */
        <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-8 text-center shadow-xs space-y-3 mx-0.5">
          <div className="w-16 h-16 bg-[var(--status-danger-bg)] border border-[var(--status-danger-text)]/20 rounded-[18px] flex items-center justify-center mx-auto text-[var(--status-danger-text)]">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-[var(--text)]">No Training Videos Assigned</h3>
          <p className="text-xs text-[var(--muted)] max-w-xs mx-auto">
            You currently have no training videos assigned. Check back later or contact your HR administrator.
          </p>
        </div>
      ) : (
        <>
          {/* Active Featured Video Player */}
          {activeVideo && (
            <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] overflow-hidden shadow-xs space-y-3 mx-0.5 pt-1">
              <div className="px-4 pt-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--text)] uppercase tracking-wider">Currently Playing</span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)] border border-[var(--brand)]/20">
                  Module {activeIndex + 1} of {videos.length}
                </span>
              </div>

              {/* Video Box */}
              <div className="aspect-video bg-black relative">
                <video
                  ref={videoPlayerRef}
                  key={activeVideo.id}
                  src={activeVideo.video_url}
                  className="w-full h-full object-contain"
                  controls
                  playsInline
                  preload="metadata"
                />
              </div>

              {/* Video Details */}
              <div className="p-4 pt-1 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {activeVideo.is_completed && (
                      <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20 inline-flex items-center gap-1 mb-1.5">
                        <Check className="w-3 h-3" /> Completed
                      </span>
                    )}
                    <h2 className="text-base font-semibold text-[var(--text)] leading-snug">
                      {activeVideo.title}
                    </h2>
                    <p className="text-[11px] text-[var(--muted)] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[var(--muted)]" />
                      Added {new Date(activeVideo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Video Action Pill Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
                  {activeIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrevVideo}
                      className="h-9 px-3.5 inline-flex items-center justify-center gap-1 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-semibold border border-[var(--line)] transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4 text-[var(--muted)]" />
                      <span>Prev</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => triggerToggleComplete(activeVideo, e)}
                    disabled={toggleProgressMutation.isPending}
                    className={`h-9 px-4 flex-1 inline-flex items-center justify-center gap-1.5 rounded-[14px] text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer shadow-xs ${
                      activeVideo.is_completed
                        ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20'
                        : 'bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white'
                    }`}
                  >
                    {activeVideo.is_completed ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Mark as Completed</span>
                      </>
                    )}
                  </button>

                  {activeIndex < videos.length - 1 && (
                    <button
                      type="button"
                      onClick={handleNextVideo}
                      className="h-9 px-3.5 inline-flex items-center justify-center gap-1 rounded-[14px] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-semibold border border-[var(--line)] transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-[var(--surface)] rounded-[20px] border border-[var(--line)] p-4 shadow-xs space-y-3 mx-0.5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[var(--muted)] absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search training modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-10 pr-9 bg-[var(--surface-alt)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 focus:bg-[var(--surface)] rounded-full text-xs font-medium text-[var(--text)] placeholder:[var(--muted)] outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-full transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-[var(--ink)] text-white shadow-xs'
                    : 'bg-[var(--surface-alt)] text-[var(--text-2)] hover:bg-[var(--line)]'
                }`}
              >
                All ({videos.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('pending')}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'pending'
                    ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/30 font-bold'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:bg-[var(--line)]'
                }`}
              >
                To Watch ({videos.length - completedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('completed')}
                className={`h-7 px-3 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'completed'
                    ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/30 font-bold'
                    : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:bg-[var(--line)]'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Video Modules Playlist */}
          <div className="space-y-2.5 mx-0.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-sm font-semibold text-[var(--text)] tracking-tight">
                Module <span className="text-[var(--brand-deep)]">Playlist</span> ({filteredVideos.length})
              </h3>
              <span className="text-[10px] font-medium text-[var(--muted)]">Tap module to play</span>
            </div>

            {filteredVideos.length === 0 ? (
              <div className="bg-[var(--surface)] rounded-[16px] border border-[var(--line)] p-6 text-center shadow-xs">
                <p className="text-xs text-[var(--muted)]">No training modules matched your search or filter.</p>
              </div>
            ) : (
              filteredVideos.map((video) => {
                const isSelected = activeVideo?.id === video.id;
                const originalIndex = videos.findIndex(v => v.id === video.id);

                return (
                  <div
                    key={video.id}
                    onClick={() => handleSelectVideo(video)}
                    className={`bg-[var(--surface)] rounded-[16px] border p-3.5 shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'border-[var(--brand)] ring-1 ring-[var(--brand)] bg-[var(--brand-tint)]/25'
                        : 'border-[var(--line)] hover:border-[var(--brand)]/30'
                    }`}
                  >
                    {/* Left Icon / Thumbnail Indicator */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 font-semibold text-xs transition-all ${
                          isSelected
                            ? 'bg-[var(--brand-deep)] text-white shadow-xs'
                            : video.is_completed
                            ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20'
                            : 'bg-[var(--surface-alt)] text-[var(--muted)]'
                        }`}
                      >
                        {isSelected ? (
                          <Play className="w-3.5 h-3.5 fill-white text-white" />
                        ) : video.is_completed ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <span>#{originalIndex + 1}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-semibold text-[var(--muted)] uppercase tracking-wider">
                            Module {originalIndex + 1}
                          </span>
                          {video.is_completed && (
                            <span className="text-[9px] font-semibold text-[var(--status-success-text)] bg-[var(--status-success-bg)] px-1.5 py-0.5 rounded-full border border-[var(--status-success-text)]/20">
                              Done
                            </span>
                          )}
                        </div>
                        <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                          {video.title}
                        </h4>
                        <p className="text-[10px] text-[var(--muted)] mt-0.5">
                          Added {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Right Action / Check Button */}
                    <button
                      type="button"
                      onClick={(e) => triggerToggleComplete(video, e)}
                      disabled={toggleProgressMutation.isPending}
                      className={`p-2 rounded-full shrink-0 transition-all cursor-pointer ${
                        video.is_completed
                          ? 'text-[var(--status-success-text)] hover:bg-[var(--status-success-bg)]'
                          : 'text-[var(--muted)] hover:text-[var(--brand-deep)] hover:bg-[var(--surface-alt)]'
                      }`}
                      title={video.is_completed ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      {video.is_completed ? (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      ) : (
                        <Circle className="w-4.5 h-4.5" />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      {confirmingVideo && createPortal(
        <div 
          onClick={() => setConfirmingVideo(null)}
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--surface)] rounded-[24px] shadow-2xl border border-[var(--line)] w-full max-w-sm overflow-hidden p-6 space-y-4 text-center font-sans antialiased text-[var(--text)]"
          >
            <div className={`w-12 h-12 rounded-[14px] flex items-center justify-center mx-auto ${
              confirmingVideo.is_completed
                ? 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] border border-[var(--status-warning-text)]/20'
                : 'bg-[var(--status-success-bg)] text-[var(--status-success-text)] border border-[var(--status-success-text)]/20'
            }`}>
              {confirmingVideo.is_completed ? (
                <RotateCcw className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>

            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-[var(--text)]">
                {confirmingVideo.is_completed ? 'Mark as Incomplete?' : 'Mark Module as Completed?'}
              </h3>
              <p className="text-xs text-[var(--text-2)] line-clamp-2 px-2 font-medium">
                "{confirmingVideo.title}"
              </p>
              <p className="text-[11px] text-[var(--muted)]">
                {confirmingVideo.is_completed
                  ? 'This will reset your completion status for this training module.'
                  : 'Are you sure you want to mark this training module as completed?'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingVideo(null)}
                className="w-full h-10 rounded-[14px] border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={toggleProgressMutation.isPending}
                className={`w-full h-10 rounded-[14px] text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  confirmingVideo.is_completed
                    ? 'bg-[var(--status-danger-text)] hover:opacity-90'
                    : 'bg-[var(--ink)] hover:bg-[var(--ink-2)]'
                }`}
              >
                {confirmingVideo.is_completed ? 'Mark Incomplete' : 'Yes, Complete'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default EmployeeMobileTrainingVideos;
