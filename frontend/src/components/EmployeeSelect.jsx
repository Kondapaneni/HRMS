import React, { useState, useEffect } from 'react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Check, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axios';

const EmployeeSelect = ({ employees: initialEmployees, selectedId, onChange, placeholder = "Search employee...", valueKey = "id" }) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounce search query (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Live server-side employee search
  const { data: serverEmployees = [], isFetching } = useQuery({
    queryKey: ['employee-select-search', debouncedQuery],
    queryFn: async () => {
      const res = await api.get(`/admin/employees?search=${encodeURIComponent(debouncedQuery)}&limit=50`);
      return res.data.employees || [];
    },
    staleTime: 30 * 1000,
  });

  const employeeList = debouncedQuery.trim() !== '' 
    ? serverEmployees 
    : (initialEmployees && initialEmployees.length > 0 ? initialEmployees : serverEmployees);

  const selectedEmployee = employeeList.find(e => e[valueKey] === selectedId) || 
    (initialEmployees ? initialEmployees.find(e => e[valueKey] === selectedId) : null) || null;

  return (
    <Combobox value={selectedEmployee} onChange={(e) => { onChange(e ? e[valueKey] : ''); setQuery(''); }}>
      <div className="relative z-50">
        <div className="relative w-full">
          {isFetching ? (
            <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4285F4] animate-spin pointer-events-none" />
          ) : (
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#5f6368] pointer-events-none" />
          )}
          <ComboboxInput
            type="search"
            className="w-full rounded-full bg-[#f1f3f4] hover:bg-[#e8eaed] focus:bg-white border border-transparent focus:border-[#4285F4] focus:ring-2 focus:ring-[#4285F4]/20 py-2 pl-10 pr-8 text-xs text-[#1f1f1f] placeholder:text-[#5f6368] outline-none transition-all shadow-none focus:shadow-sm"
            displayValue={(emp) => emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeId})` : ''}
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
            className="absolute left-0 right-0 z-50 mt-1.5 max-h-52 w-full overflow-auto rounded-xl bg-white py-1 text-xs shadow-lg shadow-black/8 ring-1 ring-[#e0e3e7] focus:outline-none transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0 custom-scrollbar"
        >
          {employeeList.length === 0 && !isFetching ? (
            <div className="relative cursor-default select-none px-4 py-2.5 text-[#5f6368] text-xs">
              No employees found.
            </div>
          ) : (
            employeeList.map((emp) => (
              <ComboboxOption
                key={emp.id}
                className={({ focus }) =>
                  `relative cursor-pointer select-none py-2 pl-8 pr-4 ${
                    focus ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'text-[#1f1f1f]'
                  }`
                }
                value={emp}
              >
                {({ selected, focus }) => (
                  <>
                    <span className={`block truncate text-xs ${selected ? 'font-semibold' : 'font-normal'}`}>
                      {emp.firstName} {emp.lastName} <span className="text-[#5f6368] font-normal">({emp.employeeId})</span>
                    </span>
                    {selected ? (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[#1a73e8]">
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
