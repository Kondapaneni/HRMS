import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User } from 'lucide-react';
import api from '../api/axios';

const GlobalSearch = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);
  const navigate = useNavigate();

  // Debounce the query to prevent API spam
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['globalSearch', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return [];
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedQuery)}&limit=5`);
      return res.data.employees || [];
    },
    enabled: debouncedQuery.trim().length > 0,
  });

  const getInitials = (firstName, lastName) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  const handleSelect = (employeeId) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/admin/employees/${employeeId}`);
  };

  return (
    <div ref={wrapperRef} className="relative hidden sm:flex items-center ml-2 lg:ml-4 z-50">
      <Search className="absolute left-3.5 text-[#5f6368] pointer-events-none" size={17} />
      <input 
        type="text" 
        placeholder="Search employees, directory..." 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        className="pl-10 pr-10 py-2 w-80 lg:w-[420px] bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 rounded-full text-xs font-normal text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
      />
      
      {isFetching && (
        <Loader2 className="absolute right-3.5 w-4 h-4 text-[#4285F4] animate-spin" />
      )}

      {/* Google-style Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-[#e0e3e7] overflow-hidden z-50">
          {isFetching && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-[#5f6368]">Searching workspace...</div>
          ) : results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto divide-y divide-[#f1f3f4]">
              {results.map((emp) => (
                <li 
                  key={emp.id}
                  onClick={() => handleSelect(emp.id)}
                  className="px-4 py-2.5 hover:bg-[#f8fafd] cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 shrink-0 rounded-full bg-[#e8f0fe] text-[#1a73e8] font-bold text-xs flex items-center justify-center overflow-hidden border border-[#d2e3fc]">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(emp.firstName, emp.lastName)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[#1f1f1f] truncate">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-[11px] text-[#5f6368] truncate">
                      {emp.position || 'Employee'}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f1f3f4] text-[#444746]">
                      {emp.department || 'General'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center text-[#5f6368]">
              <User className="w-8 h-8 text-[#dadce0] mb-2" />
              <p className="text-xs">No employees found matching "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
