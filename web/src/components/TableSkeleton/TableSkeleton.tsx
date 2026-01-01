import React from 'react';
import styles from './TableSkeleton.module.css';

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton: React.FC<TableSkeletonProps> = ({ rows = 10, columns = 6 }) => {
  return (
    <div className={styles.skeletonTable}>
      <div className={styles.skeletonHeader}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className={styles.skeletonHeaderCell} />
        ))}
      </div>
      <div className={styles.skeletonBody}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className={styles.skeletonRow}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className={styles.skeletonCell}>
                <div className={styles.skeletonBar} style={{ width: `${Math.random() * 40 + 60}%` }} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TableSkeleton;


