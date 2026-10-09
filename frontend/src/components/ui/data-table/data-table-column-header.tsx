import * as React from 'react';
import { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn('text-xs font-semibold uppercase tracking-wider', className)}>{title}</div>;
  }

  const isSorted = column.getIsSorted();

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      <button
        type="button"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        className={cn(
          'inline-flex items-center gap-1.5 py-1 px-1.5 -ml-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors select-none',
          'hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-slate-100',
          isSorted
            ? 'text-primary dark:text-primary font-bold'
            : 'text-slate-500 dark:text-slate-400'
        )}
        title={
          isSorted === 'desc'
            ? 'Sorted descending. Click to sort ascending.'
            : isSorted === 'asc'
            ? 'Sorted ascending. Click to sort descending.'
            : 'Click to sort.'
        }
      >
        <span>{title}</span>
        {isSorted === 'desc' ? (
          <ArrowDown className="h-3.5 w-3.5 text-primary" />
        ) : isSorted === 'asc' ? (
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
        ) : (
          <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 opacity-60" />
        )}
      </button>
    </div>
  );
}
