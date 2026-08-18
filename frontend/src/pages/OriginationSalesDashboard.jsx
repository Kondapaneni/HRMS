import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, ShoppingBag, Sparkles, TrendingUp, Users, Target, ArrowLeft } from 'lucide-react';
import FuzzyText from '../components/FuzzyText';
import OriginationMobileSalesDashboard from './OriginationMobileSalesDashboard';

const upcomingFeatures = [
  {
    icon: <Users className="w-5 h-5 text-emerald-600" />,
    title: 'Lead Origination',
    desc: 'Capture, qualify, and route incoming prospective sales leads.',
  },
  {
    icon: <Target className="w-5 h-5 text-teal-600" />,
    title: 'Deals & Pipeline',
    desc: 'Track deal stages, volume conversions, and closing timelines.',
  },
  {
    icon: <TrendingUp className="w-5 h-5 text-emerald-600" />,
    title: 'Sales Performance',
    desc: 'Real-time revenue metrics, team quotas, and performance insights.',
  },
];

const OriginationSalesDashboard = () => {
  return (
    <>
      <div className="md:hidden">
        <OriginationMobileSalesDashboard />
      </div>

      <div className="hidden md:flex min-h-[85vh] flex-col items-center justify-center p-4 md:p-8">
        {/* Top Badge */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs mb-4"
        >
          <ShoppingBag size={14} className="text-emerald-600" />
          <span className="text-xs font-semibold uppercase tracking-wider">Sales Origination Module</span>
        </motion.div>

        {/* Fuzzy Animated Coming Soon Title */}
        <div className="h-28 sm:h-32 mb-4 relative flex items-center justify-center w-full max-w-2xl">
          <FuzzyText
            baseIntensity={0.2}
            hoverIntensity={0.5}
            enableHover
            color="#10B981"
            fontSize="clamp(2.5rem, 7vw, 4.5rem)"
            fontWeight={900}
          >
            COMING SOON
          </FuzzyText>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-center max-w-xl space-y-3"
        >
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            We're Building Acme Sales Origination!
          </h1>
          <p className="text-slate-500 text-sm sm:text-base leading-relaxed">
            The Sales Origination workspace is currently under active development. Stay tuned for seamless lead capture, customer accounts, deal pipelines, and real-time revenue analytics.
          </p>
        </motion.div>

        {/* Feature Teasers */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl w-full mt-8"
        >
          {upcomingFeatures.map((f, idx) => (
            <div
              key={idx}
              className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col items-center text-center space-y-2 hover:border-emerald-200 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                {f.icon}
              </div>
              <h3 className="text-sm font-bold text-slate-800">{f.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </motion.div>

        {/* Action CTA */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 flex items-center gap-3"
        >
          <Link
            to="/employee"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-medium text-sm transition-all shadow-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            Back to HRMS
          </Link>
        </motion.div>
      </div>
    </>
  );
};

export default OriginationSalesDashboard;
