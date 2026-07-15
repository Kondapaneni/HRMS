import React from 'react';
import { ArrowLeft, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const EmployeeMobileBirthdays = () => {
  const navigate = useNavigate();

  // Mockup data for birthdays
  const birthdays = [
    { id: 1, name: 'Jane Smith', date: 'Aug 20', initials: 'JS', dept: 'Marketing', color: 'bg-purple-100', textColor: 'text-purple-600' },
    { id: 2, name: 'Mike Johnson', date: 'Sep 05', initials: 'MJ', dept: 'Engineering', color: 'bg-blue-100', textColor: 'text-blue-600' },
    { id: 3, name: 'Alice Williams', date: 'Oct 12', initials: 'AW', dept: 'Design', color: 'bg-rose-100', textColor: 'text-rose-600' },
    { id: 4, name: 'Robert Chen', date: 'Nov 01', initials: 'RC', dept: 'Sales', color: 'bg-amber-100', textColor: 'text-amber-600' }
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
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-sm mb-0.5">Birthdays</h1>
            <p className="text-sm font-medium text-slate-100 drop-shadow-sm opacity-90">Team celebrations</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 backdrop-blur-md shadow-sm">
            <Gift className="w-6 h-6 text-white" />
          </div>
        </div>
      </div>

      {/* Main Content Card overlapping header */}
      <div className="bg-white rounded-[24px] shadow-lg p-5 -mt-12 relative z-20 mx-4 border border-slate-100/50 min-h-[300px]">
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight mb-2">Upcoming Birthdays</h2>
          
          <div className="space-y-3">
            {birthdays.map(birthday => (
              <div key={birthday.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 border border-slate-100 transition-colors shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${birthday.color} flex items-center justify-center ${birthday.textColor} font-bold shadow-sm border border-white`}>
                    {birthday.initials}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{birthday.name}</h4>
                    <p className="text-[10px] uppercase font-bold text-slate-400">{birthday.dept}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{birthday.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeMobileBirthdays;
