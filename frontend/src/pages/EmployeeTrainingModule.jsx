import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Play } from 'lucide-react';
import api from '../api/axios';

const EmployeeTrainingModule = () => {
  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['employee', 'trainingVideos'],
    queryFn: async () => {
      const res = await api.get('/employee/training/videos');
      return res.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-slate-50 overflow-y-auto">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Training Videos</h1>
          <p className="text-slate-500 mt-1">Watch the training videos assigned to you</p>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800">No videos assigned</h3>
            <p className="text-slate-500 mt-1">You currently have no training videos assigned to you.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map(video => (
              <div key={video.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden group">
                <div className="aspect-video bg-slate-900 relative">
                  <video 
                    src={video.video_url}
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                    controls
                    preload="metadata"
                  />
                </div>
                <div className="p-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-800 line-clamp-1" title={video.title}>
                      {video.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Added {new Date(video.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeTrainingModule;
