'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveContainer({ children, className }: ResponsiveContainerProps) {
  return (
    <div className={cn('container-responsive space-y-responsive', className)}>
      {children}
    </div>
  );
}

interface ResponsiveGridProps {
  children: ReactNode;
  cols?: 2 | 3 | 4;
  className?: string;
}

export function ResponsiveGrid({ children, cols = 3, className }: ResponsiveGridProps) {
  const gridClass = cols === 2 ? 'grid-responsive-2' : 
                    cols === 3 ? 'grid-responsive-3' : 
                    'grid-responsive-4';
  
  return (
    <div className={cn(gridClass, className)}>
      {children}
    </div>
  );
}

interface ResponsiveCardProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveCard({ children, className }: ResponsiveCardProps) {
  return (
    <div className={cn('card-responsive p-responsive', className)}>
      {children}
    </div>
  );
}

interface ResponsiveTableWrapperProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveTableWrapper({ children, className }: ResponsiveTableWrapperProps) {
  return (
    <div className={cn('table-responsive custom-scrollbar', className)}>
      {children}
    </div>
  );
}

interface ResponsiveDialogContentProps {
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export function ResponsiveDialogContent({ children, className, size = 'md' }: ResponsiveDialogContentProps) {
  const sizeClass = {
    sm: 'max-w-[95vw] sm:max-w-md',
    md: 'max-w-[95vw] sm:max-w-lg md:max-w-2xl',
    lg: 'max-w-[95vw] sm:max-w-2xl md:max-w-4xl',
    xl: 'max-w-[95vw] sm:max-w-4xl md:max-w-6xl',
    full: 'max-w-[95vw] sm:max-w-[90vw]'
  }[size];
  
  return (
    <div className={cn(sizeClass, 'max-h-[90vh] overflow-y-auto', className)}>
      {children}
    </div>
  );
}

interface ResponsiveButtonGroupProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveButtonGroup({ children, className }: ResponsiveButtonGroupProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row gap-2 sm:gap-3', className)}>
      {children}
    </div>
  );
}

interface ResponsiveTextProps {
  children: ReactNode;
  size?: 'sm' | 'base' | 'lg' | 'xl' | '2xl';
  className?: string;
}

export function ResponsiveText({ children, size = 'base', className }: ResponsiveTextProps) {
  const sizeClass = {
    sm: 'text-responsive-sm',
    base: 'text-responsive-base',
    lg: 'text-responsive-lg',
    xl: 'text-responsive-xl',
    '2xl': 'text-responsive-2xl'
  }[size];
  
  return (
    <span className={cn(sizeClass, className)}>
      {children}
    </span>
  );
}
