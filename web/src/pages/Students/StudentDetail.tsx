import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import styles from './StudentDetail.module.css';

const StudentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: student, isLoading } = useQuery(
    ['student', id],
    async () => {
      const response = await api.get(`/student/${id}`);
      return response.data;
    },
    { enabled: !!id }
  );

  if (isLoading) return <div>Loading...</div>;
  if (!student) return <div>Student not found</div>;

  return (
    <div className={styles.container}>
      <Link to="/students" className={styles.backLink}>
        <Button variant="ghost" icon={<ArrowLeft size={18} />}>
          Back to Students
        </Button>
      </Link>

      <Card className={styles.profileCard}>
        <div className={styles.header}>
          <div className={styles.avatar}>
            {student.first_name[0]}{student.last_name[0]}
          </div>
          <div>
            <h1 className={styles.name}>
              {student.first_name} {student.middle_name} {student.last_name}
            </h1>
            <p className={styles.admissionNumber}>{student.admission_number}</p>
          </div>
        </div>

        <div className={styles.details}>
          <div className={styles.section}>
            <h3>Personal Information</h3>
            <div className={styles.grid}>
              <div>
                <label>Date of Birth</label>
                <p>{new Date(student.date_of_birth).toLocaleDateString()}</p>
              </div>
              <div>
                <label>Gender</label>
                <p>{student.gender}</p>
              </div>
              <div>
                <label>Blood Group</label>
                <p>{student.blood_group || 'N/A'}</p>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Academic Information</h3>
            <div className={styles.grid}>
              <div>
                <label>Class</label>
                <p>{student.class?.name}</p>
              </div>
              <div>
                <label>Section</label>
                <p>{student.section || 'N/A'}</p>
              </div>
              <div>
                <label>Academic Year</label>
                <p>{student.academic_year}</p>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <h3>Contact Information</h3>
            <div className={styles.grid}>
              <div>
                <label>Father's Name</label>
                <p>{student.father_name}</p>
              </div>
              <div>
                <label>Father's Phone</label>
                <p>{student.father_phone}</p>
              </div>
              <div>
                <label>Mother's Name</label>
                <p>{student.mother_name}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default StudentDetail;


