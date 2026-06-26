import React, { useState } from 'react';
import { Combobox, ComboboxInput, ComboboxButton, ComboboxOptions, ComboboxOption } from '@headlessui/react';
import { Check, ChevronsUpDown } from 'lucide-react';

const EmployeeSelect = ({ employees, selectedId, onChange, placeholder = "Search employee...", valueKey = "id" }) => {
  const [query, setQuery] = useState('');

  const filteredEmployees = query === ''
    ? employees
    : employees.filter((employee) => {
        const str = `${employee.firstName} ${employee.lastName} ${employee.employeeId}`.toLowerCase();
        return str.includes(query.toLowerCase());
      });

  const selectedEmployee = employees.find(e => e[valueKey] === selectedId) || null;

  return (
    <Combobox value={selectedEmployee} onChange={(e) => onChange(e ? e[valueKey] : '')}>
      <div className="relative mt-1 z-50">
        <div className="relative w-full cursor-default overflow-hidden rounded-xl bg-white text-left border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 sm:text-sm">
          <ComboboxInput
            className="w-full border-none py-3 pl-4 pr-10 text-sm leading-5 text-slate-900 focus:ring-0 outline-none bg-slate-50"
            displayValue={(emp) => emp ? `${emp.firstName} ${emp.lastName} (${emp.employeeId})` : ''}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
          />
          <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronsUpDown className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </ComboboxButton>
        </div>
        
        <ComboboxOptions 
            transition
            className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm transition duration-100 ease-in data-[leave]:data-[closed]:opacity-0"
        >
          {filteredEmployees.length === 0 && query !== '' ? (
            <div className="relative cursor-default select-none px-4 py-2 text-slate-700">
              Nothing found.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <ComboboxOption
                key={emp.id}
                className={({ focus }) =>
                  `relative cursor-default select-none py-2 pl-10 pr-4 ${
                    focus ? 'bg-blue-100 text-blue-900' : 'text-slate-900'
                  }`
                }
                value={emp}
              >
                {({ selected, focus }) => (
                  <>
                    <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'}`}>
                      {emp.firstName} {emp.lastName} <span className="text-slate-500">({emp.employeeId})</span>
                    </span>
                    {selected ? (
                      <span
                        className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                          focus ? 'text-blue-600' : 'text-blue-600'
                        }`}
                      >
                        <Check className="h-5 w-5" aria-hidden="true" />
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
