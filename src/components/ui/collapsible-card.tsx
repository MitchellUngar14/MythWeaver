'use client';

import { HTMLAttributes, forwardRef, useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleCardProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  icon?: ReactNode;
  defaultCollapsed?: boolean;
  collapsedContent?: ReactNode;
  badge?: string | number;
}

export const CollapsibleCard = forwardRef<HTMLDivElement, CollapsibleCardProps>(
  ({
    className = '',
    title,
    icon,
    defaultCollapsed = false,
    collapsedContent,
    badge,
    children,
    ...props
  }, ref) => {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

    return (
      <div
        ref={ref}
        className={`bg-white dark:bg-gray-800 shadow-lg rounded-xl overflow-hidden ${className}`}
        {...props}
      >
        {/* Header - Always visible */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            {icon && <span className="text-indigo-500">{icon}</span>}
            <h3 className="font-bold text-gray-900 dark:text-gray-100">{title}</h3>
            {badge !== undefined && (
              <span className="px-2 py-0.5 text-xs font-medium bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-full">
                {badge}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isCollapsed && collapsedContent && (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {collapsedContent}
              </div>
            )}
            {isCollapsed ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </button>

        {/* Content - Collapsible */}
        {!isCollapsed && (
          <div className="px-4 pb-4">
            {children}
          </div>
        )}
      </div>
    );
  }
);

CollapsibleCard.displayName = 'CollapsibleCard';
