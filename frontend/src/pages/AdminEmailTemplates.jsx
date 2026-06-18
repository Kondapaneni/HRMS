import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Settings, Send, UserPlus, Info } from 'lucide-react';

const AdminEmailTemplates = () => {
  const [activeTemplate, setActiveTemplate] = useState('welcome');

  const templates = [
    {
      id: 'welcome',
      name: 'Employee Welcome',
      icon: <UserPlus size={18} />,
      description: 'Sent automatically when a new employee account is created.',
      subject: 'Welcome to Acme HRMS - Your Account Details',
      content: (
        <div className="space-y-4 text-sm text-slate-700 font-sans">
          <p>Hello <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-semibold">[Employee First Name]</span>,</p>
          <p>Your account has been created successfully.</p>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm inline-block">
            <p className="mb-2"><span className="font-semibold text-slate-500 w-20 inline-block">Email:</span> <span className="text-slate-900 font-medium">[Employee Email]</span></p>
            <p><span className="font-semibold text-slate-500 w-20 inline-block">Password:</span> <span className="text-slate-900 font-mono bg-slate-200 px-2 py-1 rounded">[Generated Password]</span></p>
          </div>

          <p>You can login here: <a href="#" className="text-blue-600 underline">[Deployed Frontend URL]</a></p>
          
          <p className="text-amber-600 bg-amber-50 p-2 rounded border border-amber-100 flex items-center gap-2 max-w-max">
            <Info size={16} />
            Please change your password after logging in.
          </p>

          <div className="pt-4 mt-6 border-t border-slate-100">
            <p className="text-slate-500">Best regards,<br/><span className="font-semibold text-slate-700">HR Team</span></p>
          </div>
        </div>
      )
    },
    {
      id: 'leave_request',
      name: 'Leave Request Status',
      icon: <Send size={18} />,
      description: 'Sent when a leave request is approved or rejected.',
      subject: 'Update on Your Leave Request',
      content: (
        <div className="space-y-4 text-sm text-slate-700 font-sans">
          <p>Hello <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded font-mono text-xs font-semibold">[Employee Name]</span>,</p>
          <p>Your recent leave request has been <span className="px-1 py-0.5 bg-green-100 text-green-800 rounded font-mono text-xs font-semibold">[Approved/Rejected]</span>.</p>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 shadow-sm inline-block">
            <p className="mb-2"><span className="font-semibold text-slate-500 w-24 inline-block">Leave Type:</span> <span className="text-slate-900">[Leave Type]</span></p>
            <p className="mb-2"><span className="font-semibold text-slate-500 w-24 inline-block">Date:</span> <span className="text-slate-900">[Start Date] to [End Date]</span></p>
            <p><span className="font-semibold text-slate-500 w-24 inline-block">Reason:</span> <span className="text-slate-900 italic">"[Manager Reason]"</span></p>
          </div>

          <p>You can view the full details in your employee dashboard.</p>

          <div className="pt-4 mt-6 border-t border-slate-100">
            <p className="text-slate-500">Best regards,<br/><span className="font-semibold text-slate-700">HR Team</span></p>
          </div>
        </div>
      )
    }
  ];

  const currentTemplate = templates.find(t => t.id === activeTemplate);

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative z-10">
      
      {/* Page Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-sm">
              <Mail size={20} />
            </div>
            Email Templates
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Preview the automated emails sent by the Acme HRMS system to employees.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
          <Settings size={16} /> Configure SMTP
        </button>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Sidebar List */}
        <div className="md:col-span-4 lg:col-span-3 space-y-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">Available Templates</h2>
          
          {templates.map((template) => (
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              key={template.id}
              onClick={() => setActiveTemplate(template.id)}
              className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
                activeTemplate === template.id 
                ? 'bg-white border-indigo-200 shadow-md shadow-indigo-100 ring-1 ring-indigo-100' 
                : 'bg-white/60 border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className={`p-2 rounded-lg mt-0.5 ${activeTemplate === template.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {template.icon}
              </div>
              <div>
                <h3 className={`font-semibold text-sm ${activeTemplate === template.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                  {template.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {template.description}
                </p>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Preview Pane */}
        <div className="md:col-span-8 lg:col-span-9 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
          
          {/* Email Client Mockup Header */}
          <div className="bg-slate-50 border-b border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-rose-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
              <span className="ml-2 text-xs font-medium text-slate-400 uppercase tracking-widest">Live Preview</span>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <span className="w-16 font-medium text-slate-500">From:</span>
                <span className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-700 font-medium">Acme HRMS &lt;no-reply@acme.com&gt;</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-16 font-medium text-slate-500">To:</span>
                <span className="text-slate-600">[Employee Email]</span>
              </div>
              <div className="flex items-center text-sm">
                <span className="w-16 font-medium text-slate-500">Subject:</span>
                <span className="text-slate-900 font-semibold">{currentTemplate?.subject}</span>
              </div>
            </div>
          </div>

          {/* Email Body */}
          <div className="flex-1 p-8 bg-white overflow-y-auto">
            <motion.div 
              key={currentTemplate?.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl"
            >
              {currentTemplate?.content}
            </motion.div>
          </div>
          
        </div>

      </div>
    </div>
  );
};

export default AdminEmailTemplates;
