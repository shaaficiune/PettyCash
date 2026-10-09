import * as React from 'react';
import { Table } from '@tanstack/react-table';
import { SlidersHorizontal, Check } from 'lucide-react';
import { cn } from '../../../lib/utils';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const columns = table
    .getAllColumns()
    .filter(
      (column) =>
        typeof column.accessorFn !== 'undefined' && column.getCanHide()
    );

  if (columns.length === 0) return null;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-sm transition-colors',
          'hover:bg-slate-50 dark:hover:bg-slate-700/80 focus:outline-none focus:ring-1 focus:ring-primary',
          open && 'bg-slate-100 dark:bg-slate-700'
        )}
        title="Toggle visible columns"
      >
        <SlidersHorizontal className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400" />
        <span>Columns</span>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-48 origin-top-right rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-1.5 shadow-lg ring-1 ring-black/5 dark:ring-white/10 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-2 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700/50 mb-1">
            Toggle Columns
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5">
            {columns.map((column) => {
              const isVisible = column.getIsVisible();
              const headerValue = column.columnDef.header;
              const title =
                typeof headerValue === 'string'
                  ? headerValue
                  : (column.columnDef.meta as any)?.title || column.id;

              return (
                <button
                  key={column.id}
                  type="button"
                  onClick={() => column.toggleVisibility(!isVisible)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left"
                >
                  <span className="capitalize truncate">{title}</span>
                  <div
                    className={cn(
                      'ml-2 flex h-4 w-4 items-center justify-center rounded border transition-colors',
                      isVisible
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                    )}
                  >
                    {isVisible && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
