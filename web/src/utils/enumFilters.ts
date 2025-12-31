/**
 * Enum value mappings for AG Grid set filters
 * Maps field names to their possible enum values
 */

export const ENUM_VALUES: Record<string, string[]> = {
  // Student & Staff
  gender: ['male', 'female', 'other'],
  
  // Attendance
  status: ['present', 'absent', 'late', 'excused'], // For attendance
  
  // Fee
  fee_status: ['pending', 'paid', 'partial', 'waived'],
  
  // Exam
  exam_type: ['unit_test', 'mid_term', 'final', 'assignment', 'quiz', 'project'],
  
  // Calendar Event
  event_type: ['org', 'class', 'admin', 'teacher_global'],
  target_audience: ['all_teachers', 'all_staff', 'all_students', 'specific_class', 'admins_only'],
  
  // Notification
  recipient_type: ['student', 'staff', 'parent', 'all'],
  notification_type: ['info', 'alert', 'reminder', 'announcement'],
  priority: ['low', 'medium', 'high'],
  
  // Library Transaction
  transaction_type: ['issue', 'return', 'renew'],
  library_status: ['active', 'returned', 'overdue'],
  
  // Transport Route
  is_active: ['true', 'false'],
  
  // Staff
  designation: ['Teacher', 'Administrator', 'Principal', 'Vice Principal', 'Accountant', 'Librarian', 'Clerk', 'Security', 'Maintenance'],
  
  // Exam Status (computed)
  exam_status: ['upcoming', 'ongoing', 'completed'],
};

/**
 * Format enum value for display
 */
export const formatEnumValue = (value: string): string => {
  if (!value) return '';
  
  // Handle boolean strings
  if (value === 'true') return 'Yes';
  if (value === 'false') return 'No';
  
  // Handle snake_case
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Get enum values for a field
 */
export const getEnumValues = (field: string): string[] | undefined => {
  return ENUM_VALUES[field];
};

/**
 * Check if a field is an enum field
 */
export const isEnumField = (field: string): boolean => {
  return field in ENUM_VALUES;
};

/**
 * Create AG Grid set filter params for enum fields
 */
export const createSetFilterParams = (field: string) => {
  const values = getEnumValues(field);
  if (!values) return undefined;
  
  return {
    values: values,
    cellRenderer: (params: any) => {
      return formatEnumValue(params.value || '');
    },
    valueFormatter: (params: any) => {
      return formatEnumValue(params.value || '');
    },
  };
};

