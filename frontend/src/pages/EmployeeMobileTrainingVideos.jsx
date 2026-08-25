import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Film
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

  const toggleComplete = (video, e) => {
    if (e) e.stopPropagation();
    const newStatus = !video.is_completed;
    toggleProgressMutation.mutate({ videoId: video.id, completed: newStatus });
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
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="space-y-4 pb-12">
      {/* Header Card with Back Navigation */}
      <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/employee')}
              className="p-2 rounded-full border border-[#dadce0] bg-[#f8fafd] hover:bg-[#e8f0fe] text-[#1f1f1f] transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
              title="Back to Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4285F4]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#EA4335]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05]" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#34A853]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5f6368] ml-1">
                  Learning Hub
                </span>
              </div>
              <h1 className="text-xl font-bold text-[#1f1f1f] tracking-tight mt-0.5">
                Training Videos
              </h1>
              <p className="text-xs text-[#5f6368]">
                {videos.length} assigned learning {videos.length === 1 ? 'module' : 'modules'}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
            <GraduationCap className="w-5 h-5" />
          </div>
        </div>

        {/* Learning Progress Bar */}
        {videos.length > 0 && (
          <div className="pt-2 border-t border-[#e0e3e7] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1f1f1f]">Course Progress</span>
              <span className="font-bold text-[#1a73e8]">{completedCount} of {videos.length} Completed ({progressPercent}%)</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[#f1f3f4] overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#34A853]"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {videos.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-8 text-center shadow-xs space-y-3">
          <div className="w-16 h-16 bg-[#fce8e6] border border-[#fad2cf] rounded-3xl flex items-center justify-center mx-auto text-[#d93025]">
            <Film className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-[#1f1f1f]">No Training Videos Assigned</h3>
          <p className="text-xs text-[#5f6368] max-w-xs mx-auto">
            You currently have no training videos assigned. Check back later or contact your HR administrator.
          </p>
        </div>
      ) : (
        <>
          {/* Active Featured Video Player */}
          {activeVideo && (
            <div className="bg-white rounded-3xl border border-[#e0e3e7] overflow-hidden shadow-xs space-y-3">
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
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                        Module {activeIndex + 1} of {videos.length}
                      </span>
                      {activeVideo.is_completed && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center gap-1">
                          <Check className="w-3 h-3" /> Completed
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm font-bold text-[#1f1f1f] leading-snug">
                      {activeVideo.title}
                    </h2>
                    <p className="text-[11px] text-[#5f6368] mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Added {new Date(activeVideo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Video Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-[#e0e3e7]">
                  <button
                    onClick={(e) => toggleComplete(activeVideo, e)}
                    disabled={toggleProgressMutation.isPending}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl text-xs font-semibold transition-all active:scale-98 ${
                      activeVideo.is_completed
                        ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                        : 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-2xs'
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
                      className="flex items-center justify-center gap-1 py-2.5 px-3 rounded-2xl bg-[#f1f3f4] text-[#1f1f1f] hover:bg-[#e3e3e3] text-xs font-semibold transition-all active:scale-98"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Search & Filter Bar */}
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-3.5 shadow-xs space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search training modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl text-xs text-[#1f1f1f] placeholder-[#80868b] focus:outline-none focus:border-[#1a73e8] focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#5f6368] hover:text-[#1f1f1f]"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeFilter === 'all'
                    ? 'bg-[#1a73e8] text-white'
                    : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e3e3e3]'
                }`}
              >
                All ({videos.length})
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeFilter === 'pending'
                    ? 'bg-[#b06000] text-white'
                    : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3] hover:bg-[#feeec3]'
                }`}
              >
                To Watch ({videos.length - completedCount})
              </button>
              <button
                onClick={() => setActiveFilter('completed')}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                  activeFilter === 'completed'
                    ? 'bg-[#137333] text-white'
                    : 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          {/* Video Modules Playlist */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-bold text-[#1f1f1f] uppercase tracking-wider">
                Module Playlist ({filteredVideos.length})
              </h3>
              <span className="text-[10px] text-[#5f6368]">Tap module to play</span>
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
                    className={`bg-white rounded-3xl border p-3.5 shadow-xs transition-all flex items-center justify-between gap-3 cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'border-[#1a73e8] ring-1 ring-[#1a73e8] bg-[#f8fafd]'
                        : 'border-[#e0e3e7] hover:border-[#c4c7c5]'
                    }`}
                  >
                    {/* Left Icon / Thumbnail Indicator */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 font-bold text-xs transition-all ${
                          isSelected
                            ? 'bg-[#1a73e8] text-white shadow-xs'
                            : video.is_completed
                            ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                            : 'bg-[#f1f3f4] text-[#5f6368]'
                        }`}
                      >
                        {isSelected ? (
                          <Play className="w-5 h-5 fill-white text-white" />
                        ) : video.is_completed ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span>#{originalIndex + 1}</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[9px] font-bold text-[#5f6368] uppercase tracking-wider">
                            Module {originalIndex + 1}
                          </span>
                          {video.is_completed && (
                            <span className="text-[9px] font-bold text-[#137333] bg-[#e6f4ea] px-1.5 py-0.2 rounded">
                              Done
                            </span>
                          )}
                        </div>
                        <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
                          {video.title}
                        </h4>
                        <p className="text-[10px] text-[#80868b] mt-0.5">
                          Added {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Right Action / Check Button */}
                    <button
                      onClick={(e) => toggleComplete(video, e)}
                      disabled={toggleProgressMutation.isPending}
                      className={`p-2 rounded-xl shrink-0 transition-all ${
                        video.is_completed
                          ? 'text-[#137333] hover:bg-[#e6f4ea]'
                          : 'text-[#80868b] hover:text-[#1a73e8] hover:bg-[#f1f3f4]'
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
    </div>
  );
};

export default EmployeeMobileTrainingVideos;
