import { formatEmployeeId } from '../utils/employeeIdDisplay';
import React, { useState, useEffect, useMemo } from 'react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Check, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const EmployeeSelect = ({ 
  employees: initialEmployees, 
  selectedId, 
  onChange, 
  placeholder = "Search employee...", 
  valueKey = "id" 
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const hasProvidedEmployees = Array.isArray(initialEmployees);

  // Debounce search query (300ms) - only needed for server-side search fallback
  useEffect(() => {
    if (hasProvidedEmployees) return;
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, hasProvidedEmployees]);

  // Live server-side employee search: ONLY runs if initialEmployees is not provided AND user typed a query
  const { data: serverEmployees = [], isFetching } = useQuery({
    queryKey: ['employee-select-search', debouncedQuery],
    queryFn: async () => {
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedQuery)}&limit=50`);
      return res.data.employees || [];
    },
    enabled: !hasProvidedEmployees && Boolean(debouncedQuery.trim()),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Client-side instant filtering when initialEmployees is provided
  const employeeList = useMemo(() => {
    if (hasProvidedEmployees) {
      if (!query.trim()) return initialEmployees;
      const q = query.toLowerCase().trim();
      return initialEmployees.filter((emp) => {
        const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.toLowerCase();
        const code = (emp.employeeId || emp.employeeCode || '').toLowerCase();
        const email = (emp.email || '').toLowerCase();
        const dept = (emp.department || '').toLowerCase();
        return fullName.includes(q) || code.includes(q) || email.includes(q) || dept.includes(q);
      });
    }
    return debouncedQuery.trim() !== '' ? serverEmployees : [];
  }, [hasProvidedEmployees, initialEmployees, query, debouncedQuery, serverEmployees]);

  // Resolve selected employee object
  const allEmployees = hasProvidedEmployees ? initialEmployees : serverEmployees;
  const selectedEmployee = allEmployees.find(e => String(e[valueKey]) === String(selectedId)) || null;

  // Loading indicator: ONLY show spinner when user has actively typed a search query that is loading on the server.
  // Never show spinner when query is empty or on initial load / background re-sync.
  const showSpinner = !hasProvidedEmployees && isFetching && Boolean(query.trim());

  return (
    <Combobox value={selectedEmployee} onChange={(e) => { onChange(e ? e[valueKey] : ''); setQuery(''); }}>
      <div className="relative z-50">
        <div className="relative w-full">
          {showSpinner ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-deep)] animate-spin pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />
          )}
          <ComboboxInput
            type="search"
            className="w-full rounded-full bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] py-2 pl-10 pr-8 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all shadow-none"
            displayValue={(emp) => emp ? `${emp.firstName} ${emp.lastName} (${formatEmployeeId(emp.employeeId || emp.employeeCode, '')})` : ''}
            onChange={(event) => {
              setQuery(event.target.value);
              if (!event.target.value) {
                onChange('');
              }
            }}
            placeholder={placeholder}
          />
        </div>
        
        <ComboboxOptions 
            transition
            className="absolute left-0 right-0 z-50 mt-1.5 max-h-52 w-full overflow-auto rounded-[14px] bg-[var(--surface)] py-1 text-xs shadow-lg ring-1 ring-[var(--line)] focus:outline-none transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0 custom-scrollbar"
        >
          {employeeList.length === 0 && !showSpinner ? (
            <div className="relative cursor-default select-none px-4 py-2.5 text-[var(--muted)] text-xs">
              No employees found.
            </div>
          ) : (
            employeeList.map((emp) => (
              <ComboboxOption
                key={emp.id}
                className={({ focus }) =>
                  `relative cursor-pointer select-none py-2 pl-8 pr-4 ${
                    focus ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)]' : 'text-[var(--text)]'
                  }`
                }
                value={emp}
              >
                {({ selected }) => (
                  <>
                    <span className={`block truncate text-xs ${selected ? 'font-semibold' : 'font-normal'}`}>
                      {emp.firstName} {emp.lastName} <span className="text-[var(--muted)] font-normal">({emp.employeeId || emp.employeeCode || ''})</span>
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[var(--brand-deep)]">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </>
                )}
              </ComboboxOption>
            ))
          )}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
};

export default EmployeeSelect;
