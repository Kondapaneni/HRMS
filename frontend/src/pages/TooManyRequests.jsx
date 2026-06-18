import React from 'react';
import { Link } from 'react-router-dom';
import FuzzyText from '../components/FuzzyText';
import { Home } from 'lucide-react';

const TooManyRequests = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="h-48 mb-4 relative flex items-center justify-center w-full max-w-2xl">
        <FuzzyText 
          baseIntensity={0.2}
          hoverIntensity={0.5}
          enableHover
          color="#0f172a"
          fontSize="8rem"
          fontWeight={900}
        >
          429
        </FuzzyText>
      </div>
      
      <h1 className="text-3xl font-bold text-slate-800 mb-4 text-center">Too Many Requests</h1>
      <p className="text-slate-500 mb-8 max-w-md text-center leading-relaxed">
        You have made too many requests in a short period of time. Please wait a few minutes and try again.
      </p>
      
      <Link 
        to="/"
        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm"
      >
        <Home className="w-5 h-5" />
        Return to Home
      </Link>
    </div>
  );
};

export default TooManyRequests;
