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
      <Search className="absolute left-3 text-slate-400" size={16} />
      <input 
        type="text" 
        placeholder="Search employees, departments..." 
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (query.trim()) setIsOpen(true);
        }}
        className="pl-9 pr-10 py-1.5 w-96 lg:w-[480px] bg-slate-100 border border-transparent rounded-md text-sm text-slate-700 focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
      />
      
      {isFetching && (
        <Loader2 className="absolute right-3 w-4 h-4 text-blue-500 animate-spin" />
      )}

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden">
          {isFetching && results.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-500">Searching...</div>
          ) : results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto">
              {results.map((emp) => (
                <li 
                  key={emp.id}
                  onClick={() => handleSelect(emp.id)}
                  className="px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex items-center gap-3 transition-colors last:border-0"
                >
                  <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden border border-slate-200">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">{getInitials(emp.firstName, emp.lastName)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-800 truncate">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {emp.position || 'Employee'}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                      {emp.department || 'No Dept'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center text-slate-500">
              <User className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm">No employees found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
