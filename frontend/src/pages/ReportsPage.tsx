import React from 'react';
import { Navigate } from 'react-router-dom';

/**
 * @deprecated ReportsPage has been deprecated.
 * System Audit & Analytics have been moved to SettingsPage (/settings)
 * and official financial book exports are consolidated in TransactionsPage (/transactions).
 */
export const ReportsPage: React.FC = () => {
  return <Navigate to="/settings" replace />;
};

export default ReportsPage;
