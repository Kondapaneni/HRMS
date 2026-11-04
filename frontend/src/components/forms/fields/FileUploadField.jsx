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
  colSpan,
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
            className={`w-full p-4 border-2 border-dashed rounded-[16px] transition-all flex flex-col items-center justify-center gap-2 cursor-pointer text-center bg-[var(--surface-alt)] hover:bg-[var(--brand-tint)] hover:border-[var(--brand)] ${
              error ? 'border-[var(--danger-text)] bg-[var(--danger-bg)]' : 'border-[#D9D9DE] dark:border-[#3A3A40]'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            
            <div className="w-10 h-10 rounded-[12px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center">
              <UploadCloud size={20} strokeWidth={1.7} />
            </div>
            
            <div>
              <p className="text-[13px] font-medium text-[var(--text)]">
                Click to upload or drag & drop file
              </p>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">
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
                  className="flex items-center justify-between p-2.5 bg-[var(--surface)] border border-[var(--line)] rounded-[12px] text-[13px]"
                >
                  <div className="flex items-center gap-2.5 overflow-hidden">
                    <div className="w-8 h-8 rounded-[8px] bg-[var(--brand-tint)] text-[var(--brand-deep)] flex items-center justify-center shrink-0">
                      <FileText size={16} strokeWidth={1.7} />
                    </div>
                    <div className="truncate">
                      <p className="font-medium text-[var(--text)] truncate">{fileName}</p>
                      {fileSize && <p className="text-[11px] text-[var(--muted)]">{fileSize}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--success-text)] bg-[var(--success-bg)] px-2 py-0.5 rounded-[7px]">
                      <CheckCircle2 size={12} /> Ready
                    </span>
                    {!disabled && !readOnly && (
                      <button
                        type="button"
                        onClick={() => removeFile(idx)}
                        className="text-[var(--icon-muted)] hover:text-[var(--danger-text)] transition-colors p-1 cursor-pointer"
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
export default FileUploadField;
