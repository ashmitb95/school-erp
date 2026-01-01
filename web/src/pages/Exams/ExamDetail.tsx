import React, { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, ICellRendererParams } from 'ag-grid-community';
import { AgChartsReact } from 'ag-charts-react';
import { ArrowLeft, BookOpen, Calendar, TrendingUp, BarChart3, PieChart, Download } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { exportToCSV } from '../../utils/export';
import Card from '../../components/Card/Card';
import Button from '../../components/Button/Button';
import TableSkeleton from '../../components/TableSkeleton/TableSkeleton';
import styles from './ExamDetail.module.css';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

const ExamDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { showSuccess, showError, showWarning } = useToast();

    const { data: exam, isLoading } = useQuery(
        ['exam', id],
        async () => {
            const response = await api.get(`/exam/${id}`);
            return response.data;
        },
        { enabled: !!id }
    );

    const { data: results, isLoading: resultsLoading } = useQuery(
        ['exam-results', id],
        async () => {
            const response = await api.get(`/exam/${id}/results?limit=10000`);
            return response.data;
        },
        { enabled: !!id }
    );

    // Grade distribution chart
    const gradeChartOptions = useMemo(() => {
        if (!results?.data) return null;

        const gradeDist: Record<string, number> = {};
        results.data.forEach((result: any) => {
            const grade = result.grade || 'Ungraded';
            gradeDist[grade] = (gradeDist[grade] || 0) + 1;
        });

        return {
            data: Object.entries(gradeDist).map(([grade, count]) => ({ grade, count })),
            series: [{
                type: 'pie' as const,
                angleKey: 'count',
                labelKey: 'grade',
                outerRadiusRatio: 0.8,
                innerRadiusRatio: 0.5,
            }],
            legend: {
                enabled: true,
                position: 'right' as const,
            },
        };
    }, [results]);

    // Performance distribution chart
    const performanceChartOptions = useMemo(() => {
        if (!results?.data || !exam) return null;

        const performanceRanges = [
            { range: '90-100%', min: 90, max: 100, count: 0 },
            { range: '80-89%', min: 80, max: 89, count: 0 },
            { range: '70-79%', min: 70, max: 79, count: 0 },
            { range: '60-69%', min: 60, max: 69, count: 0 },
            { range: 'Below 60%', min: 0, max: 59, count: 0 },
        ];

        results.data.forEach((result: any) => {
            const percentage = (result.marks_obtained / result.max_marks) * 100;
            const range = performanceRanges.find(r => percentage >= r.min && percentage <= r.max);
            if (range) range.count++;
        });

        return {
            data: performanceRanges,
            series: [{
                type: 'bar' as const,
                xKey: 'range',
                yKey: 'count',
                fill: 'var(--color-primary)',
                stroke: 'var(--color-primary)',
            }],
            axes: [
                {
                    type: 'category' as const,
                    position: 'bottom' as const,
                    title: { text: 'Performance Range' },
                },
                {
                    type: 'number' as const,
                    position: 'left' as const,
                    title: { text: 'Number of Students' },
                },
            ],
        };
    }, [results, exam]);

    const handleExport = () => {
        if (!results?.data) {
            showWarning('No results to export');
            return;
        }

        try {
            const columns = [
                { key: 'studentName', label: 'Student Name' },
                { key: 'admission_number', label: 'Admission Number' },
                { key: 'subject.name', label: 'Subject' },
                { key: 'marks_obtained', label: 'Marks Obtained' },
                { key: 'max_marks', label: 'Max Marks' },
                { key: 'percentage', label: 'Percentage' },
                { key: 'grade', label: 'Grade' },
                { key: 'remarks', label: 'Remarks' },
            ];

            const exportData = results.data.map((result: any) => {
                const percentage = result.max_marks > 0
                    ? ((result.marks_obtained / result.max_marks) * 100).toFixed(2)
                    : '0';
                return {
                    ...result,
                    studentName: `${result.student?.first_name} ${result.student?.last_name}`,
                    admission_number: result.student?.admission_number || '',
                    percentage,
                };
            });

            exportToCSV(exportData, columns, {
                filename: `exam-results-${exam?.name || 'exam'}-${new Date().toISOString().split('T')[0]}.csv`,
            });

            showSuccess('Exam results exported successfully!');
        } catch (error) {
            showError('Failed to export exam results');
        }
    };

    const columnDefs: ColDef[] = useMemo(() => [
        {
            headerName: 'Student',
            field: 'student',
            width: 200,
            cellRenderer: (params: ICellRendererParams) => {
                const student = params.value;
                if (!student) return 'N/A';
                return (
                    <div>
                        <div style={{ fontWeight: 600 }}>
                            {student.first_name} {student.last_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                            {student.admission_number}
                        </div>
                    </div>
                );
            },
        },
        {
            headerName: 'Subject',
            field: 'subject',
            width: 150,
            cellRenderer: (params: ICellRendererParams) => {
                const subject = params.value;
                return subject?.name || 'N/A';
            },
        },
        {
            headerName: 'Marks Obtained',
            field: 'marks_obtained',
            width: 140,
            cellRenderer: (params: ICellRendererParams) => (
                <div style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                    {params.value}
                </div>
            ),
        },
        {
            headerName: 'Max Marks',
            field: 'max_marks',
            width: 120,
        },
        {
            headerName: 'Percentage',
            field: 'percentage',
            width: 120,
            valueGetter: (params) => {
                const marks = params.data.marks_obtained;
                const max = params.data.max_marks;
                if (!marks || !max) return 0;
                return ((marks / max) * 100).toFixed(2);
            },
            cellRenderer: (params: ICellRendererParams) => {
                const percentage = parseFloat(params.value);
                let color = 'var(--color-error)';
                if (percentage >= 80) color = 'var(--color-success)';
                else if (percentage >= 60) color = 'var(--color-warning)';

                return (
                    <div style={{ fontWeight: 600, color }}>
                        {percentage.toFixed(2)}%
                    </div>
                );
            },
        },
        {
            headerName: 'Grade',
            field: 'grade',
            width: 100,
            cellRenderer: (params: ICellRendererParams) => {
                const grade = params.value;
                if (!grade) return '-';
                const gradeColors: Record<string, string> = {
                    'A+': 'var(--color-success)',
                    'A': 'var(--color-success)',
                    'B+': 'var(--color-info)',
                    'B': 'var(--color-info)',
                    'C': 'var(--color-warning)',
                    'D': 'var(--color-warning)',
                    'F': 'var(--color-error)',
                };
                return (
                    <div style={{
                        fontWeight: 600,
                        color: gradeColors[grade] || 'var(--color-text)',
                        fontSize: '0.875rem',
                    }}>
                        {grade}
                    </div>
                );
            },
        },
        {
            headerName: 'Remarks',
            field: 'remarks',
            width: 200,
            cellRenderer: (params: ICellRendererParams) => (
                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                    {params.value || '-'}
                </div>
            ),
        },
    ], []);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        resizable: true,
    }), []);

    // Calculate statistics
    const stats = useMemo(() => {
        if (!results?.data) return null;

        const data = results.data;
        const total = data.length;
        const passed = data.filter((r: any) => {
            const percentage = (r.marks_obtained / r.max_marks) * 100;
            return percentage >= (exam?.passing_marks || 0);
        }).length;
        const avgMarks = data.reduce((sum: number, r: any) => sum + (r.marks_obtained || 0), 0) / total;
        const avgPercentage = data.reduce((sum: number, r: any) => {
            const pct = (r.marks_obtained / r.max_marks) * 100;
            return sum + pct;
        }, 0) / total;

        return {
            total,
            passed,
            failed: total - passed,
            passRate: ((passed / total) * 100).toFixed(1),
            avgMarks: avgMarks.toFixed(2),
            avgPercentage: avgPercentage.toFixed(2),
        };
    }, [results, exam]);

    if (isLoading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>Loading exam details...</div>
            </div>
        );
    }

    if (!exam) {
        return (
            <div className={styles.container}>
                <div className={styles.error}>Exam not found</div>
                <Link to="/exams">
                    <Button variant="outline" icon={<ArrowLeft size={18} />}>
                        Back to Exams
                    </Button>
                </Link>
            </div>
        );
    }

    const today = new Date();
    const startDate = new Date(exam.start_date);
    const endDate = new Date(exam.end_date);
    let status = 'upcoming';
    let statusColor = 'var(--color-info)';
    if (today >= startDate && today <= endDate) {
        status = 'ongoing';
        statusColor = 'var(--color-warning)';
    } else if (today > endDate) {
        status = 'completed';
        statusColor = 'var(--color-success)';
    }

    return (
        <div className={styles.container}>
            <Link to="/exams" className={styles.backLink}>
                <Button variant="ghost" icon={<ArrowLeft size={18} />}>
                    Back to Exams
                </Button>
            </Link>

            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>{exam.name}</h1>
                    <p className={styles.subtitle}>{exam.exam_type?.replace('_', ' ').toUpperCase()}</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <Button icon={<Download size={18} />} variant="outline" onClick={handleExport} style={{ display: 'none' }}>
                        Export Results
                    </Button>
                    <div className={styles.statusBadge} style={{ backgroundColor: `${statusColor}20`, color: statusColor }}>
                        {status.toUpperCase()}
                    </div>
                </div>
            </div>

            <div className={styles.infoGrid}>
                <Card className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>Start Date</div>
                        <div className={styles.infoValue}>{new Date(exam.start_date).toLocaleDateString()}</div>
                    </div>
                </Card>

                <Card className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
                        <Calendar size={20} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>End Date</div>
                        <div className={styles.infoValue}>{new Date(exam.end_date).toLocaleDateString()}</div>
                    </div>
                </Card>

                <Card className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-success)20', color: 'var(--color-success)' }}>
                        <TrendingUp size={20} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>Max Marks</div>
                        <div className={styles.infoValue}>{exam.max_marks}</div>
                    </div>
                </Card>

                <Card className={styles.infoCard}>
                    <div className={styles.infoIcon} style={{ backgroundColor: 'var(--color-error)20', color: 'var(--color-error)' }}>
                        <BookOpen size={20} />
                    </div>
                    <div>
                        <div className={styles.infoLabel}>Passing Marks</div>
                        <div className={styles.infoValue}>{exam.passing_marks}</div>
                    </div>
                </Card>
            </div>

            {stats && (
                <>
                    <div className={styles.statsGrid}>
                        <Card className={styles.statCard}>
                            <div className={styles.statValue}>{stats.total}</div>
                            <div className={styles.statLabel}>Total Students</div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statValue} style={{ color: 'var(--color-success)' }}>{stats.passed}</div>
                            <div className={styles.statLabel}>Passed</div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statValue} style={{ color: 'var(--color-error)' }}>{stats.failed}</div>
                            <div className={styles.statLabel}>Failed</div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statValue} style={{ color: 'var(--color-primary)' }}>{stats.passRate}%</div>
                            <div className={styles.statLabel}>Pass Rate</div>
                        </Card>
                        <Card className={styles.statCard}>
                            <div className={styles.statValue} style={{ color: 'var(--color-info)' }}>{stats.avgPercentage}%</div>
                            <div className={styles.statLabel}>Average %</div>
                        </Card>
                    </div>

                    {/* Charts Section */}
                    {results?.data && results.data.length > 0 && (
                        <div className={styles.chartsGrid}>
                            {gradeChartOptions && (
                                <Card className={styles.chartCard}>
                                    <div className={styles.chartHeader}>
                                        <div>
                                            <h3 className={styles.chartTitle}>Grade Distribution</h3>
                                            <p className={styles.chartSubtitle}>Breakdown of grades achieved</p>
                                        </div>
                                        <PieChart size={20} className={styles.chartIcon} />
                                    </div>
                                    <div style={{ height: '300px', marginTop: '1rem' }}>
                                        <AgChartsReact options={gradeChartOptions as any} />
                                    </div>
                                </Card>
                            )}

                            {performanceChartOptions && (
                                <Card className={styles.chartCard}>
                                    <div className={styles.chartHeader}>
                                        <div>
                                            <h3 className={styles.chartTitle}>Performance Distribution</h3>
                                            <p className={styles.chartSubtitle}>Students by performance range</p>
                                        </div>
                                        <BarChart3 size={20} className={styles.chartIcon} />
                                    </div>
                                    <div style={{ height: '300px', marginTop: '1rem' }}>
                                        <AgChartsReact options={performanceChartOptions as any} />
                                    </div>
                                </Card>
                            )}
                        </div>
                    )}
                </>
            )}

            <Card className={styles.resultsCard}>
                <h2 className={styles.sectionTitle}>Exam Results</h2>
                {resultsLoading ? (
                    <TableSkeleton rows={10} columns={6} />
                ) : (
                    <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
                        <AgGridReact
                            rowData={results?.data || []}
                            columnDefs={columnDefs}
                            defaultColDef={defaultColDef}
                            pagination={true}
                            paginationPageSize={20}
                            animateRows={true}
                            enableCellTextSelection={true}
                            suppressCellFocus={true}
                            getRowId={(params) => params.data.id}
                            noRowsOverlayComponent={() => (
                                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                                    No results found
                                </div>
                            )}
                        />
                    </div>
                )}
            </Card>
        </div>
    );
};

export default ExamDetail;

