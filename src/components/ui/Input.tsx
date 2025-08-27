import React, { forwardRef, useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { 
    label, 
    error, 
    size = 'md',
    className = '',
    id: idProp,
    ...props 
  },
  ref
) {
  const autoId = useId();
  const id = idProp ?? autoId;

  const sizes = {
    sm: 'h-9 text-sm px-3',
    md: 'h-11 text-base px-4',
    lg: 'h-12 text-base px-4',
  } as const;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-widest"
        >
          {label}
        </label>
      )}
      <input
        id={id}
        ref={ref}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`
          w-full ${sizes[size]}
          bg-gray-50 dark:bg-gray-800/50 backdrop-blur-sm
          border border-gray-300 dark:border-gray-700/50 rounded-xl
          text-gray-900 dark:text-gray-100 placeholder-gray-500
          focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
          transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-600/50
          ${error ? 'border-red-500 dark:border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          disabled:opacity-60 disabled:cursor-not-allowed
          ${className}
        `}
        {...props}
      />
      {error && (
        <p id={`${id}-error`} className="text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </p>
      )}
    </div>
  );
});
