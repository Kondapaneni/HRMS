import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../api/axios';

const EmployeeMobileTrainingVideos = () => {
  const navigate = useNavigate();
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['employee', 'trainingVideos'],
    queryFn: async () => {
      const res = await api.get('/employee/training/videos');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-2">
      {/* Hero Section with Animated Motion Graphics */}
      <section className="-mx-4 -mt-4 px-4 pt-8 pb-12 relative overflow-hidden bg-slate-900">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, 20, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#b28dff] rounded-full mix-blend-screen filter blur-[40px] opacity-40 pointer-events-none"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            x: [0, -30, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-10 -right-10 w-64 h-64 bg-[#c5a3ff] rounded-full mix-blend-screen filter blur-[40px] opacity-40 pointer-events-none"
        />

        {/* Subtle Glass Overlay */}
        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2 text-white/90">
              <button onClick={() => navigate(-1)} className="p-1 -ml-1 hover:bg-white/10 rounded-lg">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-bold tracking-widest opacity-80 uppercase">LEARNING CENTER</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight drop-shadow-sm">Training Videos</h1>
          </div>
        </div>
      </section>

      {/* Videos List */}
      <section className="relative z-20 -mt-16 px-2">
        {videos.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-purple-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No videos assigned</h3>
            <p className="text-slate-500 text-sm mt-1">You currently have no training videos.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {videos.map(video => (
              <div key={video.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                <div className="aspect-video bg-slate-900 relative">
                  <video 
                    src={video.video_url}
                    className="w-full h-full object-cover"
                    controls
                    preload="metadata"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-2 leading-snug">
                    {video.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">
                    Added {new Date(video.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default EmployeeMobileTrainingVideos;
