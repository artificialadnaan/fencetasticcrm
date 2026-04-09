import { useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';

interface SelectOption {
  label: string;
  value: string;
}

interface EditableFieldProps {
  value: string | number | null;
  onSave: (newValue: string | number | null) => Promise<void>;
  type: 'text' | 'number' | 'date' | 'currency' | 'select';
  options?: SelectOption[];
  formatDisplay?: (value: string | number | null) => string;
  label: string;
  className?: string;
}

export function EditableField({
  value,
  onSave,
  type,
  options,
  formatDisplay,
  label,
  className,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      if (type === 'number' || type === 'currency') {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [editing, type]);

  function startEdit() {
    if (saving) return;
    let initial = '';
    if (value != null) {
      if (type === 'currency') {
        initial = String(value);
      } else if (type === 'date') {
        // Normalize to YYYY-MM-DD for the date input
        const str = String(value);
        initial = /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : str.slice(0, 10);
      } else {
        initial = String(value);
      }
    }
    setInputValue(initial);
    setEditing(true);
  }

  async function commit() {
    if (!editing) return;
    let parsed: string | number | null = inputValue.trim() === '' ? null : inputValue.trim();
    if (type === 'number') {
      parsed = inputValue.trim() === '' ? null : Number(inputValue);
    } else if (type === 'currency') {
      const stripped = inputValue.replace(/[$,]/g, '').trim();
      parsed = stripped === '' ? null : Number(stripped);
    }
    // Skip save if value hasn't changed
    if (parsed === value || (parsed == null && value == null)) {
      setEditing(false);
      return;
    }
    setEditing(false);
    setSaving(true);
    try {
      await onSave(parsed);
    } catch {
      // error handled by caller
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  }

  function displayValue(): string {
    if (formatDisplay) return formatDisplay(value);
    if (value == null || value === '') return '—';
    return String(value);
  }

  if (editing) {
    const commonProps = {
      'aria-label': label,
      value: inputValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
        setInputValue(e.target.value),
      onBlur: commit,
      onKeyDown: handleKeyDown,
      className:
        'text-sm font-medium bg-background border border-input rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-ring w-full max-w-[180px]',
    };

    if (type === 'select' && options) {
      return (
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          {...commonProps}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    }

    const inputType =
      type === 'date' ? 'date' : type === 'number' || type === 'currency' ? 'number' : 'text';

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={inputType}
        step={type === 'currency' ? '0.01' : undefined}
        {...commonProps}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={`Edit ${label}`}
      onClick={startEdit}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          startEdit();
        }
      }}
      className={`group inline-flex items-center gap-1 cursor-pointer hover:bg-muted/50 rounded px-1 -mx-1 transition-colors ${saving ? 'opacity-50' : ''} ${className ?? ''}`}
    >
      <span className="font-medium">{displayValue()}</span>
      <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
    </span>
  );
}
