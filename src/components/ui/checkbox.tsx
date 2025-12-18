'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, description, id, checked, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={`flex items-start gap-3 cursor-pointer ${className}`}
      >
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            id={id}
            type="checkbox"
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <div className={`
            w-5 h-5 rounded border-2 transition-colors flex items-center justify-center
            ${checked
              ? 'bg-indigo-600 border-indigo-600'
              : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
            }
            peer-focus:ring-2 peer-focus:ring-indigo-500 peer-focus:ring-offset-2
          `}>
            {checked && <Check className="w-3 h-3 text-white" />}
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {label}
              </span>
            )}
            {description && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
