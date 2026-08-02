import React, { useState, useEffect, useRef } from 'react';
import { Play, Plus, Trash2, X, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { supabase } from '../lib/supabase';

const AdminTrainingModule = () => {
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    try {
      const res = await api.get('/admin/training/videos');
      setVideos(res.data);
    } catch (err) {
      toast.error('Failed to load training videos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !videoFile) {
      toast.error('Title and video file are required');
      return;
    }

    setIsUploading(true);
    const fileName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    try {
      // 1. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training_videos')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Upload failed');
      }

      // 2. Generate proxy URL (which index.php route handles)
      const videoData = {
        title: title.trim(),
        video_url: window.location.origin + `/Training-Video/${fileName}`
      };

      // 3. Save to database
      await api.post('/admin/training/videos', videoData);

      toast.success('Video uploaded successfully!');
      setIsModalOpen(false);
      setTitle('');
      setVideoFile(null);
      fetchVideos();
    } catch (err) {
      toast.error(err.message || 'Failed to add video');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    try {
      await api.delete(`/admin/training/videos/${id}`);
      toast.success('Video deleted successfully');
      setVideos(videos.filter(v => v.id !== id));
    } catch (err) {
      toast.error('Failed to delete video');
    }
  };

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Training Module</h1>
            <p className="text-slate-500 mt-1">Manage training videos for employees</p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus size={20} />
            <span>Add Video</span>
          </button>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-800">No videos yet</h3>
            <p className="text-slate-500 mt-1 mb-6">Add your first training video to get started.</p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-medium hover:bg-indigo-100 transition-colors"
            >
              <Plus size={20} />
              Add Video
            </button>
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
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Delete Video"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
            onClick={() => !isUploading && setIsModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
              <h2 className="text-lg font-semibold text-slate-800">Add Training Video</h2>
              <button 
                onClick={() => {
                  setIsModalOpen(false);
                  setTitle('');
                  setVideoFile(null);
                }} 
                className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                disabled={isUploading}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 flex-1 overflow-y-auto bg-slate-50/30">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Video Title <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Onboarding Orientation 2026"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 outline-none transition-all text-sm"
                    disabled={isUploading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Video File (.mp4) <span className="text-rose-500">*</span></label>
                  
                  <div 
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                    className={`mt-1 flex flex-col items-center justify-center px-6 py-10 border-2 border-slate-200 border-dashed rounded-xl transition-all bg-white cursor-pointer ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:border-indigo-400 hover:bg-indigo-50/50 group'}`}
                  >
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 group-hover:bg-indigo-100/50 group-hover:text-indigo-600 transition-colors">
                      <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    </div>
                    <div className="text-sm text-slate-600 text-center mb-1">
                      <span className="font-medium text-indigo-600">
                        {videoFile ? videoFile.name : 'Click to select a file'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">MP4 format, up to 100MB</p>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/mp4,video/webm,video/ogg"
                    onChange={e => {
                      if (e.target.files && e.target.files[0]) {
                        setVideoFile(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    disabled={isUploading}
                  />
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-white">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  disabled={isUploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  onClick={handleUpload}
                  disabled={isUploading || !title || !videoFile}
                  className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
                >
                  {isUploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Uploading...
                    </>
                  ) : (
                    'Save Video'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrainingModule;
