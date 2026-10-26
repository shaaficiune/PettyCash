import * as React from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Search, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../table';
import { DataTablePagination } from './data-table-pagination';
import { DataTableViewOptions } from './data-table-view-options';
import { EmptyState } from '../EmptyState';
import { cn } from '../../../lib/utils';

export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  toolbarActions?: React.ReactNode;
  toolbarFilters?: React.ReactNode;
  pageSize?: number;
  pageSizeOptions?: number[];
  showColumnVisibility?: boolean;
  showPagination?: boolean;
  showSelectedCount?: boolean;
  onRowClick?: (row: TData) => void;
  onRowSelectionChange?: (selectedRows: TData[]) => void;
  className?: string;
  tableClassName?: string;
  dense?: boolean;
  renderMobileCard?: (item: TData, index: number) => React.ReactNode;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  isLoading = false,
  emptyState,
  toolbarActions,
  toolbarFilters,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 50, 100],
  showColumnVisibility = true,
  showPagination = true,
  showSelectedCount = true,
  onRowClick,
  onRowSelectionChange,
  className,
  tableClassName,
  dense = false,
  renderMobileCard,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState('');

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: searchKey ? undefined : globalFilter,
    },
    initialState: {
      pagination: {
        pageSize,
      },
    },
    enableRowSelection: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  // Notify parent on row selection change if callback provided
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const selected = table
        .getSelectedRowModel()
        .rows.map((r) => r.original);
      onRowSelectionChange(selected);
    }
  }, [rowSelection, table, onRowSelectionChange]);

  const searchValue = searchKey
    ? (table.getColumn(searchKey)?.getFilterValue() as string) ?? ''
    : globalFilter;

  const handleSearchChange = (value: string) => {
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(value);
    } else {
      setGlobalFilter(value);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary shadow-sm transition-all"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                title="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Custom Filters (e.g. status, region, date preset) */}
          {toolbarFilters}
        </div>

        {/* Right Toolbar Actions & View Options */}
        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          {toolbarActions}
          {showColumnVisibility && <DataTableViewOptions table={table} />}
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div
        className={cn(
          'rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm transition-colors',
          renderMobileCard ? 'hidden md:block overflow-x-auto' : 'overflow-x-auto'
        )}
      >
        <Table className={cn('w-full table-auto', tableClassName)}>
          <TableHeader className="bg-slate-50/80 dark:bg-slate-800/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(dense ? 'px-2 py-1.5 text-[11px] h-8 whitespace-nowrap' : 'px-3.5 py-2.5 text-xs')}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="animate-pulse">
                  {columns.map((_, colIdx) => (
                    <TableCell
                      key={`skeleton-cell-${colIdx}`}
                      className={cn(dense ? 'py-1.5 px-2' : 'py-4 px-3.5')}
                    >
                      <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  onClick={() => onRowClick && onRowClick(row.original)}
                  className={cn(
                    onRowClick && 'cursor-pointer'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(dense ? 'px-2 py-1.5 text-xs' : 'px-3.5 py-3 text-sm')}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              // Empty State
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-48 text-center p-0"
                >
                  {emptyState || (
                    <EmptyState
                      title="No results found"
                      description="Try clearing or adjusting your search filters."
                    />
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* PAGINATION for desktop (when no mobile card view is used) */}
        {!renderMobileCard && showPagination && (
          <DataTablePagination
            table={table}
            pageSizeOptions={pageSizeOptions}
            showSelectedCount={showSelectedCount}
          />
        )}
      </div>

      {/* MOBILE CARDS VIEW (renders on screens < md) */}
      {renderMobileCard && (
        <div className="md:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={`mobile-skeleton-${i}`}
                className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm animate-pulse space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-28"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16"></div>
                </div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            ))
          ) : table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row, idx) => (
              <div
                key={row.id}
                onClick={() => onRowClick && onRowClick(row.original)}
                className={cn(onRowClick && 'cursor-pointer')}
              >
                {renderMobileCard(row.original, idx)}
              </div>
            ))
          ) : (
            <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-sm">
              {emptyState || (
                <EmptyState
                  title="No results found"
                  description="Try clearing or adjusting your search filters."
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* SHARED PAGINATION (When mobile card view is active, placed below both views) */}
      {renderMobileCard && showPagination && (
        <div className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          <DataTablePagination
            table={table}
            pageSizeOptions={pageSizeOptions}
            showSelectedCount={showSelectedCount}
          />
        </div>
      )}
    </div>
  );
}
