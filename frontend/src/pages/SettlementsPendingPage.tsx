import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { Link } from 'react-router-dom';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, CheckCircle2 } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import { formatCurrency, formatDate } from '../utils/format';
import { DataTable, DataTableColumnHeader } from '../components/ui/data-table';
import {
  Button,
  Badge,
} from '../components/ui';

export const SettlementsPendingPage: React.FC = () => {
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSettlements = async () => {
    setLoading(true);
    try {
      const companyFilter = sessionStorage.getItem('companyFilter') || 'ALL';
      const companyQuery = companyFilter !== 'ALL' ? `?companyId=${companyFilter}` : '';
      const res = await api.get(`/settlements/pending${companyQuery}`);
      setSettlements(res.data || []);
    } catch (e) {
      console.error('Failed to load pending settlements list', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettlements();
    window.addEventListener('companyFilterChanged', loadSettlements);
    return () => {
      window.removeEventListener('companyFilterChanged', loadSettlements);
    };
  }, []);

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
            aria-label="Select all"
            className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer"
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={(e) => row.toggleSelected(!!e.target.checked)}
            aria-label="Select row"
            className="rounded border-input text-primary focus:ring-ring h-4 w-4 cursor-pointer"
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: 'requestNumber',
        accessorFn: (row) => row.request?.requestNumber || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Request #" />
        ),
        cell: ({ row }) => {
          const st = row.original;
          return (
            <Link
              to={`/requests/${st.request?.requestNumber || st.request?.id}`}
              className="text-primary hover:underline font-bold"
            >
              {st.request?.requestNumber || '—'}
            </Link>
          );
        },
      },
      {
        id: 'employee',
        accessorFn: (row) => row.request?.user?.fullName || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Employee" />
        ),
        cell: ({ row }) => {
          const st = row.original;
          return (
            <div>
              <p className="font-semibold text-foreground text-xs">
                {st.request?.user?.fullName}
              </p>
              {st.request?.user?.employeeNumber && (
                <p className="text-[10px] text-muted-foreground">
                  Emp #: {st.request?.user?.employeeNumber}
                </p>
              )}
            </div>
          );
        },
      },
      {
        id: 'company',
        accessorFn: (row) => row.request?.company?.name || '',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Company" />
        ),
        cell: ({ row }) => {
          const st = row.original;
          const isSomtel = st.request?.company?.name === 'Somtel';
          const isBluekom = st.request?.company?.name === 'Bluekom';
          return (
            <Badge variant={isSomtel ? 'warning' : isBluekom ? 'info' : 'secondary'} size="sm">
              {st.request?.company?.name || '—'}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'actualExpenseAmount',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Actual Spent" />
          </div>
        ),
        cell: ({ row }) => {
          const st = row.original;
          return (
            <div className="text-right font-bold text-foreground">
              {formatCurrency(st.actualExpenseAmount, st.request?.currency)}
            </div>
          );
        },
      },
      {
        accessorKey: 'remainingBalance',
        header: ({ column }) => (
          <div className="text-right">
            <DataTableColumnHeader column={column} title="Remaining Balance" />
          </div>
        ),
        cell: ({ row }) => {
          const st = row.original;
          const bal = Number(st.remainingBalance);
          return (
            <div
              className={`text-right font-semibold ${
                bal > 0
                  ? 'text-amber-600 dark:text-amber-400'
                  : bal < 0
                  ? 'text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              {formatCurrency(st.remainingBalance, st.request?.currency)}
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Submitted Date" />
        ),
        cell: ({ row }) => (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className="text-center">Action</div>,
        cell: ({ row }) => {
          const st = row.original;
          return (
            <div className="text-center">
              <Link to={`/requests/${st.request?.requestNumber || st.request?.id}`}>
                <Button variant="outline" size="xs" className="gap-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Audit
                </Button>
              </Link>
            </div>
          );
        },
      },
    ],
    []
  );

  return (
    <div className="space-y-4 font-sans">
      <div>
        <h2 className="text-lg font-bold text-foreground">Settlement Audits</h2>
        <p className="text-xs text-muted-foreground">Review employee expenses and receipts</p>
      </div>

      <DataTable
        columns={columns}
        data={settlements}
        isLoading={loading}
        searchPlaceholder="Filter settlements by request #, employee..."
        pageSize={20}
        pageSizeOptions={[10, 20, 50, 100]}
        emptyState={
          <EmptyState
            icon={CheckCircle2}
            title="All caught up!"
            description="No pending settlement audits found."
          />
        }
      />
    </div>
  );
};

export default SettlementsPendingPage;
