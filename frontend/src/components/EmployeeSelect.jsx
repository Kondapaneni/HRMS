import React, { useState, useEffect } from 'react';
import { Combobox, ComboboxInput, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Check, Search, Loader2 } from 'lucide-react';
import { useRemoteData } from '../state/remote.js';
import api from '../api/axios';

/** Search the complete authorized employee roster without downloading it. */
const EmployeeSelect = ({
  selectedId, onChange, placeholder = 'Search employee...', valueKey = 'id'
}) => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [page, setPage] = useState(1);
  const [chosen, setChosen] = useState(null);
  const limit = 50;

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); setDebouncedQuery(query); }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: response, isFetching, error } = useRemoteData({
    scope: ['employee-selector', page, debouncedQuery],
    load: async ({ signal }) => (
      await api.get('/admin/employees', {
        params: { search: debouncedQuery, limit, page }, signal
      })
    ).data,
    reloadOnFocus: false,
  });
  const employees = response?.employees || [];
  const total = Number(response?.pagination?.total ?? response?.total ?? 0);
  const totalPages = Math.ceil(total / limit);

  // A user ID from a saved form or URL may be on another page. Resolve it
  // through the same permission-filtered backend endpoint, never a client cache.
  const { data: selectedResponse } = useRemoteData({
    scope: ['employee-selector-selected', selectedId, valueKey],
    load: async ({ signal }) => {
      if (!selectedId) return null;
      const params = valueKey === 'userId'
        ? { userId: selectedId, limit: 1 }
        : { employeeRecordId: selectedId, limit: 1 };
      return (await api.get('/admin/employees', { params, signal })).data;
    },
    enabled: Boolean(selectedId),
    reloadOnFocus: false,
  });
  const selectedEmployee = employees.find(e => String(e[valueKey]) === String(selectedId))
    || (chosen && String(chosen[valueKey]) === String(selectedId) ? chosen : null)
    || (selectedResponse?.employees || []).find(e => String(e[valueKey]) === String(selectedId))
    || null;

  return (
    <Combobox value={selectedEmployee}
      onChange={(employee) => {
        setChosen(employee || null);
        onChange(employee ? employee[valueKey] : '');
        setQuery('');
        setPage(1);
      }}>
      <div className="relative z-50">
        <div className="relative w-full">
          {isFetching ? <Loader2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--brand-deep)] animate-spin pointer-events-none" />
            : <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)] pointer-events-none" />}
          <ComboboxInput type="search"
            className="w-full rounded-full bg-[var(--surface)] border border-[var(--line)] focus:border-[var(--brand)] py-2 pl-10 pr-8 text-xs text-[var(--text)] placeholder:text-[var(--muted)] outline-none transition-all"
            displayValue={emp => emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeId || ''})` : ''}
            onChange={event => {
              setQuery(event.target.value);
              if (!event.target.value) { setChosen(null); onChange(''); }
            }} placeholder={placeholder}
          />
        </div>
        <ComboboxOptions transition className="absolute left-0 right-0 z-50 mt-1.5 max-h-64 w-full overflow-auto rounded-[14px] bg-[var(--surface)] py-1 text-xs shadow-lg ring-1 ring-[var(--line)] focus:outline-none transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0">
          {error ? <div role="alert" className="px-4 py-3 text-red-600">Employee search unavailable.</div>
            : employees.length === 0 ? <div className="px-4 py-3 text-[var(--muted)]">{isFetching ? 'Searching…' : 'No employees found.'}</div>
            : employees.map(emp => (
              <ComboboxOption key={emp.id} value={emp}
                className={({ focus }) => `relative cursor-pointer select-none py-2 pl-8 pr-4 ${focus ? 'bg-[var(--brand-tint)] text-[var(--brand-deep)]' : 'text-[var(--text)]'}`}>
                {({ selected }) => (
                  <>
                    <span className={selected ? 'font-semibold' : 'font-normal'}>{emp.firstName} {emp.lastName} ({emp.employeeId || ''})</span>
                    {selected && <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-[var(--brand-deep)]"><Check className="h-3.5 w-3.5" /></span>}
                  </>
                )}
              </ComboboxOption>
            ))}
          {totalPages > 1 && <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-[var(--line)] bg-[var(--surface)] p-2 text-[var(--muted)]">
            <button type="button" disabled={page <= 1 || isFetching}
              onMouseDown={e => e.preventDefault()} onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-2 py-1 disabled:opacity-40">Previous</button>
            <span>Page {page}/{totalPages} · {total} results</span>
            <button type="button" disabled={page >= totalPages || isFetching}
              onMouseDown={e => e.preventDefault()} onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              className="px-2 py-1 disabled:opacity-40">Next</button>
          </div>}
        </ComboboxOptions>
      </div>
    </Combobox>
  );
};

export default EmployeeSelect;
