import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Play, 
  CheckCircle2, 
  Circle, 
  Search, 
  Clock, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  LayoutGrid,
  Tv,
  Film,
  BookOpen,
  RotateCcw
} from 'lucide-react';
import api from '../api/axios';
import EmployeeMobileTrainingVideos from './EmployeeMobileTrainingVideos';
import PageLoader from '../components/PageLoader';
import toast from 'react-hot-toast';

const EmployeeTrainingVideos = () => {
  const queryClient = useQueryClient();
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [viewMode, setViewMode] = useState('theater'); // 'theater' | 'grid'
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
    setViewMode('theater');
  };

  const handleNextVideo = () => {
    if (activeIndex >= 0 && activeIndex < videos.length - 1) {
      handleSelectVideo(videos[activeIndex + 1]);
    }
  };

  const handlePrevVideo = () => {
    if (activeIndex > 0) {
      handleSelectVideo(videos[activeIndex - 1]);
    }
  };

  if (isLoading) {
    return <PageLoader message="Loading Training Videos..." />;
  }

  return (
    <>
      {/* Mobile Experience */}
      <div className="md:hidden">
        <EmployeeMobileTrainingVideos />
      </div>

      {/* Desktop Experience */}
      <div className="hidden md:block w-full space-y-6">
        {/* Header Section with Google Workspace Accent */}
        <div className="bg-white rounded-3xl border border-[#e0e3e7] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4285F4]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#EA4335]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#FBBC05]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#34A853]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#5f6368] ml-1">
                Learning & Development
              </span>
            </div>
            <h1 className="text-2xl font-bold text-[#1f1f1f] tracking-tight">
              Training Videos & Modules
            </h1>
            <p className="text-xs text-[#5f6368]">
              Watch assigned training modules, orientation courses, and company learning materials.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-[#f1f3f4] p-1 rounded-2xl border border-[#e0e3e7]">
              <button
                onClick={() => setViewMode('theater')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  viewMode === 'theater'
                    ? 'bg-white text-[#1a73e8] shadow-xs'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
                title="Theater View"
              >
                <Tv className="w-3.5 h-3.5" />
                <span>Player</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#1a73e8] shadow-xs'
                    : 'text-[#5f6368] hover:text-[#1f1f1f]'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>

        {/* Overview & Progress Metric Cards */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Assigned */}
            <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#5f6368]">Total Assigned</p>
                <h3 className="text-2xl font-bold text-[#1f1f1f] mt-0.5">{videos.length} Modules</h3>
                <p className="text-[11px] text-[#80868b] mt-1">Full curriculum required</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* Completed Modules */}
            <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#5f6368]">Completed</p>
                <h3 className="text-2xl font-bold text-[#137333] mt-0.5">{completedCount} Modules</h3>
                <p className="text-[11px] text-[#80868b] mt-1">{progressPercent}% completion rate</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#e6f4ea] text-[#137333] border border-[#ceead6]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Pending to Watch */}
            <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[#5f6368]">Pending Modules</p>
                <h3 className="text-2xl font-bold text-[#b06000] mt-0.5">{videos.length - completedCount} Modules</h3>
                <p className="text-[11px] text-[#80868b] mt-1">Remaining to watch</p>
              </div>
              <div className="p-3.5 rounded-2xl bg-[#fef7e0] text-[#b06000] border border-[#feefc3]">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {videos.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-[#e0e3e7] p-16 text-center shadow-xs space-y-4">
            <div className="w-20 h-20 bg-[#fce8e6] border border-[#fad2cf] rounded-3xl flex items-center justify-center mx-auto text-[#d93025]">
              <Film className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[#1f1f1f]">No Training Videos Assigned</h3>
              <p className="text-sm text-[#5f6368] max-w-md mx-auto">
                You currently have no training videos assigned to your profile. Check back later or reach out to your HR administrator.
              </p>
            </div>
          </div>
        ) : viewMode === 'theater' ? (
          /* Theater Split View */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Main Player (7 Cols) */}
            <div className="lg:col-span-7 space-y-4">
              {activeVideo ? (
                <div className="bg-white rounded-3xl border border-[#e0e3e7] overflow-hidden shadow-xs space-y-4">
                  {/* Video Player Container */}
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

                  {/* Player Details & Actions */}
                  <div className="p-6 pt-2 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                            Module {activeIndex + 1} of {videos.length}
                          </span>
                          {activeVideo.is_completed && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Completed
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-bold text-[#1f1f1f]">
                          {activeVideo.title}
                        </h2>
                        <p className="text-xs text-[#5f6368] flex items-center gap-1.5 pt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[#80868b]" />
                          Uploaded on {new Date(activeVideo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Bottom Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#e0e3e7]">
                      {/* Prev Module */}
                      <button
                        onClick={handlePrevVideo}
                        disabled={activeIndex === 0}
                        className={`flex items-center gap-1.5 py-2 px-3.5 rounded-2xl text-xs font-semibold transition-all ${
                          activeIndex === 0
                            ? 'opacity-40 cursor-not-allowed text-[#80868b]'
                            : 'bg-[#f1f3f4] text-[#1f1f1f] hover:bg-[#e3e3e3] active:scale-95'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      {/* Complete Toggle */}
                      <button
                        onClick={(e) => triggerToggleComplete(activeVideo, e)}
                        disabled={toggleProgressMutation.isPending}
                        className={`flex items-center gap-2 py-2 px-5 rounded-2xl text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                          activeVideo.is_completed
                            ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                            : 'bg-[#1a73e8] text-white hover:bg-[#1557b0] shadow-xs'
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

                      {/* Next Module */}
                      <button
                        onClick={handleNextVideo}
                        disabled={activeIndex === videos.length - 1}
                        className={`flex items-center gap-1.5 py-2 px-3.5 rounded-2xl text-xs font-semibold transition-all ${
                          activeIndex === videos.length - 1
                            ? 'opacity-40 cursor-not-allowed text-[#80868b]'
                            : 'bg-[#f1f3f4] text-[#1f1f1f] hover:bg-[#e3e3e3] active:scale-95'
                        }`}
                      >
                        <span>Next</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Right Playlist Sidebar (5 Cols) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-3xl border border-[#e0e3e7] p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-[#1f1f1f] uppercase tracking-wider">
                      Curriculum Playlist
                    </h3>
                    <p className="text-xs text-[#5f6368]">
                      {completedCount} of {videos.length} Completed
                    </p>
                  </div>
                  <div className="w-24 h-2 rounded-full bg-[#f1f3f4] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#4285F4] to-[#34A853]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search video modules..."
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
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeFilter === 'all'
                        ? 'bg-[#1a73e8] text-white'
                        : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e3e3e3]'
                    }`}
                  >
                    All ({videos.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('pending')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeFilter === 'pending'
                        ? 'bg-[#b06000] text-white'
                        : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3] hover:bg-[#feeec3]'
                    }`}
                  >
                    To Watch ({videos.length - completedCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('completed')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeFilter === 'completed'
                        ? 'bg-[#137333] text-white'
                        : 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>

                {/* Playlist Items */}
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredVideos.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#5f6368]">
                      No modules matched your search.
                    </div>
                  ) : (
                    filteredVideos.map((video) => {
                      const isSelected = activeVideo?.id === video.id;
                      const originalIndex = videos.findIndex(v => v.id === video.id);

                      return (
                        <div
                          key={video.id}
                          onClick={() => handleSelectVideo(video)}
                          className={`rounded-2xl border p-3 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'border-[#1a73e8] bg-[#e8f0fe]/60 shadow-xs'
                              : 'border-[#e0e3e7] bg-white hover:border-[#c4c7c5] hover:bg-[#f8fafd]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs ${
                                isSelected
                                  ? 'bg-[#1a73e8] text-white shadow-xs'
                                  : video.is_completed
                                  ? 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6]'
                                  : 'bg-[#f1f3f4] text-[#5f6368]'
                              }`}
                            >
                              {isSelected ? (
                                <Play className="w-4 h-4 fill-white" />
                              ) : video.is_completed ? (
                                <CheckCircle2 className="w-4 h-4" />
                              ) : (
                                <span>#{originalIndex + 1}</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-[#5f6368] uppercase">
                                  Module {originalIndex + 1}
                                </span>
                                {video.is_completed && (
                                  <span className="text-[9px] font-bold text-[#137333] bg-[#e6f4ea] px-1.5 rounded">
                                    Done
                                  </span>
                                )}
                              </div>
                              <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-[#1a73e8]' : 'text-[#1f1f1f]'}`}>
                                {video.title}
                              </h4>
                            </div>
                          </div>

                          <button
                            onClick={(e) => triggerToggleComplete(video, e)}
                            disabled={toggleProgressMutation.isPending}
                            className={`p-1.5 rounded-lg shrink-0 transition-all cursor-pointer ${
                              video.is_completed
                                ? 'text-[#137333] hover:bg-[#e6f4ea]'
                                : 'text-[#80868b] hover:text-[#1a73e8] hover:bg-[#f1f3f4]'
                            }`}
                            title={video.is_completed ? 'Mark uncompleted' : 'Mark completed'}
                          >
                            {video.is_completed ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <Circle className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Grid View */
          <div className="space-y-4">
            {/* Search & Filter Bar for Grid */}
            <div className="bg-white rounded-3xl border border-[#e0e3e7] p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search training modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-[#f8fafd] border border-[#e0e3e7] rounded-2xl text-xs text-[#1f1f1f] placeholder-[#80868b] focus:outline-none focus:border-[#1a73e8] focus:bg-white transition-all"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilter === 'all'
                      ? 'bg-[#1a73e8] text-white'
                      : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e3e3e3]'
                  }`}
                >
                  All ({videos.length})
                </button>
                <button
                  onClick={() => setActiveFilter('pending')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilter === 'pending'
                      ? 'bg-[#b06000] text-white'
                      : 'bg-[#fef7e0] text-[#b06000] border border-[#feefc3] hover:bg-[#feeec3]'
                  }`}
                >
                  To Watch ({videos.length - completedCount})
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilter === 'completed'
                      ? 'bg-[#137333] text-white'
                      : 'bg-[#e6f4ea] text-[#137333] border border-[#ceead6] hover:bg-[#d5eedc]'
                  }`}
                >
                  Completed ({completedCount})
                </button>
              </div>
            </div>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredVideos.map((video) => {
                const originalIndex = videos.findIndex(v => v.id === video.id);

                return (
                  <div
                    key={video.id}
                    className="bg-white rounded-3xl border border-[#e0e3e7] overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group"
                  >
                    <div className="w-full h-48 sm:h-52 bg-slate-950 relative overflow-hidden flex items-center justify-center">
                      <video
                        src={video.video_url}
                        className="w-full h-full object-contain max-h-full opacity-90 group-hover:opacity-100 transition-opacity"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc]">
                            Module {originalIndex + 1}
                          </span>
                          {video.is_completed && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#e6f4ea] text-[#137333] border border-[#ceead6] flex items-center gap-1">
                              <Check className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-[#1f1f1f] line-clamp-2" title={video.title}>
                          {video.title}
                        </h3>
                        <p className="text-xs text-[#5f6368] mt-1">
                          Added {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-[#e0e3e7]">
                        <button
                          onClick={() => handleSelectVideo(video)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-2xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold transition-all"
                        >
                          <Tv className="w-3.5 h-3.5" />
                          <span>Open in Player</span>
                        </button>
                        <button
                          onClick={(e) => triggerToggleComplete(video, e)}
                          disabled={toggleProgressMutation.isPending}
                          className={`p-2 rounded-2xl border transition-all cursor-pointer ${
                            video.is_completed
                              ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                              : 'bg-[#f1f3f4] text-[#5f6368] border-[#dadce0] hover:bg-[#e3e3e3]'
                          }`}
                          title={video.is_completed ? 'Mark uncompleted' : 'Mark completed'}
                        >
                          {video.is_completed ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
                className="w-full py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={toggleProgressMutation.isPending}
                className={`w-full py-2.5 rounded-full text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
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
    </>
  );
};

export default EmployeeTrainingVideos;
