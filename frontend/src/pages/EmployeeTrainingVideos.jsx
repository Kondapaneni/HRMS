import { useMobileViewport } from '../performance/useMobileViewport.js';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRemoteData, useRemoteTask, useRefreshControl } from '../state/remote.js';
import { motion } from 'framer-motion';
import SearchBar from '../components/ui/SearchBar';
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

const EmployeeTrainingVideosDesktop = () => {
  const refreshControl = useRefreshControl();
  const [selectedVideoId, setSelectedVideoId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'completed' | 'pending'
  const [viewMode, setViewMode] = useState('theater'); // 'theater' | 'grid'
  const [confirmingVideo, setConfirmingVideo] = useState(null);
  const videoPlayerRef = useRef(null);

  const { data: videos = [], isLoading } = useRemoteData({
    scope: ['employee', 'trainingVideos'],
    load: async () => {
      const res = await api.get('/employee/training/videos');
      return res.data;
    }
  });

  const toggleProgressMutation = useRemoteTask({
    run: async ({ videoId, completed }) => {
      const res = await api.post('/employee/training/progress', {
        video_id: videoId,
        completed
      });
      return res.data;
    },
    onMutate: async ({ videoId, completed }) => {
      await refreshControl.cancel({ scope: ['employee', 'trainingVideos'] });
      const previousVideos = refreshControl.peek(['employee', 'trainingVideos']);
      refreshControl.update(['employee', 'trainingVideos'], (old = []) => {
        return old.map(v => v.id === videoId ? { ...v, is_completed: completed } : v);
      });
      return { previousVideos };
    },
    onError: (err, variables, context) => {
      if (context?.previousVideos) {
        refreshControl.update(['employee', 'trainingVideos'], context.previousVideos);
      }
      toast.error(err.response?.data?.error || 'Failed to update progress');
    },
    onSuccess: (data) => {
      if (data.completed) {
        toast.success('Module marked as completed!');
      } else {
        toast('Marked as uncompleted', { icon: '↩️' });
      }
      refreshControl.refresh({ scope: ['employee', 'trainingVideos'] });
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
      

      {/* Desktop Experience */}
      <div className="space-y-6 pb-12 antialiased">
        
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[12px] font-medium text-[var(--muted)]">Learning &amp; development</span>
            </div>
            <h1 className="text-[24px] font-medium text-[var(--text)] tracking-[-0.01em] flex items-center gap-2">
              <span>Training videos &amp; modules</span>
              <span className="text-[12px] font-medium text-[var(--brand-deep)] bg-[var(--brand-tint)] px-2.5 py-0.5 rounded-[9px]">
                {videos.length} Modules
              </span>
            </h1>
            <p className="text-[13px] text-[var(--muted)] mt-1">
              Watch assigned training modules, orientation courses, and company learning materials.
            </p>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1.5 bg-[var(--surface)] border border-[var(--line)] p-1.5 rounded-full self-start sm:self-auto">
            <button
              onClick={() => setViewMode('theater')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'theater'
                  ? 'bg-[var(--ink)] text-white shadow-none'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]'
              }`}
              title="Theater View"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>Player</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-[var(--ink)] text-white shadow-none'
                  : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface-alt)]'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
            </button>
          </div>
        </div>

        {/* Overview & Progress Metric Cards */}
        {videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Total Assigned */}
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Total Assigned</p>
                <h3 className="text-2xl font-bold text-[var(--text)] mt-0.5">{videos.length} Modules</h3>
                <p className="text-[11px] text-[var(--muted)] mt-1">Full curriculum required</p>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                <BookOpen className="w-6 h-6" />
              </div>
            </div>

            {/* Completed Modules */}
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Completed</p>
                <h3 className="text-2xl font-bold text-[#1F9D55] mt-0.5">{completedCount} Modules</h3>
                <p className="text-[11px] text-[var(--muted)] mt-1">{progressPercent}% completion rate</p>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#E6F6EC] text-[#1F9D55]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>

            {/* Pending to Watch */}
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-[var(--muted)]">Pending Modules</p>
                <h3 className="text-2xl font-bold text-[#B7791F] mt-0.5">{videos.length - completedCount} Modules</h3>
                <p className="text-[11px] text-[var(--muted)] mt-1">Remaining to watch</p>
              </div>
              <div className="p-3.5 rounded-[14px] bg-[#FDF3DC] text-[#B7791F]">
                <Clock className="w-6 h-6" />
              </div>
            </div>
          </div>
        )}

        {videos.length === 0 ? (
          /* Empty State */
          <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-16 text-center space-y-4">
            <div className="w-20 h-20 bg-[#FDE8EA] rounded-[24px] flex items-center justify-center mx-auto text-[#D64550]">
              <Film className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-[var(--text)]">No Training Videos Assigned</h3>
              <p className="text-sm text-[var(--muted)] max-w-md mx-auto">
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
                <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden space-y-4">
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
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                            Module {activeIndex + 1} of {videos.length}
                          </span>
                          {activeVideo.is_completed && (
                            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-[#E6F6EC] text-[#1F9D55] flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Completed
                            </span>
                          )}
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text)]">
                          {activeVideo.title}
                        </h2>
                        <p className="text-xs text-[var(--muted)] flex items-center gap-1.5 pt-0.5">
                          <Clock className="w-3.5 h-3.5 text-[var(--muted)]" />
                          Uploaded on {new Date(activeVideo.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Interactive Bottom Bar */}
                    <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
                      {/* Prev Module */}
                      <button
                        onClick={handlePrevVideo}
                        disabled={activeIndex === 0}
                        className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full text-xs font-semibold transition-all ${
                          activeIndex === 0
                            ? 'opacity-40 cursor-not-allowed text-[var(--muted)]'
                            : 'bg-[var(--surface-alt)] text-[var(--text)] hover:bg-[var(--line)] active:scale-95'
                        }`}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        <span>Previous</span>
                      </button>

                      {/* Complete Toggle */}
                      <button
                        onClick={(e) => triggerToggleComplete(activeVideo, e)}
                        disabled={toggleProgressMutation.isPending}
                        className={`flex items-center gap-2 py-2 px-5 rounded-full text-xs font-semibold transition-all active:scale-95 cursor-pointer ${
                          activeVideo.is_completed
                            ? 'bg-[#E6F6EC] text-[#1F9D55] hover:bg-[#d5eedc]'
                            : 'bg-[var(--ink)] text-white hover:bg-[var(--ink-2)]'
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
                        className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full text-xs font-semibold transition-all ${
                          activeIndex === videos.length - 1
                            ? 'opacity-40 cursor-not-allowed text-[var(--muted)]'
                            : 'bg-[var(--surface-alt)] text-[var(--text)] hover:bg-[var(--line)] active:scale-95'
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
              <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-5 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
                      Curriculum Playlist
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      {completedCount} of {videos.length} Completed
                    </p>
                  </div>
                  <div className="w-24 h-2 rounded-full bg-[var(--surface-alt)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--brand)]"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Search Bar */}
                <SearchBar
                  placeholder="Search video modules..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClear={() => setSearchQuery('')}
                />

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  <button
                    onClick={() => setActiveFilter('all')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeFilter === 'all'
                        ? 'bg-[var(--ink)] text-white'
                        : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:bg-[var(--line)]'
                    }`}
                  >
                    All ({videos.length})
                  </button>
                  <button
                    onClick={() => setActiveFilter('pending')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeFilter === 'pending'
                        ? 'bg-[#B7791F] text-white'
                        : 'bg-[#FDF3DC] text-[#B7791F] hover:bg-[#feeec3]'
                    }`}
                  >
                    To Watch ({videos.length - completedCount})
                  </button>
                  <button
                    onClick={() => setActiveFilter('completed')}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      activeFilter === 'completed'
                        ? 'bg-[#1F9D55] text-white'
                        : 'bg-[#E6F6EC] text-[#1F9D55] hover:bg-[#d5eedc]'
                    }`}
                  >
                    Completed ({completedCount})
                  </button>
                </div>

                {/* Playlist Items */}
                <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                  {filteredVideos.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[var(--muted)]">
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
                          className={`rounded-[18px] border p-3 transition-all flex items-center justify-between gap-3 cursor-pointer ${
                            isSelected
                              ? 'border-[var(--brand)] bg-[var(--brand-tint)]/50'
                              : 'border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-alt)]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              className={`w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 font-bold text-xs ${
                                isSelected
                                  ? 'bg-[var(--ink)] text-white'
                                  : video.is_completed
                                  ? 'bg-[#E6F6EC] text-[#1F9D55]'
                                  : 'bg-[var(--surface-alt)] text-[var(--muted)]'
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
                                <span className="text-[10px] font-bold text-[var(--muted)] uppercase">
                                  Module {originalIndex + 1}
                                </span>
                                {video.is_completed && (
                                  <span className="text-[9px] font-bold text-[#1F9D55] bg-[#E6F6EC] px-1.5 rounded">
                                    Done
                                  </span>
                                )}
                              </div>
                              <h4 className={`text-xs font-semibold truncate ${isSelected ? 'text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                                {video.title}
                              </h4>
                            </div>
                          </div>

                          <button
                            onClick={(e) => triggerToggleComplete(video, e)}
                            disabled={toggleProgressMutation.isPending}
                            className={`p-1.5 rounded-full shrink-0 transition-all cursor-pointer ${
                              video.is_completed
                                ? 'text-[#1F9D55] hover:bg-[#E6F6EC]'
                                : 'text-[var(--muted)] hover:text-[var(--brand-deep)] hover:bg-[var(--surface-alt)]'
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
            <div className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <SearchBar
                placeholder="Search training modules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery('')}
                wrapperClassName="w-full sm:w-80"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilter === 'all'
                      ? 'bg-[var(--ink)] text-white'
                      : 'bg-[var(--surface-alt)] text-[var(--muted)] hover:bg-[var(--line)]'
                  }`}
                >
                  All ({videos.length})
                </button>
                <button
                  onClick={() => setActiveFilter('pending')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilter === 'pending'
                      ? 'bg-[#B7791F] text-white'
                      : 'bg-[#FDF3DC] text-[#B7791F] hover:bg-[#feeec3]'
                  }`}
                >
                  To Watch ({videos.length - completedCount})
                </button>
                <button
                  onClick={() => setActiveFilter('completed')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    activeFilter === 'completed'
                      ? 'bg-[#1F9D55] text-white'
                      : 'bg-[#E6F6EC] text-[#1F9D55] hover:bg-[#d5eedc]'
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
                    className="bg-[var(--surface)] rounded-[24px] border border-[var(--line)] overflow-hidden transition-all flex flex-col group"
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
                          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[var(--brand-tint)] text-[var(--brand-deep)]">
                            Module {originalIndex + 1}
                          </span>
                          {video.is_completed && (
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E6F6EC] text-[#1F9D55] flex items-center gap-1">
                              <Check className="w-3 h-3" /> Completed
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm text-[var(--text)] line-clamp-2" title={video.title}>
                          {video.title}
                        </h3>
                        <p className="text-xs text-[var(--muted)] mt-1">
                          Added {new Date(video.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-3 border-t border-[var(--line)]">
                        <button
                          onClick={() => handleSelectVideo(video)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-[var(--ink)] hover:bg-[var(--ink-2)] text-white text-xs font-semibold transition-all"
                        >
                          <Tv className="w-3.5 h-3.5" />
                          <span>Open in Player</span>
                        </button>
                        <button
                          onClick={(e) => triggerToggleComplete(video, e)}
                          disabled={toggleProgressMutation.isPending}
                          className={`p-2 rounded-full border transition-all cursor-pointer ${
                            video.is_completed
                              ? 'bg-[#E6F6EC] text-[#1F9D55] border-[#E6F6EC]'
                              : 'bg-[var(--surface-alt)] text-[var(--muted)] border-[var(--line)] hover:bg-[var(--line)]'
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
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[var(--surface)] text-[var(--text)] rounded-[24px] border border-[var(--line)] shadow-2xl w-full max-w-sm overflow-hidden p-6 space-y-4 text-center antialiased"
          >
            {/* Top Icon Badge */}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
              confirmingVideo.is_completed
                ? 'bg-[#FDF3DC] text-[#B7791F]'
                : 'bg-[#E6F6EC] text-[#1F9D55]'
            }`}>
              {confirmingVideo.is_completed ? (
                <RotateCcw className="w-7 h-7" />
              ) : (
                <CheckCircle2 className="w-7 h-7" />
              )}
            </div>

            {/* Content */}
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-[var(--text)]">
                {confirmingVideo.is_completed ? 'Mark as Incomplete?' : 'Mark Module as Completed?'}
              </h3>
              <p className="text-xs text-[var(--muted)] line-clamp-2 px-2 font-medium">
                "{confirmingVideo.title}"
              </p>
              <p className="text-[11px] text-[var(--muted)]">
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
                className="w-full py-2.5 rounded-full border border-[var(--line)] bg-[var(--surface-alt)] hover:bg-[var(--line)] text-[var(--text)] text-xs font-semibold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggle}
                disabled={toggleProgressMutation.isPending}
                className={`w-full py-2.5 rounded-full text-white text-xs font-semibold transition-all cursor-pointer ${
                  confirmingVideo.is_completed
                    ? 'bg-[#D64550] hover:bg-[#c03c46]'
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
    </>
  );
};

const EmployeeTrainingVideos = () => {
  const mobile = useMobileViewport();
  return mobile ? <EmployeeMobileTrainingVideos /> : <EmployeeTrainingVideosDesktop />;
};

export default EmployeeTrainingVideos;
