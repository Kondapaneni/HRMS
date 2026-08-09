import React from 'react';
import { ArrowLeft, Phone, MapPin, Calendar, Briefcase, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { format } from 'date-fns';

const OriginationMobileMemberDetails = ({ member }) => {
  const navigate = useNavigate();

  if (!member) return null;

  return (
    <div className="w-full pb-8">
      {/* Header */}
      <div className="relative pt-12 pb-24 px-6 overflow-hidden rounded-b-[40px] shadow-md bg-slate-900">
        <div className="relative z-10 flex items-center justify-between px-2">
          <button 
            type="button" 
            onClick={() => navigate('/employee/loans/origination/members')} 
            className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center backdrop-blur-md transition-transform active:scale-95 border border-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-200 uppercase tracking-widest mb-1 drop-shadow-md">Origination Module</p>
            <h2 className="text-xl font-bold text-white tracking-tight drop-shadow-sm">Member Profile</h2>
          </div>
          <div className="w-10 h-10" />
        </div>
      </div>

      {/* Profile Card */}
      <div className="space-y-6 relative z-20 -mt-12 mx-4">
        <div className="bg-white p-6 rounded-[28px] shadow-xl border border-slate-100 space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-2xl font-bold shrink-0 shadow-inner">
              {member.name ? member.name.charAt(0) : 'M'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">{member.name}</h2>
              <p className="text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">Active Member</p>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Phone Number</h3>
            <div className="flex items-center gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                <Phone size={18} className="text-blue-600" />
              </div>
              <span className="font-medium text-lg">{member.phone}</span>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location / Address</h3>
            <div className="flex items-start gap-3 text-slate-700">
              <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 mt-1">
                <MapPin size={18} className="text-indigo-600" />
              </div>
              <span className="font-medium leading-relaxed pt-2">{member.address}</span>
            </div>
          </div>

          {member.created_at && (
            <div className="space-y-1">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Joined On</h3>
              <div className="flex items-center gap-3 text-slate-700">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center shrink-0">
                  <Calendar size={18} className="text-emerald-600" />
                </div>
                <span className="font-medium">{format(new Date(member.created_at), 'MMMM d, yyyy - h:mm a')}</span>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Loan History Section */}
      <div className="px-4 mt-6">
        <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-5">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 mb-4">
            <Briefcase size={16} className="text-slate-500" />
            Loan History
          </h3>
          
          <div className="grid gap-3">
            {member.loans && member.loans.map((loan) => (
              <div key={loan.id} className="bg-slate-50 border border-slate-100 rounded-lg p-4 transition-all shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-semibold text-slate-800">
                    {loan.loan_type || 'Personal Loan'}
                  </div>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider">
                    <CheckCircle2 size={12} /> {loan.status}
                  </span>
                </div>
                
                {/* Clean URL link passing member data via router state */}
                <Link 
                  to="/employee/loans/business-loan"
                  state={{ name: member.name, phone: member.phone, lead_id: loan.id || loan.lead_id || member.lead_id }}
                  className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-all"
                >
                  Fill Loan Form <ArrowRight size={14} />
                </Link>
              </div>
            ))}
            
            {(!member.loans || member.loans.length === 0) && (
              <div className="text-center p-4 text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-100 space-y-2">
                <p>No loan history available.</p>
                <Link 
                  to="/employee/loans/business-loan"
                  state={{ name: member.name, phone: member.phone, lead_id: member.lead_id }}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Fill Loan Form <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OriginationMobileMemberDetails;
