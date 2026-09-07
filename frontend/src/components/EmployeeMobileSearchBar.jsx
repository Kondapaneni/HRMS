import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  X, 
  ChevronRight, 
  Clock, 
  Calendar, 
  Wallet, 
  Receipt, 
  Sparkles, 
  User, 
  Cake, 
  Briefcase, 
  ShoppingBag, 
  Building2, 
  Play,
  Fingerprint
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const EmployeeMobileSearchBar = ({ placeholder = "Search your pages, leaves, payslips, attendance..." }) => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const emp = profile || user;
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  const searchablePages = useMemo(() => {
    const items = [
      {
        id: 'attendance-punch',
        title: 'Punch In / Punch Out',
        subtitle: 'Mark today’s biometric attendance & GPS location',
        category: 'Attendance',
        path: '/employee',
        icon: Fingerprint,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['punch', 'check in', 'check out', 'attendance', 'mark attendance', 'clock in', 'clock out']
      },
      {
        id: 'attendance-history',
        title: 'Attendance History',
        subtitle: 'View monthly logs, work hours & punch timings',
        category: 'Attendance',
        path: '/employee/attendance',
        icon: Clock,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['attendance', 'history', 'logs', 'hours', 'calendar', 'present', 'absent', 'late', 'records']
      },
      {
        id: 'leaves-apply',
        title: 'Apply For Leave',
        subtitle: 'Submit sick, casual, or earned leave request',
        category: 'Leaves',
        path: '/employee/leaves/apply',
        icon: Calendar,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['apply leave', 'take off', 'sick leave', 'casual leave', 'vacation', 'time off', 'request leave']
      },
      {
        id: 'leaves-overview',
        title: 'My Leaves & Balance',
        subtitle: 'Check leave quota, approvals & history',
        category: 'Leaves',
        path: '/employee/leaves',
        icon: Calendar,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['leaves', 'leave balance', 'leave history', 'quota', 'paid leave', 'casual leave', 'status']
      },
      {
        id: 'payroll-slips',
        title: 'Payslips & Salary',
        subtitle: 'Download monthly salary slips & breakdown',
        category: 'Payroll',
        path: '/employee/payroll',
        icon: Wallet,
        color: 'bg-[#fef7e0] text-[#b06000]',
        keywords: ['payslip', 'salary', 'salary slip', 'compensation', 'earnings', 'deductions', 'payroll', 'wages']
      },
      {
        id: 'expenses-claims',
        title: 'My Expenses & Claims',
        subtitle: 'Submit travel, food & fuel claims',
        category: 'Expenses',
        path: '/employee/expenses',
        icon: Receipt,
        color: 'bg-orange-50 text-orange-600',
        keywords: ['expenses', 'claims', 'reimbursement', 'travel', 'food', 'fuel', 'bills', 'receipts']
      },
      {
        id: 'holidays',
        title: 'Holidays Calendar',
        subtitle: 'Upcoming public, national & company holidays',
        category: 'Holidays',
        path: '/employee/holidays',
        icon: Sparkles,
        color: 'bg-[#f3e8fd] text-[#8430ce]',
        keywords: ['holidays', 'calendar', 'festival', 'public holiday', 'off days', 'company holidays']
      },
      {
        id: 'profile',
        title: 'My Profile',
        subtitle: 'Personal details, work credentials, team & assets',
        category: 'Profile',
        path: '/employee/profile',
        icon: User,
        color: 'bg-slate-100 text-slate-700',
        keywords: ['profile', 'my profile', 'account', 'personal', 'work info', 'manager', 'team', 'shift', 'assets', 'emergency contact']
      },
      {
        id: 'birthdays',
        title: 'Team Birthdays',
        subtitle: 'Upcoming colleague birthdays & celebrations',
        category: 'Team',
        path: '/employee/birthdays',
        icon: Cake,
        color: 'bg-rose-50 text-rose-600',
        keywords: ['birthdays', 'colleagues', 'team', 'celebrations', 'events']
      }
    ];

    if (emp?.featureAccess?.canLoanOrigination) {
      items.push({
        id: 'loan-origination',
        title: 'Loan Origination Hub',
        subtitle: 'Manage loan leads, forms & applications',
        category: 'Origination',
        path: '/employee/loans/origination',
        icon: Briefcase,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['loans', 'origination', 'loan leads', 'loan applications', 'credit', 'borrowers']
      });
      items.push({
        id: 'loan-activities',
        title: 'Loan Activities & Schedule',
        subtitle: 'Scheduled loan visits, KYC verifications & tasks',
        category: 'Origination',
        path: '/employee/loans/origination/activities',
        icon: Clock,
        color: 'bg-[#e8f0fe] text-[#1a73e8]',
        keywords: ['loan activities', 'schedule', 'tasks', 'visit', 'kyc visit', 'followup']
      });
    }

    if (emp?.featureAccess?.canSalesOrigination) {
      items.push({
        id: 'sales-origination',
        title: 'Sales Origination Hub',
        subtitle: 'Sales pipeline, prospective leads & targets',
        category: 'Origination',
        path: '/employee/sales/origination',
        icon: ShoppingBag,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['sales', 'leads', 'origination', 'pipeline', 'prospects', 'clients']
      });
      items.push({
        id: 'sales-activities',
        title: 'Sales Activities & Schedule',
        subtitle: 'Field visits, client meetings & scheduled tasks',
        category: 'Origination',
        path: '/employee/sales/origination/activities',
        icon: Clock,
        color: 'bg-[#e6f4ea] text-[#137333]',
        keywords: ['sales activities', 'schedule', 'meetings', 'client visit', 'tasks']
      });
    }

    if (emp?.featureAccess?.canBranchOperations) {
      items.push({
        id: 'branch-operations',
        title: 'Branch Operations Hub',
        subtitle: 'Branch team operations, activities & approvals',
        category: 'Operations',
        path: '/employee/branch-operations',
        icon: Building2,
        color: 'bg-[#f3e8fd] text-[#7C4DFF]',
        keywords: ['branch', 'branch operations', 'team', 'approvals', 'office']
      });
    }

    items.push({
      id: 'training-videos',
      title: 'Training & Learning Videos',
      subtitle: 'Watch courses, training modules & onboarding videos',
      category: 'Learning',
      path: '/employee/training',
      icon: Play,
      color: 'bg-[#fce8e6] text-[#d93025]',
      keywords: ['training', 'videos', 'learning', 'courses', 'onboarding', 'skills']
    });

    return items;
  }, [user]);

  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return searchablePages;
    return searchablePages.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords?.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchSubtitle || matchCat || matchKeywords;
    });
  }, [searchQuery, searchablePages]);

  return (
    <div ref={searchRef} className="relative z-40">
      <div className="relative flex items-center">
        <Search className="w-4.5 h-4.5 text-[#80868b] absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => setIsSearchOpen(true)}
          placeholder={placeholder}
          className="w-full h-12 bg-white border border-[#dadce0] focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 rounded-full pl-11.5 pr-10 text-sm font-medium text-[#1f1f1f] placeholder:text-[#80868b] outline-none transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 p-1 text-[#80868b] hover:text-[#1f1f1f] rounded-full transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Quick Dropdown Results / Suggestions */}
      {isSearchOpen && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#dadce0] shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-[#f1f3f4] [scrollbar-width:thin]">
          <div className="px-3.5 py-2 bg-[#f8fafd] flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5f6368]">
              {searchQuery.trim() ? `Matching Pages (${filteredPages.length})` : 'Quick Navigation Pages'}
            </span>
            <button
              type="button"
              onClick={() => setIsSearchOpen(false)}
              className="text-[11px] font-semibold text-[#1a73e8] hover:underline cursor-pointer"
            >
              Close
            </button>
          </div>

          {filteredPages.length > 0 ? (
            filteredPages.map((page) => {
              const Icon = page.icon;
              return (
                <div
                  key={page.id}
                  onClick={() => {
                    navigate(page.path);
                    setIsSearchOpen(false);
                    setSearchQuery('');
                  }}
                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[#f8fafd] active:bg-slate-100 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${page.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1f1f1f] group-hover:text-[#1a73e8] transition-colors truncate">
                        {page.title}
                      </p>
                      <p className="text-[10.5px] text-[#5f6368] truncate">
                        {page.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-[#5f6368] border border-slate-200">
                      {page.category}
                    </span>
                    <ChevronRight size={14} className="text-[#80868b] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-5 text-center text-[#5f6368] space-y-1">
              <p className="text-xs font-semibold">No pages found matching "{searchQuery}"</p>
              <p className="text-[11px] text-[#80868b]">Try searching for attendance, leaves, payroll, claims, or origination</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeMobileSearchBar;
