import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Award, HelpCircle, Users, BarChart2, ArrowLeft, Home, LogOut, Settings, BookOpen } from 'lucide-react';
import { useNavigate, useLocation, Outlet, Link } from 'react-router-dom';

const AssessmentWorkspaceLayout = () => {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (e) {
      console.error("Logout failed", e);
    }
  };

  const navItems = [
    { icon: <HelpCircle size={18} />, label: 'Department Question Bank', path: '/admin/assessments/questions' },
    { icon: <Settings size={18} />, label: 'Assessment Management', path: '/admin/assessments/management' },
    { icon: <Award size={18} />, label: 'Employee Results & Attempts', path: '/admin/assessments/results' },
    { icon: <BookOpen size={18} />, label: 'Training Videos', path: '/admin/assessments/training', heading: 'Training Modules' },
  ];

  return (
    <div className="h-[100dvh] w-full overflow-hidden bg-slate-50 flex font-sans text-slate-800 relative z-0">
      
      {/* Sidebar - Clean, Professional */}
      <aside className="w-[260px] h-screen sticky top-0 bg-white/80 backdrop-blur-md border-r border-slate-200 hidden md:flex flex-col z-20 shadow-sm shrink-0">
        <div className="h-14 flex items-center px-4 border-b border-slate-200 shrink-0">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-3 shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-900 leading-tight">Acme Assessment & Training</span>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 px-2 whitespace-nowrap">Assessment Modules</p>
          <nav className="space-y-1">
            {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path || 
                               location.pathname.startsWith(`${item.path}/`) ||
                               (item.path === '/admin/assessments/management' && (location.pathname.startsWith('/admin/assessments/create') || location.pathname.startsWith('/admin/assessments/edit') || location.pathname.startsWith('/admin/assessments/rules')));
              return (
                <React.Fragment key={idx}>
                  {item.heading && (
                    <div className="pt-4 mt-2 mb-4 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 whitespace-nowrap">{item.heading}</p>
                    </div>
                  )}
                  <Link
                    to={item.path}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <span className={`shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400'}`}>{item.icon}</span>
                    <span className="flex-1 whitespace-nowrap truncate">{item.label}</span>
                  </Link>
                </React.Fragment>
              );
            })}
          </nav>
        </div>
        
        <div className="p-4 border-t border-slate-200 mt-auto shrink-0">
          <Link
            to="/admin"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="text-slate-400 shrink-0"><ArrowLeft size={18} /></span>
            <span className="flex-1 whitespace-nowrap">Back to HRMS</span>
          </Link>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col h-[100dvh] overflow-hidden relative z-30 bg-transparent">

        {/* Top Header */}
        <header className="h-14 shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200 px-4 flex items-center justify-between sticky top-0 z-40 md:relative md:z-10">
          <div className="flex items-center gap-4">
            <div className="md:hidden flex items-center gap-2">
               <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center mr-2 shrink-0">
                 <Award className="w-5 h-5 text-white" />
               </div>
               <span className="text-base font-semibold tracking-tight text-slate-900 leading-tight">Acme Assessment & Training</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-5">
              <div
                className="flex items-center gap-3 cursor-pointer group"
                onClick={() => navigate('/admin/profile')}
              >
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm overflow-hidden border border-slate-200">
                  {profile?.avatar ? (
                    <img src={profile.avatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (profile?.email || 'A').charAt(0).toUpperCase()
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-700 leading-none group-hover:text-blue-600 transition-colors">
                    {profile?.email?.split('@')[0] || 'Administrator'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1 capitalize">{profile?.role || 'Admin'}</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <div className="flex-1 overflow-y-auto overscroll-y-contain bg-slate-50" style={{ WebkitOverflowScrolling: 'touch' }}>
          <Outlet />
        </div>
        
        {/* Mobile Bottom Nav Minimal */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-2 flex justify-around z-50">
           <Link to="/admin" className="flex flex-col items-center p-2 text-slate-500">
             <Home size={20} />
             <span className="text-[10px] mt-1">HRMS</span>
           </Link>
           {navItems.map((item, idx) => {
              const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
              return (
                <Link key={idx} to={item.path} className={`flex flex-col items-center p-2 ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                  {item.icon}
                  <span className="text-[10px] mt-1">{item.label}</span>
                </Link>
              );
           })}
        </div>
      </main>
    </div>
  );
};

export default AssessmentWorkspaceLayout;
