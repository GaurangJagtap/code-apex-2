import * as React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'accent';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
    let baseStyles = 'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    let variantStyles = '';
    switch (variant) {
      case 'default':
        variantStyles = 'bg-[#1e293b] text-white hover:bg-[#0f172a] shadow-sm';
        break;
      case 'secondary':
        variantStyles = 'bg-[#f1f5f9] text-[#0f172a] hover:bg-[#e2e8f0]';
        break;
      case 'outline':
        variantStyles = 'border border-[#e2e8f0] bg-transparent text-[#0f172a] hover:bg-[#f8fafc]';
        break;
      case 'ghost':
        variantStyles = 'bg-transparent text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]';
        break;
      case 'accent':
        variantStyles = 'bg-[#4f46e5] text-white hover:bg-[#4338ca] shadow-sm';
        break;
      case 'destructive':
        variantStyles = 'bg-[#ef4444] text-white hover:bg-[#dc2626]';
        break;
    }

    let sizeStyles = '';
    switch (size) {
      case 'default':
        sizeStyles = 'h-10 py-2 px-4 text-sm rounded-lg';
        break;
      case 'sm':
        sizeStyles = 'h-8 px-3 text-xs rounded-md';
        break;
      case 'lg':
        sizeStyles = 'h-12 px-6 text-base rounded-full';
        break;
      case 'icon':
        sizeStyles = 'h-10 w-10 p-2 rounded-full';
        break;
    }

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
