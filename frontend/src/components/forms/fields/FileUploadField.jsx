import React, { useRef } from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import { UploadCloud, FileText, X, CheckCircle2 } from 'lucide-react';

export const FileUploadField = React.memo(({
  name,
  label,
  value, // File object, array of Files, or metadata object { name, size, url }
  onChange,
  required = false,
  disabled = false,
  readOnly = false,
  accept = '*',
  multiple = false,
  maxSizeMB = 10,
  helpText,
  error,
  className = '',
  id,
  colSpan
}) => {
  const fieldId = id || `field-${name}`;
  const inputRef = useRef(null);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length === 0) return;

    // Filter by max size
    const maxBytes = maxSizeMB * 1024 * 1024;
    const validFiles = selected.filter((file) => file.size <= maxBytes);

    if (validFiles.length < selected.length) {
      alert(`Some files exceeded the maximum allowed size of ${maxSizeMB} MB.`);
    }

    if (multiple) {
      const current = Array.isArray(value) ? value : [];
      if (onChange) onChange([...current, ...validFiles]);
    } else {
      if (onChange) onChange(validFiles[0] || null);
    }
  };

  const removeFile = (indexToRemove) => {
    if (disabled || readOnly) return;
    if (multiple && Array.isArray(value)) {
      const next = value.filter((_, idx) => idx !== indexToRemove);
      if (onChange) onChange(next);
    } else {
      if (onChange) onChange(null);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filesList = multiple 
    ? (Array.isArray(value) ? value : []) 
    : (value ? [value] : []);

  return (
    <FieldContainer
      id={fieldId}
      label={label}
      required={required}
      helpText={helpText || `Accepted: ${accept} (Max ${maxSizeMB}MB)`}
      error={error}
      colSpan={colSpan}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    >
      <div className="space-y-2">
        {!readOnly && (
          <div
            onClick={() => !disabled && inputRef.current?.click()}
            className={`w-full p-4 border-2 border-dashed rounded-xl transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center bg-slate-50/50 hover:bg-blue-50/30 hover:border-blue-300 ${
              error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 hover:bg-slate-100 hover:border-slate-200' : ''}`}
          >
            <input
              ref={inputRef}
              id={fieldId}
              name={name}
              type="file"
              accept={accept}
              multiple={multiple}
              onChange={handleFileSelect}
              disabled={disabled}
              className="hidden"
            />
            
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              <UploadCloud size={20} />
            </div>
            
            <div>
              <p className="text-xs font-semibold text-slate-700">
                Click to upload or drag & drop file
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {multiple ? 'Select one or more files' : 'Select a file'}
              </p>
            </div>
          </div>
        )}

        {filesList.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {filesList.map((file, idx) => {
              const fileName = file.name || file.filename || `File ${idx + 1}`;
              const fileSize = file.size ? formatSize(file.size) : '';

              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-2xs text-xs"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <FileText size={18} className="text-blue-500 flex-shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-slate-700 truncate">{fileName}</p>
                      {fileSize && <p className="text-[10px] text-slate-400">{fileSize}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <CheckCircle2 size={12} /> Ready
                    </span>
                    {!disabled && !readOnly && (
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-slate-400 hover:text-red-600 transition-colors p-1 cursor-pointer"
                        title="Remove file"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </FieldContainer>
  );
});

FileUploadField.displayName = 'FileUploadField';
