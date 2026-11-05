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
  Fingerprint,
  BarChart2
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
        color: 'bg-[var(--brand-tint)] text-[var(--brand-deep)]',
        keywords: ['punch', 'check in', 'check out', 'attendance', 'mark attendance', 'clock in', 'clock out']
      },
      {
        id: 'attendance-history',
        title: 'Attendance History',
        subtitle: 'View monthly logs, work hours & punch timings',
        category: 'Attendance',
        path: '/employee/attendance',
        icon: Clock,
        color: 'bg-[var(--brand-tint)] text-[var(--brand-deep)]',
        keywords: ['attendance', 'history', 'logs', 'hours', 'calendar', 'present', 'absent', 'late', 'records']
      },
      {
        id: 'leaves-apply',
        title: 'Apply For Leave',
        subtitle: 'Submit sick, casual, or earned leave request',
        category: 'Leaves',
        path: '/employee/leaves/apply',
        icon: Calendar,
        color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
        keywords: ['apply leave', 'take off', 'sick leave', 'casual leave', 'vacation', 'time off', 'request leave']
      },
      {
        id: 'leaves-overview',
        title: 'My Leaves & Balance',
        subtitle: 'Check leave quota, approvals & history',
        category: 'Leaves',
        path: '/employee/leaves',
        icon: Calendar,
        color: 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]',
        keywords: ['leaves', 'leave balance', 'leave history', 'quota', 'paid leave', 'casual leave', 'status']
      },
      {
        id: 'payroll-slips',
        title: 'Payslips & Salary',
        subtitle: 'Download monthly salary slips & breakdown',
        category: 'Payroll',
        path: '/employee/payroll',
        icon: Wallet,
        color: 'bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]',
        keywords: ['payslip', 'salary', 'salary slip', 'compensation', 'earnings', 'deductions', 'payroll', 'wages']
      },
      {
        id: 'performance',
        title: 'My Performance & Analytics',
        subtitle: 'View weekly velocity, attendance ratings & benchmarks',
        category: 'Performance',
        path: '/employee/performance',
        icon: BarChart2,
        color: 'bg-[var(--brand-tint)] text-[var(--brand-deep)]',
        keywords: ['performance', 'analytics', 'velocity', 'productivity', 'hours', 'score', 'benchmark', 'peers']
      },
      {
        id: 'expenses-claims',
        title: 'My Expenses & Claims',
        subtitle: 'Submit travel, food & fuel claims',
        category: 'Expenses',
        path: '/employee/expenses',
        icon: Receipt,
        color: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]',
        keywords: ['expenses', 'claims', 'reimbursement', 'travel', 'food', 'fuel', 'bills', 'receipts']
      },
      {
        id: 'holidays',
        title: 'Holidays Calendar',
        subtitle: 'Upcoming public, national & company holidays',
        category: 'Holidays',
        path: '/employee/holidays',
        icon: Sparkles,
        color: 'bg-[var(--brand-tint)] text-[var(--brand-deep)]',
        keywords: ['holidays', 'calendar', 'festival', 'public holiday', 'off days', 'company holidays']
      },
      {
        id: 'profile',
        title: 'My Profile',
        subtitle: 'Personal details, work credentials, team & assets',
        category: 'Profile',
        path: '/employee/profile',
        icon: User,
        color: 'bg-[var(--surface-alt)] text-[var(--text-2)]',
        keywords: ['profile', 'my profile', 'account', 'personal', 'work info', 'manager', 'team', 'shift', 'assets', 'emergency contact']
      },
      {
        id: 'birthdays',
        title: 'Team Birthdays',
        subtitle: 'Upcoming colleague birthdays & celebrations',
        category: 'Team',
        path: '/employee/birthdays',
        icon: Cake,
        color: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]',
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
        color: 'bg-[var(--brand-tint)] text-[var(--brand-deep)]',
        keywords: ['loans', 'origination', 'loan leads', 'loan applications', 'credit', 'borrowers']
      });
      items.push({
        id: 'loan-activities',
        title: 'Loan Activities & Schedule',
        subtitle: 'Scheduled loan visits, KYC verifications & tasks',
        category: 'Origination',
        path: '/employee/loans/origination/activities',
        icon: Clock,
        color: 'bg-[var(--brand-tint)] text-[var(--brand-deep)]',
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
        color: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]',
        keywords: ['sales', 'leads', 'origination', 'pipeline', 'prospects', 'clients']
      });
      items.push({
        id: 'sales-activities',
        title: 'Sales Activities & Schedule',
        subtitle: 'Field visits, client meetings & scheduled tasks',
        category: 'Origination',
        path: '/employee/sales/origination/activities',
        icon: Clock,
        color: 'bg-[var(--accent-pink-tint)] text-[var(--accent-pink-deep)]',
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
        color: 'bg-[var(--branch-tint)] text-[var(--branch-deep)]',
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
      color: 'bg-[var(--status-danger-bg)] text-[var(--status-danger-text)]',
      keywords: ['training', 'videos', 'learning', 'courses', 'onboarding', 'skills']
    });

    return items;
  }, [user]);

  const filteredPages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
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
        <Search className="w-4.5 h-4.5 text-[var(--muted)] absolute left-4 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setIsSearchOpen(true);
          }}
          onFocus={() => {
            if (searchQuery.trim()) {
              setIsSearchOpen(true);
            }
          }}
          placeholder={placeholder}
          className="w-full h-12 bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand)]/20 rounded-full pl-11.5 pr-10 text-sm font-medium text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all shadow-xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setIsSearchOpen(false);
            }}
            className="absolute right-3.5 p-1 text-[var(--muted)] hover:text-[var(--text)] rounded-full transition-colors cursor-pointer"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Dropdown Results - Only shows when actively searching */}
      {isSearchOpen && searchQuery.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-[var(--surface)] rounded-2xl border border-[var(--line)] shadow-xl overflow-hidden z-50 max-h-80 overflow-y-auto divide-y divide-[var(--line)] [scrollbar-width:thin]">

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
                  className="px-3.5 py-2.5 flex items-center justify-between hover:bg-[var(--brand-tint)]/40 active:bg-[var(--surface-alt)] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0 ${page.color}`}>
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[var(--text)] group-hover:text-[var(--brand-deep)] transition-colors truncate">
                        {page.title}
                      </p>
                      <p className="text-[10.5px] text-[var(--muted)] truncate">
                        {page.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-2">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)]">
                      {page.category}
                    </span>
                    <ChevronRight size={14} className="text-[var(--muted)] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-5 text-center text-[var(--muted)] space-y-1">
              <p className="text-xs font-semibold">No pages found matching "{searchQuery}"</p>
              <p className="text-[11px] text-[var(--muted)]">Try searching for attendance, leaves, payroll, claims, or origination</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EmployeeMobileSearchBar;
