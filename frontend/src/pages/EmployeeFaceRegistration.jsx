import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axios';
import FastFaceScanner from '../components/FastFaceScanner';
import { Camera, CheckCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const EmployeeFaceRegistration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isScanning, setIsScanning] = useState(false);
  const [status, setStatus] = useState('idle'); // idle, scanning, success, error

  const handleFaceDetected = async (descriptor) => {
    setIsScanning(false);
    setStatus('processing');
    
    try {
      // Format descriptor array as string for pgvector '[1,2,3...]'
      const vectorString = `[${descriptor.join(',')}]`;
      
      await api.post('/employee/biometrics/face', {
        faceDescriptor: vectorString
      });

      setStatus('success');
      toast.success('Face registered successfully!');
      
      setTimeout(() => navigate('/employee'), 2000);
      
    } catch (err) {
      console.error(err);
      setStatus('error');
      toast.error('Failed to save face data.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200 bg-slate-50/50">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Camera className="text-blue-600" />
            Biometric Registration
          </h2>
          <p className="text-slate-500 mt-1">Register your face for lightning-fast logins and attendance tracking.</p>
        </div>

        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex gap-3 text-blue-800">
            <AlertCircle className="shrink-0 mt-0.5" size={20} />
            <div className="text-sm leading-relaxed">
              <strong>Privacy Notice:</strong> By clicking "Start Scanning", you consent to Acme HRMS generating a mathematical representation (vector) of your face. This data is securely stored and used exclusively for identity verification. We do not store raw photos of your face.
            </div>
          </div>

          {status === 'success' ? (
            <div className="flex flex-col items-center justify-center py-12 text-green-600">
              <CheckCircle size={64} className="mb-4" />
              <h3 className="text-xl font-bold text-slate-900">Registration Complete</h3>
              <p className="text-slate-500 mt-2">You can now use Face Login.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {!isScanning ? (
                <button
                  onClick={() => setIsScanning(true)}
                  className="bg-[#1E1B4B] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#312e81] transition-colors shadow-md"
                >
                  Start Scanning
                </button>
              ) : (
                <div className="w-full max-w-lg">
                  <FastFaceScanner 
                    isScanning={isScanning} 
                    onFaceDetected={handleFaceDetected}
                    onCancel={() => setIsScanning(false)}
                  />
                  <p className="text-center text-slate-500 text-sm mt-4">
                    Look directly at the camera. Ensure you are in a well-lit room.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeFaceRegistration;
