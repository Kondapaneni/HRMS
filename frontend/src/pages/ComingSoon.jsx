import React from "react";
import { Link } from "react-router-dom";
import FuzzyText from "../components/FuzzyText";
import { Home } from "lucide-react";

const ComingSoon = () => {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="h-32 mb-8 relative flex items-center justify-center w-full max-w-3xl">
        <FuzzyText
          baseIntensity={0.2}
          hoverIntensity={0.5}
          enableHover
          color="#3B82F6"
          fontSize="4.5rem"
          fontWeight={900}
        >
          COMING SOON
        </FuzzyText>
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mb-4 text-center">
        We're Working on It!
      </h1>
      <p className="text-slate-500 mb-8 max-w-md text-center leading-relaxed">
        The Recruitment module is currently under active development. Stay tuned
        for exciting new features to help you hire the best talent!
      </p>

      <Link
        to="/admin"
        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm"
      >
        <Home className="w-5 h-5" />
        Back to Dashboard
      </Link>
    </div>
  );
};

export default ComingSoon;
