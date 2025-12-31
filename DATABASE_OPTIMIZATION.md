# Database Optimization Guide

## Overview

This ERP system uses PostgreSQL with optimized indexes, connection pooling, and query optimization strategies to handle large-scale data for multiple schools.

## Optimization Strategies

### 1. Indexing

All tables have strategic indexes on:
- **Primary Keys**: UUID primary keys for fast lookups
- **Foreign Keys**: Indexed for join performance
- **Search Fields**: Full-text search indexes on names
- **Date Fields**: Indexed for range queries (attendance, fees, exams)
- **Status Fields**: Indexed for filtering (is_active, status)
- **Composite Indexes**: Multi-column indexes for common query patterns

#### Example Indexes

```sql
-- Students table
CREATE INDEX idx_students_school_admission ON students(school_id, admission_number);
CREATE INDEX idx_students_class_year ON students(class_id, academic_year);
CREATE INDEX idx_students_name_search ON students USING gin(to_tsvector('english', first_name || ' ' || last_name));

-- Attendance table
CREATE INDEX idx_attendances_student_date ON attendances(student_id, date);
CREATE INDEX idx_attendances_class_date ON attendances(class_id, date);

-- Fees table
CREATE INDEX idx_fees_student_status ON fees(student_id, status);
CREATE INDEX idx_fees_due_date ON fees(due_date) WHERE status = 'pending';
```

### 2. Connection Pooling

Configured in `shared/database/config.ts`:

```typescript
pool: {
  min: 2,        // Minimum connections
  max: 10,       // Maximum connections
  idle: 10000,   // Idle timeout (ms)
  acquire: 30000, // Connection acquisition timeout (ms)
  evict: 1000,   // Eviction interval (ms)
}
```

**Benefits**:
- Reuses connections instead of creating new ones
- Reduces connection overhead
- Prevents connection exhaustion

### 3. Query Optimization

#### Use Select Specific Fields
```typescript
// Good
Student.findAll({ attributes: ['id', 'first_name', 'last_name'] });

// Avoid
Student.findAll(); // Selects all fields
```

#### Use Pagination
```typescript
// Always paginate large result sets
const { count, rows } = await Student.findAndCountAll({
  limit: 20,
  offset: (page - 1) * 20,
});
```

#### Use Eager Loading Wisely
```typescript
// Good - Loads related data in one query
Student.findAll({
  include: [{ model: Class, as: 'class' }],
});

// Avoid N+1 queries
// Bad - Makes separate query for each student
students.forEach(async (student) => {
  const class = await student.getClass();
});
```

#### Use Transactions for Bulk Operations
```typescript
await sequelize.transaction(async (t) => {
  for (const item of items) {
    await Model.create(item, { transaction: t });
  }
});
```

### 4. Caching Strategy

Redis is used for:
- **Frequently accessed data**: Student lists, class information
- **Query results**: Cached for 5 minutes
- **Session data**: User sessions

#### Cache Invalidation
```typescript
// Invalidate cache on updates
await redisClient.del(`student:${id}`);
await redisClient.del(`students:*`); // Pattern matching
```

### 5. Database Configuration

#### PostgreSQL Settings (postgresql.conf)

```ini
# Connection settings
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB

# Query performance
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# I/O optimization
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB

# WAL settings
min_wal_size = 1GB
max_wal_size = 4GB
```

### 6. Partitioning (Future)

For very large tables, consider partitioning:

```sql
-- Partition attendance by month
CREATE TABLE attendances_2024_01 PARTITION OF attendances
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

### 7. Read Replicas (Future)

For scaling reads:
- Set up PostgreSQL read replicas
- Route read queries to replicas
- Keep writes on primary

### 8. Monitoring

#### Key Metrics to Monitor

1. **Connection Pool Usage**
   ```sql
   SELECT count(*) FROM pg_stat_activity;
   ```

2. **Slow Queries**
   ```sql
   SELECT query, mean_exec_time, calls
   FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

3. **Index Usage**
   ```sql
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   WHERE idx_scan = 0;
   ```

4. **Table Sizes**
   ```sql
   SELECT schemaname, tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

### 9. Maintenance Tasks

#### Regular Maintenance

1. **VACUUM**: Clean up dead tuples
   ```sql
   VACUUM ANALYZE;
   ```

2. **REINDEX**: Rebuild indexes
   ```sql
   REINDEX TABLE students;
   ```

3. **Update Statistics**: For query planner
   ```sql
   ANALYZE;
   ```

#### Automated Maintenance

Set up cron jobs or pg_cron:

```sql
-- Run VACUUM daily at 2 AM
SELECT cron.schedule('vacuum-daily', '0 2 * * *', 'VACUUM ANALYZE;');

-- Update statistics weekly
SELECT cron.schedule('analyze-weekly', '0 3 * * 0', 'ANALYZE;');
```

### 10. Query Performance Tips

1. **Use EXPLAIN ANALYZE**
   ```sql
   EXPLAIN ANALYZE SELECT * FROM students WHERE school_id = '...';
   ```

2. **Avoid SELECT ***
   - Only select needed columns
   - Reduces I/O and memory usage

3. **Use LIMIT**
   - Always limit result sets
   - Prevents memory issues

4. **Use Appropriate Data Types**
   - UUID for IDs (good for distributed systems)
   - DATE for dates (not TIMESTAMP if time not needed)
   - DECIMAL for money (not FLOAT)

5. **Normalize Data**
   - Follow 3NF where possible
   - Denormalize only for performance-critical queries

## Performance Benchmarks

### Expected Performance

- **Student Lookup**: < 10ms (with index)
- **Attendance Marking**: < 50ms (bulk)
- **Fee Payment**: < 100ms (with ERPNext sync)
- **Report Generation**: < 2s (for 1000 records)

### Scaling Targets

- **Students per School**: 10,000+
- **Total Students**: 100,000+
- **Daily Attendance Records**: 100,000+
- **Concurrent Users**: 500+

## Troubleshooting

### Slow Queries

1. Check if indexes are being used: `EXPLAIN ANALYZE`
2. Verify statistics are up to date: `ANALYZE`
3. Check for missing indexes
4. Consider query rewriting

### Connection Pool Exhaustion

1. Increase `max_connections` in PostgreSQL
2. Increase pool size in application
3. Check for connection leaks
4. Use connection timeouts

### High Memory Usage

1. Reduce `work_mem` for complex queries
2. Use pagination
3. Limit result sets
4. Check for memory leaks in application

## Best Practices

1. **Always use transactions** for multi-step operations
2. **Index foreign keys** for join performance
3. **Use prepared statements** (Sequelize does this automatically)
4. **Monitor query performance** regularly
5. **Keep statistics updated** with ANALYZE
6. **Use connection pooling** (already configured)
7. **Cache frequently accessed data** (Redis)
8. **Partition large tables** when needed
9. **Use read replicas** for scaling reads
10. **Regular maintenance** (VACUUM, REINDEX)


