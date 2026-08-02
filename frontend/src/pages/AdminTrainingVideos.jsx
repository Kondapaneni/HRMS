import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Plus, Trash2, X, Upload, Users, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { supabase } from '../lib/supabase';

const AdminTrainingVideos = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [title, setTitle] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedVideoForAssign, setSelectedVideoForAssign] = useState(null);
  const [assignSearchQuery, setAssignSearchQuery] = useState('');
  const [modalAssignedEmployees, setModalAssignedEmployees] = useState([]);
  
  const fileInputRef = useRef(null);

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['admin', 'trainingVideos'],
    queryFn: async () => {
      const res = await api.get('/admin/training/videos');
      return res.data;
    }
  });

  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ['admin', 'employeesList'],
    queryFn: async () => {
      const res = await api.get('/admin/employees?limit=1000');
      return res.data?.employees || [];
    },
    staleTime: 5 * 60 * 1000
  });

  const addVideoMutation = useMutation({
    mutationFn: async (videoData) => {
      await api.post('/admin/training/videos', videoData);
    },
    onSuccess: () => {
      toast.success('Video uploaded successfully!');
      setIsModalOpen(false);
      setTitle('');
      setVideoFile(null);
      setVideoFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to add video');
    },
    onSettled: () => {
      setIsUploading(false);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await api.delete(`/admin/training/videos/${id}`);
    },
    onSuccess: () => {
      toast.success('Video deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
    },
    onError: (err) => {
      toast.error('Failed to delete video');
    }
  });

  const assignVideoMutation = useMutation({
    mutationFn: async ({ id, assigned_employee_ids }) => {
      await api.put(`/admin/training/videos/${id}/assign`, { assigned_employee_ids });
    },
    onSuccess: () => {
      toast.success('Employees assigned successfully');
      setIsAssignModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['admin', 'trainingVideos'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.error || 'Failed to assign employees');
    }
  });

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!title.trim() || !videoFile) {
      toast.error('Title and video file are required');
      return;
    }

    setIsUploading(true);
    const fileName = `${Date.now()}_${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    
    try {
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('training_videos')
        .upload(fileName, videoFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(uploadError.message || 'Upload failed');
      }

        await addVideoMutation.mutateAsync({
          title: title.trim(),
          video_url: window.location.origin + `/Training-Video/${fileName}`
        });
    } catch (err) {
      toast.error(err.message || 'Failed to add video');
      setIsUploading(false);
    }
  };

  const handleDelete = (id) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    deleteMutation.mutate(id);
  };

  if (videosLoading) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Training Videos</h1>
          <p className="text-sm text-slate-500 mt-1">Manage training videos for employees</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Video
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedVideoForAssign(video);
                        setModalAssignedEmployees(video.assigned_employee_ids || []);
                        setAssignSearchQuery('');
                        setIsAssignModalOpen(true);
                      }}
                      className="text-slate-400 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="Assign Employees"
                    >
                      <Users size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(video.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Video"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
                  
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-slate-100 bg-white">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                  }}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
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

      {isAssignModalOpen && selectedVideoForAssign && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div 
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
            onClick={() => setIsAssignModalOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
            <div className="px-6 py-5 border-b border-slate-100 flex flex-col gap-4 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-800">Assign Employees</h2>
                <button 
                  onClick={() => setIsAssignModalOpen(false)} 
                  className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={assignSearchQuery}
                  onChange={(e) => setAssignSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
              <div className="space-y-1">
                {employeesLoading ? (
                  <p className="text-sm text-slate-500 p-2 text-center">Loading employees...</p>
                ) : (
                  (() => {
                    const filteredEmployees = employees.filter(emp => {
                      const name = `${emp.firstName} ${emp.lastName}`.toLowerCase();
                      return name.includes(assignSearchQuery.toLowerCase());
                    });
                    
                    if (filteredEmployees.length === 0) {
                      return <p className="text-sm text-slate-500 p-2 text-center">No employees found.</p>;
                    }
                    
                    return filteredEmployees.map(emp => (
                      <label key={emp.id} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-indigo-300 transition-colors shadow-sm">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                          checked={modalAssignedEmployees.includes(emp.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setModalAssignedEmployees(prev => [...prev, emp.id]);
                            } else {
                              setModalAssignedEmployees(prev => prev.filter(id => id !== emp.id));
                            }
                          }}
                        />
                        <span className="text-sm font-medium text-slate-700">{emp.firstName} {emp.lastName}</span>
                      </label>
                    ));
                  })()
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-white">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    assignVideoMutation.mutate({
                      id: selectedVideoForAssign.id,
                      assigned_employee_ids: modalAssignedEmployees
                    });
                  }}
                  disabled={assignVideoMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center justify-center min-w-[120px]"
                >
                  {assignVideoMutation.isPending ? 'Saving...' : 'Save Assignments'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrainingVideos;
