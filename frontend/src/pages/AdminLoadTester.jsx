import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Play, Globe, Users, CheckCircle, XCircle, Clock, Zap } from 'lucide-react';
import api from '../api/axios';

const AdminLoadTester = () => {
  const [url, setUrl] = useState(window.location.origin + '/api/admin/employees');
  const [users, setUsers] = useState(50);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  const handleRunTest = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setReport(null);

    try {
      const response = await api.post('/admin/loadtest', { url, users });
      if (response.data.report) {
        setReport(response.data.report);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred while running the load test.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Activity className="text-blue-600" size={32} />
          Load Tester Dashboard
        </h1>
        <p className="text-gray-500 mt-2">
          Execute concurrent requests against endpoints to measure response times and reliability.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Zap size={20} className="text-yellow-500" />
            Test Configuration
          </h2>
          
          <form onSubmit={handleRunTest} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target URL</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Concurrent Users</label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="number"
                  min="1"
                  max="200"
                  required
                  value={users}
                  onChange={(e) => setUsers(Number(e.target.value))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Maximum 200 concurrent requests.</p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 px-4 rounded-xl font-medium transition-all shadow-md shadow-blue-500/20 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Test...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Execute Load Test
                </>
              )}
            </button>
          </form>
        </motion.div>

        {/* Results Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          {loading ? (
            <div className="h-full bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed flex flex-col items-center justify-center p-12 text-center">
              <Activity className="text-blue-500 animate-pulse mb-4" size={48} />
              <h3 className="text-xl font-medium text-gray-800 mb-2">Simulating Traffic</h3>
              <p className="text-gray-500">Firing {users} concurrent requests to your target URL...</p>
            </div>
          ) : report ? (
            <div className="grid grid-cols-2 gap-4 h-full content-start">
              <div className="col-span-2 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 text-white shadow-lg">
                <p className="text-gray-400 text-sm mb-1">Target Endpoint</p>
                <p className="font-mono text-sm truncate bg-black/30 py-2 px-3 rounded-lg border border-white/10">{report.url}</p>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Total Requests</p>
                  <p className="text-2xl font-bold text-gray-900">{report.total}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                  <CheckCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Successful (2xx/3xx)</p>
                  <p className="text-2xl font-bold text-green-600">{report.success}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                  <XCircle size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Failed / Errors</p>
                  <p className="text-2xl font-bold text-red-600">{report.failed}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Latency</p>
                  <p className="text-2xl font-bold text-gray-900">{report.avg_ms} <span className="text-sm font-normal text-gray-500">ms</span></p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Zap size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Fastest Request</p>
                  <p className="text-2xl font-bold text-gray-900">{report.min_ms} <span className="text-sm font-normal text-gray-500">ms</span></p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-orange-600">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Slowest Request</p>
                  <p className="text-2xl font-bold text-gray-900">{report.max_ms} <span className="text-sm font-normal text-gray-500">ms</span></p>
                </div>
              </div>
            </div>
          ) : (
             <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center p-12 text-center text-gray-400">
              <Globe className="mb-4 opacity-30" size={64} />
              <h3 className="text-lg font-medium text-gray-600 mb-1">Ready to Test</h3>
              <p className="text-sm">Configure your test parameters and hit execute to see the results.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminLoadTester;
