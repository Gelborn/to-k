import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  const base =
    // layout + accessibility
    'inline-flex items-center justify-center gap-2 whitespace-nowrap leading-none ' +
    'rounded-xl font-semibold transition-all duration-200 ' +
    // focus ring (works in both themes)
    'focus:outline-none focus:ring-2 focus:ring-gray-500 ' +
    'focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 ' +
    // states
    'disabled:opacity-50 disabled:cursor-not-allowed active:scale-95';

  const variants = {
    primary:
      'bg-gray-900 text-white hover:bg-gray-800 shadow-lg hover:shadow-xl ' +
      'dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100',
    secondary:
      'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300 ' +
      'dark:bg-gray-800/50 dark:text-gray-100 dark:hover:bg-gray-700/50 dark:border-gray-700/50 backdrop-blur-sm',
    ghost:
      'text-gray-600 hover:text-gray-900 hover:bg-gray-100 ' +
      'dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800/50',
  } as const;

  const sizes = {
    sm: 'px-3.5 py-2 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6.5 py-3 text-base',
  } as const;

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
