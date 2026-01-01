import React from 'react';
import styles from './TableWrapper.module.css';

interface TableWrapperProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component for AG Grid tables to ensure proper mobile responsiveness
 * Provides horizontal scroll on mobile devices
 */
const TableWrapper: React.FC<TableWrapperProps> = ({ children, className = '' }) => {
  return (
    <div className={`${styles.tableWrapper} ${className}`}>
      {children}
    </div>
  );
};

export default TableWrapper;



