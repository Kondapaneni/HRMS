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
    <div className="space-y-4 pb-14 select-none font-editorial antialiased" style={{ fontFamily: "'Newsreader', Georgia, serif" }}>

      {/* Clean White Header matching all Mobile Pages */}
      <section className="relative z-30 pt-1 pb-1">
        <div className="pt-0.5">
          <p className="text-[10.5px] font-bold text-[#5f6368] uppercase tracking-wider mb-1">
            Learning &amp; Development
          </p>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl sm:text-3xl font-medium text-[#1f1f1f] tracking-tight leading-tight min-w-0" style={{ fontWeight: 500 }}>
              Training <span className="font-medium italic text-[#1a73e8]">Videos</span>
            </h2>

            {/* Standardized Header Back Button matching all other mobile pages */}
            <button
              type="button"
              onClick={() => navigate('/employee')}
              className="shrink-0 h-10 px-4 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold bg-white text-[#1f1f1f] hover:bg-[#f1f3f4] border border-[#dadce0] shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            >
              <ArrowLeft size={14} className="text-[#5f6368]" />
              <span>Back</span>
            </button>
          </div>
          <p className="text-xs sm:text-sm font-medium text-[#5f6368] mt-1">
            {completedCount} of {videos.length} Modules Completed ({progressPercent}%)
          </p>
        </div>
      </section>

      {/* Curriculum Progress Bar Card */}
      {videos.length > 0 && (
        <section className="bg-white rounded-3xl border border-[#e0e3e7] p-4.5 shadow-xs space-y-2.5 mx-0.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shrink-0">
                <GraduationCap className="w-4.5 h-4.5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#1f1f1f]">Curriculum Progress</p>
                <p className="text-[10.5px] text-[#5f6368]">{completedCount} of {videos.length} completed</p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#1a73e8] bg-[#e8f0fe] border border-[#d2e3fc] px-2.5 py-0.5 rounded-full shadow-2xs">
              {progressPercent}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#f1f3f4] overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#1a73e8]"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </section>
      )}

      {/* KPI Stats Grid (4 Cards in Compact Google aesthetic) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 mx-0.5">
        {/* Total Modules */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Total Modules</span>
            <div className="p-1.5 rounded-lg bg-[#e8f0fe] text-[#1a73e8]">
              <Film className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1f1f1f]">{videos.length}</p>
        </div>

        {/* Completed */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Completed</span>
            <div className="p-1.5 rounded-lg bg-[#e6f4ea] text-[#137333]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1f1f1f]">{completedCount}</p>
        </div>

        {/* To Watch */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">To Watch</span>
            <div className="p-1.5 rounded-lg bg-[#fef7e0] text-[#b06000]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1f1f1f]">{videos.length - completedCount}</p>
        </div>

        {/* Course Progress */}
        <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368]">Progress</span>
            <div className="p-1.5 rounded-lg bg-[#f3e8fd] text-[#8430ce]">
              <Award className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base font-bold text-[#1f1f1f]">{progressPercent}%</p>
        </div>
      </section>

      {videos.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center shadow-xs space-y-3 mx-0.5">
          <div className="w-16 h-16 bg-[#fce8e6] border border-[#fad2cf] rounded-full flex items-center justify-center mx-auto text-[#d93025]">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1f1f1f]">No Training Videos Assigned</h3>
          <p className="text-xs text-[#5f6368] max-w-xs mx-auto">
            You currently have no training videos assigned. Check back later or contact your HR administrator.
          </p>
        </div>
      ) : (
        <>
          {/* Active Featured Video Player (Featured Above Playlist for Quick Viewing) */}
          {activeVideo && (
            <div className="bg-white rounded-3xl border border-[#e0e3e7] overflow-hidden shadow-xs space-y-3 mx-0.5 pt-1">
              <div className="px-4 pt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">Currently Playing</span>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
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
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] inline-flex items-center gap-1 mb-1.5">
                        <Check className="w-3 h-3" /> Completed
                      </span>
                    )}
                    <h2 className="text-base font-bold text-[#1f1f1f] leading-snug">
                      {activeVideo.title}
                    </h2>
                    <p className="text-[11px] text-[#5f6368] mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#5f6368]" />
                      Added {new Date(activeVideo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Video Action Pill Buttons with Standardized h-10 Height */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#f1f3f4]">
                  {activeIndex > 0 && (
                    <button
                      type="button"
                      onClick={handlePrevVideo}
                      className="h-10 px-3.5 inline-flex items-center justify-center gap-1 rounded-full bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] text-xs font-semibold border border-[#dadce0] transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4 text-[#5f6368]" />
                      <span>Prev</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => triggerToggleComplete(activeVideo, e)}
                    disabled={toggleProgressMutation.isPending}
                    className={`h-10 px-4 flex-1 inline-flex items-center justify-center gap-1.5 rounded-full text-xs font-semibold tracking-wide transition-all active:scale-95 cursor-pointer shadow-xs ${
                      activeVideo.is_completed
                        ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                        : 'bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white'
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
                      className="h-10 px-3.5 inline-flex items-center justify-center gap-1 rounded-full bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] text-xs font-semibold border border-[#dadce0] transition-all active:scale-95 shadow-2xs cursor-pointer shrink-0"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4 text-[#5f6368]" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-4 shadow-xs space-y-3 mx-0.5">
            <div className="relative flex items-center">
              <Search className="w-4 h-4 text-[#80868b] absolute left-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search training modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-9 bg-[#f8fafd] border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 focus:bg-white rounded-full text-xs font-semibold text-[#1f1f1f] placeholder-[#80868b] outline-none transition-all shadow-2xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 p-1 text-[#80868b] hover:text-[#1f1f1f] rounded-full transition-colors cursor-pointer"
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
                className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'all'
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e3e3e3]'
                }`}
              >
                All ({videos.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('pending')}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'pending'
                    ? 'bg-[#b06000] text-white shadow-xs'
                    : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3] hover:bg-[#feeec3]'
                }`}
              >
                To Watch ({videos.length - completedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('completed')}
                className={`h-8 px-3.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === 'completed'
                    ? 'bg-[#137333] text-white shadow-xs'
                    : 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Video Modules Playlist */}
          <div className="space-y-2.5 mx-0.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-medium text-slate-900 tracking-tight" style={{ fontWeight: 500 }}>
                Module <span className="font-medium italic text-[#1a73e8]">Playlist</span> ({filteredVideos.length})
              </h3>
              <span className="text-[10px] font-semibold text-slate-500">Tap module to play</span>
            </div>

            {filteredVideos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-[#e0e3e7] p-6 text-center shadow-xs">
                <p className="text-xs text-[#5f6368]">No training modules matched your search or filter.</p>
              </div>
            ) : (
              filteredVideos.map((video) => {
                const isSelected = activeVideo?.id === video.id;
                const originalIndex = videos.findIndex(v => v.id === video.id);

                return (
                  <div
                    key={video.id}
                    onClick={() => handleSelectVideo(video)}
                    className={`bg-white rounded-2xl border p-3.5 shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'border-[#1a73e8] ring-1 ring-[#1a73e8] bg-[#f8fafd]'
                        : 'border-[#e0e3e7] hover:border-slate-300'
                    }`}
                  >
                    {/* Left Icon / Thumbnail Indicator */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-[#1a73e8] text-white shadow-xs'
                            : video.is_completed
                            ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isSelected ? (
                          <Play className="w-4 h-4 fill-white text-white" />
                        ) : video.is_completed ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <span>#{originalIndex + 1}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Module {originalIndex + 1}
                          </span>
                          {video.is_completed && (
                            <span className="text-[9px] font-bold text-[#137333] bg-[#e6f4ea] px-1.5 py-0.5 rounded-full border border-[#ceead6]">
                              Done
                            </span>
                          )}
                        </div>
                        <h4 className={`text-xs font-bold truncate ${isSelected ? 'text-[#1a73e8]' : 'text-slate-900'}`}>
                          {video.title}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
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
                          ? 'text-[#137333] hover:bg-[#e6f4ea]'
                          : 'text-slate-400 hover:text-[#1a73e8] hover:bg-slate-100'
                      }`}
                      title={video.is_completed ? 'Mark uncompleted' : 'Mark completed'}
                    >
                      {video.is_completed ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <Circle className="w-5 h-5" />
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
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden p-6 space-y-4 text-center"
          >
            {/* Top Icon Badge */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
              confirmingVideo.is_completed
                ? 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3]'
                : 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
            }`}>
              {confirmingVideo.is_completed ? (
                <RotateCcw className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-slate-900">
                {confirmingVideo.is_completed ? 'Mark as Incomplete?' : 'Mark Module as Completed?'}
              </h3>
              <p className="text-xs text-slate-500 line-clamp-2 px-2 font-medium">
                "{confirmingVideo.title}"
              </p>
              <p className="text-[11px] text-slate-400">
                {confirmingVideo.is_completed
                  ? 'This will reset your completion status for this training module.'
                  : 'Are you sure you want to mark this training module as completed?'}
              </p>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmingVideo(null)}
                className="w-full h-11 rounded-full border border-[#dadce0] bg-white hover:bg-[#f1f3f4] text-[#1f1f1f] text-xs font-semibold transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={toggleProgressMutation.isPending}
                className={`w-full h-11 rounded-full text-white text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  confirmingVideo.is_completed
                    ? 'bg-[#d93025] hover:bg-[#b31412]'
                    : 'bg-[#1a73e8] hover:bg-[#1557b0]'
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
