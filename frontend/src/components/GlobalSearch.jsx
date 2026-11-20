import React, { useState, useEffect, useRef } from 'react';
import { useRemoteData } from '../state/remote.js';
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

  const { data: results = [], isFetching } = useRemoteData({
    scope: ['globalSearch', debouncedQuery],
    load: async () => {
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
      <Search className="absolute left-3.5 text-[var(--muted)] pointer-events-none" size={17} />
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
        className="pl-10 pr-10 py-2 w-80 lg:w-[420px] bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] rounded-full text-xs font-normal text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all shadow-none"
      />
      
      {isFetching && (
        <Loader2 className="absolute right-3.5 w-4 h-4 text-[var(--brand-deep)] animate-spin" />
      )}

      {/* Dropdown Results */}
      {isOpen && query.trim() && (
        <div className="absolute top-full left-0 mt-2 w-full bg-[var(--surface)] rounded-[18px] shadow-xl border border-[var(--line)] overflow-hidden z-50">
          {isFetching && results.length === 0 ? (
            <div className="p-4 text-center text-xs text-[var(--muted)]">Searching workspace...</div>
          ) : results.length > 0 ? (
            <ul className="max-h-96 overflow-y-auto divide-y divide-[var(--line)]">
              {results.map((emp) => (
                <li 
                  key={emp.id}
                  onClick={() => handleSelect(emp.id)}
                  className="px-4 py-2.5 hover:bg-[var(--surface-alt)] cursor-pointer flex items-center gap-3 transition-colors"
                >
                  <div className="w-8 h-8 shrink-0 rounded-[10px] bg-[var(--brand-tint)] text-[var(--brand-deep)] font-semibold text-xs flex items-center justify-center overflow-hidden border border-[var(--brand)]/20">
                    {emp.avatar ? (
                      <img src={emp.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(emp.firstName, emp.lastName)}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-[var(--text)] truncate">
                      {emp.firstName} {emp.lastName}
                    </div>
                    <div className="text-[11px] text-[var(--muted)] truncate">
                      {emp.position || 'Employee'}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[var(--surface-alt)] text-[var(--text-2)] border border-[var(--line)]">
                      {emp.department || 'General'}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 flex flex-col items-center justify-center text-[var(--muted)]">
              <User className="w-8 h-8 text-[var(--muted)] mb-2 opacity-50" />
              <p className="text-xs">No employees found matching "{query}"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
