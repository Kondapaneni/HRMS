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
  RotateCcw
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
    <div className="space-y-6 pb-6">

      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-7 relative overflow-hidden bg-slate-900">
        {/* Animated Liquid Orbs */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.4, 1], x: [0, -40, 0], y: [0, 50, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -top-10 -right-10 w-64 h-64 bg-[#7bdff2] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />
        
        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">Learning Hub</p>
              <h2 className="text-3xl font-black text-white tracking-tight mb-0.5 drop-shadow-sm">Training Videos</h2>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">
                {completedCount} of {videos.length} Modules Completed ({progressPercent}%)
              </p>
            </div>

            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 mt-1 shadow-md border border-white/20">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>

          {/* Progress Bar in Hero */}
          {videos.length > 0 && (
            <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden backdrop-blur-xs">
              <motion.div
                className="h-full rounded-full bg-white shadow-xs"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>
          )}
        </div>
      </section>

      {/* KPI Stats Grid (4 Cards in Compact Google aesthetic) */}
      <section className="grid grid-cols-2 gap-3 relative z-20 -mt-3 mx-0.5">
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
        <div className="bg-white rounded-[1.5rem] border border-slate-100 p-8 text-center shadow-md space-y-3 mx-0.5">
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
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-2xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-2.5 mx-0.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#5f6368] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search training modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 pt-1 overflow-x-auto [scrollbar-width:none]">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-[#1a73e8] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({videos.length})
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'pending'
                    ? 'bg-[#b06000] text-white shadow-xs'
                    : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3] hover:bg-[#feeec3]'
                }`}
              >
                To Watch ({videos.length - completedCount})
              </button>
              <button
                onClick={() => setActiveFilter('completed')}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeFilter === 'completed'
                    ? 'bg-[#137333] text-white shadow-xs'
                    : 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Video Modules Playlist (Above Videos) */}
          <div className="space-y-2.5 mx-0.5">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Module Playlist ({filteredVideos.length})
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

          {/* Active Featured Video Player (Below Playlist) */}
          {activeVideo && (
            <div className="bg-white rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-md space-y-3 mx-0.5 pt-1">
              <div className="px-4 pt-3 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Currently Playing</span>
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

                {/* Video Action Pill Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  {activeIndex > 0 && (
                    <button
                      onClick={handlePrevVideo}
                      className="flex items-center justify-center gap-1 py-3 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Prev</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={(e) => triggerToggleComplete(activeVideo, e)}
                    disabled={toggleProgressMutation.isPending}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 px-3 rounded-full text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-xs ${
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
                      onClick={handleNextVideo}
                      className="flex items-center justify-center gap-1 py-3 px-3.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
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
                className="w-full py-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={toggleProgressMutation.isPending}
                className={`w-full py-3 rounded-full text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
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
