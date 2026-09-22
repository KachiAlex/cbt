import React from 'react';
import { ButtonSpinner } from './LoadingSpinner';

const EnhancedButton = ({
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'medium',
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
  tooltip,
  ...props
}) => {
  const baseClasses = `
    inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
    ${fullWidth ? 'w-full' : ''}
  `.trim();

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-sm',
    large: 'px-6 py-3 text-base',
    xlarge: 'px-8 py-4 text-lg'
  };

  const variantClasses = {
    primary: `
      bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500
      active:bg-blue-800
    `,
    secondary: `
      bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500
      active:bg-gray-800
    `,
    success: `
      bg-green-600 text-white hover:bg-green-700 focus:ring-green-500
      active:bg-green-800
    `,
    danger: `
      bg-red-600 text-white hover:bg-red-700 focus:ring-red-500
      active:bg-red-800
    `,
    warning: `
      bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500
      active:bg-yellow-800
    `,
    outline: `
      border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white focus:ring-blue-500
      active:bg-blue-700
    `,
    ghost: `
      text-blue-600 hover:bg-blue-50 focus:ring-blue-500
      active:bg-blue-100
    `,
    link: `
      text-blue-600 hover:text-blue-800 hover:underline focus:ring-blue-500
      p-0
    `
  };

  const buttonClasses = `
    ${baseClasses}
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${className}
  `.trim();

  const isDisabled = disabled || loading;

  const handleClick = (e) => {
    if (!isDisabled && onClick) {
      onClick(e);
    }
  };

  const buttonContent = (
    <>
      {loading && <ButtonSpinner className="mr-2" />}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </>
  );

  const button = (
    <button
      type={type}
      className={buttonClasses}
      disabled={isDisabled}
      onClick={handleClick}
      {...props}
    >
      {buttonContent}
    </button>
  );

  if (tooltip) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
          {tooltip}
        </div>
      </div>
    );
  }

  return button;
};

// Pre-configured button variants
export const PrimaryButton = (props) => (
  <EnhancedButton variant="primary" {...props} />
);

export const SecondaryButton = (props) => (
  <EnhancedButton variant="secondary" {...props} />
);

export const SuccessButton = (props) => (
  <EnhancedButton variant="success" {...props} />
);

export const DangerButton = (props) => (
  <EnhancedButton variant="danger" {...props} />
);

export const WarningButton = (props) => (
  <EnhancedButton variant="warning" {...props} />
);

export const OutlineButton = (props) => (
  <EnhancedButton variant="outline" {...props} />
);

export const GhostButton = (props) => (
  <EnhancedButton variant="ghost" {...props} />
);

export const LinkButton = (props) => (
  <EnhancedButton variant="link" {...props} />
);

// Icon button
export const IconButton = ({ 
  icon, 
  'aria-label': ariaLabel, 
  size = 'medium',
  variant = 'ghost',
  ...props 
}) => {
  const sizeClasses = {
    small: 'p-1.5',
    medium: 'p-2',
    large: 'p-3',
    xlarge: 'p-4'
  };

  return (
    <EnhancedButton
      variant={variant}
      size={size}
      icon={icon}
      className={`${sizeClasses[size]} !px-0 !py-0`}
      aria-label={ariaLabel}
      {...props}
    >
      {null}
    </EnhancedButton>
  );
};

// Button group
export const ButtonGroup = ({ 
  children, 
  orientation = 'horizontal',
  spacing = 'gap-2',
  className = ''
}) => {
  const orientationClasses = {
    horizontal: 'flex-row',
    vertical: 'flex-col'
  };

  return (
    <div className={`flex ${orientationClasses[orientation]} ${spacing} ${className}`}>
      {children}
    </div>
  );
};

// Loading button with async operation
export const AsyncButton = ({ 
  onClick, 
  loadingText = 'Loading...',
  children,
  onSuccess,
  onError,
  ...props 
}) => {
  const [loading, setLoading] = React.useState(false);

  const handleClick = async (e) => {
    if (loading) return;

    try {
      setLoading(true);
      const result = await onClick(e);
      if (onSuccess) {
        onSuccess(result);
      }
    } catch (error) {
      if (onError) {
        onError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <EnhancedButton
      loading={loading}
      onClick={handleClick}
      {...props}
    >
      {loading ? loadingText : children}
    </EnhancedButton>
  );
};

// Confirmation button
export const ConfirmButton = ({ 
  onConfirm, 
  confirmMessage = 'Are you sure?',
  confirmTitle = 'Confirm Action',
  children,
  ...props 
}) => {
  const handleClick = (e) => {
    if (window.confirm(`${confirmTitle}\n\n${confirmMessage}`)) {
      onConfirm(e);
    }
  };

  return (
    <EnhancedButton onClick={handleClick} {...props}>
      {children}
    </EnhancedButton>
  );
};

export default EnhancedButton;
