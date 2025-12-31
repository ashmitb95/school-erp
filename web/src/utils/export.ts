/**
 * Export utility functions for generating CSV/Excel files
 */

export interface ExportOptions {
  filename?: string;
  includeHeaders?: boolean;
}

/**
 * Export data to CSV
 */
export function exportToCSV(
  data: any[],
  columns: { key: string; label: string }[],
  options: ExportOptions = {}
): void {
  const { filename, includeHeaders = true } = options;

  // Generate CSV content
  const rows: string[] = [];

  // Add headers
  if (includeHeaders) {
    rows.push(columns.map((col) => escapeCSVValue(col.label)).join(','));
  }

  // Add data rows
  data.forEach((item) => {
    const row = columns.map((col) => {
      const value = getNestedValue(item, col.key);
      return escapeCSVValue(value);
    });
    rows.push(row.join(','));
  });

  const csv = rows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `export-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, prop) => current?.[prop], obj) ?? '';
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

/**
 * Export dashboard data
 */
export function exportDashboardData(stats: any, data: any): void {
  const columns = [
    { key: 'metric', label: 'Metric' },
    { key: 'value', label: 'Value' },
  ];

  const exportData = [
    { metric: 'Total Students', value: stats?.students || 0 },
    { metric: 'Pending Fees', value: stats?.pendingFees || 0 },
    { metric: 'Attendance Today (%)', value: `${stats?.attendancePercent || 0}%` },
    { metric: 'Present Today', value: stats?.presentToday || 0 },
    { key: 'Absent Today', value: stats?.absentToday || 0 },
    { metric: 'Late Today', value: stats?.lateToday || 0 },
    { metric: 'Upcoming Exams', value: stats?.upcomingExams || 0 },
  ];

  exportToCSV(exportData, columns, {
    filename: `dashboard-export-${new Date().toISOString().split('T')[0]}.csv`,
  });
}

