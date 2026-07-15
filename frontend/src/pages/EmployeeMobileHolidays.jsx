import React from 'react';
import { ArrowLeft, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const EmployeeMobileHolidays = () => {
  const navigate = useNavigate();

  // Mockup data for holidays
  const holidays = [
    { id: 1, date: 'Aug 15', name: 'Independence Day', day: 'Thursday', color: 'bg-emerald-100/50', textColor: 'text-emerald-600' },
    { id: 2, date: 'Oct 02', name: 'Gandhi Jayanti', day: 'Wednesday', color: 'bg-emerald-100/50', textColor: 'text-emerald-600' },
    { id: 3, date: 'Oct 31', name: 'Diwali', day: 'Thursday', color: 'bg-orange-100/50', textColor: 'text-orange-600' },
    { id: 4, date: 'Dec 25', name: 'Christmas', day: 'Wednesday', color: 'bg-red-100/50', textColor: 'text-red-600' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 md:hidden pb-safe">
      {/* Header */}
      <div className="bg-slate-900 pt-12 pb-16 px-4 relative overflow-hidden">
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-20 -left-10 w-72 h-72 bg-[#ff928b] rounded-full mix-blend-screen filter blur-[40px] opacity-60 pointer-events-none"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, 30, 0], y: [0, -40, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-0 left-20 w-80 h-80 bg-[#84dcc6] rounded-full mix-blend-screen filter blur-[50px] opacity-50 pointer-events-none"
        />

        <div className="absolute inset-0 bg-white/10 backdrop-blur-[2px] pointer-events-none"></div>

        <div className="relative z-10 px-2 flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <button onClick={() => navigate('/employee')} className="text-white/80 active:text-white transition-colors p-1 -ml-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Company Calendar</p>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm mb-0.5">Holidays</h1>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md shadow-sm">
            <Calendar className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Main Content Card overlapping header */}
      <div className="bg-white rounded-[24px] shadow-lg p-5 -mt-12 relative z-20 mx-4 border border-slate-100/50 min-h-[300px]">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">Upcoming Holidays</h2>

          <div className="space-y-3">
            {holidays.map(holiday => (
              <div key={holiday.id} className="flex items-center p-4 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors shadow-sm">
                <div className={`w-14 h-14 ${holiday.color} rounded-xl flex items-center justify-center ${holiday.textColor} font-bold text-base shrink-0 shadow-sm border border-white`}>
                  {holiday.date}
                </div>
                <div className="ml-4">
                  <h4 className="font-bold text-slate-800 text-base">{holiday.name}</h4>
                  <p className="text-sm font-medium text-slate-500">{holiday.day}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeMobileHolidays;
