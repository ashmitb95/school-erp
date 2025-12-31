import React, { useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { ArrowLeft, Users, BookOpen, User, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import styles from './ClassDetail.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const ClassDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: classData, isLoading } = useQuery(
    ['class', id],
    async () => {
      const response = await api.get(`/management/classes/${id}`);
      return response.data;
    },
    { enabled: !!id }
  );

  const studentColumnDefs: ColDef[] = useMemo(() => [
    {
      headerName: 'Admission No.',
      field: 'admission_number',
      width: 150,
      pinned: 'left',
      cellRenderer: (params: ICellRendererParams) => (
        <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
          {params.value}
        </div>
      ),
    },
    {
      headerName: 'Name',
      field: 'first_name',
      width: 200,
      cellRenderer: (params: ICellRendererParams) => {
        const student = params.data;
        return (
          <div>
            <div style={{ fontWeight: 600 }}>
              {student.first_name} {student.middle_name || ''} {student.last_name}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {student.roll_number}
            </div>
          </div>
        );
      },
    },
    {
      headerName: 'Gender',
      field: 'gender',
      width: 100,
      cellRenderer: (params: ICellRendererParams) => (
        <span style={{ textTransform: 'capitalize' }}>{params.value}</span>
      ),
    },
    {
      headerName: 'Section',
      field: 'section',
      width: 100,
    },
    {
      headerName: 'Father\'s Phone',
      field: 'father_phone',
      width: 150,
    },
  ], []);

  const defaultColDef = useMemo(() => ({
    sortable: true,
    filter: true,
    resizable: true,
  }), []);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading class details...</div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>Class not found</div>
        <Link to="/classes">
          <Button variant="outline" icon={<ArrowLeft size={18} />}>
            Back to Classes
          </Button>
        </Link>
      </div>
    );
  }

  const students = classData.students || [];
  const studentCount = students.length;
  const capacity = classData.capacity || 0;
  const occupancyPercent = capacity > 0 ? (studentCount / capacity) * 100 : 0;

  return (
    <div className={styles.container}>
      <Link to="/classes" className={styles.backLink}>
        <Button variant="ghost" icon={<ArrowLeft size={18} />}>
          Back to Classes
        </Button>
      </Link>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{classData.name}</h1>
          <p className={styles.subtitle}>Class Code: {classData.code} • Level: Grade {classData.level}</p>
        </div>
      </div>

      <div className={styles.infoGrid}>
        <Card className={styles.infoCard}>
          <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
            <BookOpen size={20} />
          </div>
          <div>
            <div className={styles.infoLabel}>Academic Year</div>
            <div className={styles.infoValue}>{classData.academic_year}</div>
          </div>
        </Card>

        <Card className={styles.infoCard}>
          <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-info)20', color: 'var(--color-info)' }}>
            <Users size={20} />
          </div>
          <div>
            <div className={styles.infoLabel}>Students</div>
            <div className={styles.infoValue}>{studentCount} / {capacity}</div>
          </div>
        </Card>

        <Card className={styles.infoCard}>
          <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
            <TrendingUp size={20} />
          </div>
          <div>
            <div className={styles.infoLabel}>Occupancy</div>
            <div className={styles.infoValue}>{occupancyPercent.toFixed(0)}%</div>
          </div>
        </Card>

        {classData.class_teacher && (
          <Card className={styles.infoCard}>
            <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-success)20', color: 'var(--color-success)' }}>
              <User size={20} />
            </div>
            <div>
              <div className={styles.infoLabel}>Class Teacher</div>
              <div className={styles.infoValue}>
                {classData.class_teacher.first_name} {classData.class_teacher.last_name}
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className={styles.studentsCard}>
        <h2 className={styles.sectionTitle}>Students ({studentCount})</h2>
        <div className="ag-theme-alpine" style={{ height: '500px', width: '100%', marginTop: '1rem' }}>
          <AgGridReact
            rowData={students}
            columnDefs={studentColumnDefs}
            defaultColDef={defaultColDef}
            pagination={true}
            paginationPageSize={20}
            animateRows={true}
            enableCellTextSelection={true}
            suppressCellFocus={true}
            getRowId={(params) => params.data.id}
          />
        </div>
      </Card>
    </div>
  );
};

export default ClassDetail;

