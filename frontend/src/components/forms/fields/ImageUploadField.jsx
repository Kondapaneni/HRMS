import React, { useRef, useState, useEffect } from 'react';
import { FieldContainer } from '../layout/FieldContainer';
import { Camera, X } from 'lucide-react';

export const ImageUploadField = React.memo(({
  name,
  label,
  value, // File object or image URL string
  onChange,
  required = false,
  disabled = false,
  readOnly = false,
  accept = 'image/png, image/jpeg, image/webp',
  maxSizeMB = 5,
  helpText,
  error,
  className = '',
  id,
  colSpan,
}) => {
  const fieldId = id || `field-${name}`;
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!value) {
      setPreview(null);
      return;
    }
    if (typeof value === 'string') {
      setPreview(value);
    } else if (value instanceof File) {
      const objectUrl = URL.createObjectURL(value);
      setPreview(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }
  }, [value]);

  const handleSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      alert(`Image size cannot exceed ${maxSizeMB} MB.`);
      return;
    }

    if (onChange) onChange(file);
  };

  const clearImage = (e) => {
    e.stopPropagation();
    if (disabled || readOnly) return;
    if (onChange) onChange(null);
  };

  return (
    <FieldContainer
      id={fieldId}
      label={label}
      required={required}
      helpText={helpText || `Accepted formats: PNG, JPG, WEBP (Max ${maxSizeMB}MB)`}
      error={error}
      colSpan={colSpan}
      disabled={disabled}
      readOnly={readOnly}
      className={className}
    >
      <div className="flex items-center gap-4 pt-1">
        <div
          onClick={() => !disabled && !readOnly && inputRef.current?.click()}
          className={`relative w-24 h-24 rounded-[14px] border-2 border-dashed flex flex-col items-center justify-center overflow-hidden bg-[var(--surface-alt)] transition-all cursor-pointer group ${
            error ? 'border-[var(--danger-text)]' : 'border-[#D9D9DE] dark:border-[#3A3A40] hover:border-[var(--brand)] hover:bg-[var(--brand-tint)]'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={inputRef}
            id={fieldId}
            name={name}
            type="file"
            accept={accept}
            onChange={handleSelect}
            disabled={disabled || readOnly}
            className="hidden"
          />

          {preview ? (
            <>
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              {!disabled && !readOnly && (
                <div className="absolute inset-0 bg-[#131315]/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[12px] font-medium">
                  Change
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center text-[var(--icon-muted)] gap-1">
              <Camera size={20} strokeWidth={1.7} />
              <span className="text-[11px] font-medium">Upload</span>
            </div>
          )}
        </div>

        {preview && !disabled && !readOnly && (
          <button
            type="button"
            onClick={clearImage}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-[var(--danger-text)] bg-[var(--danger-bg)] rounded-full hover:brightness-95 transition-all cursor-pointer"
          >
            <X size={14} /> Remove Image
          </button>
        )}
      </div>
    </FieldContainer>
  );
});

ImageUploadField.displayName = 'ImageUploadField';
export default ImageUploadField;
