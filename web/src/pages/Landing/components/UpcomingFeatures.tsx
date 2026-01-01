import React from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone, Bell, Fingerprint, FileText, Package, Building2,
  TrendingUp, Video, GraduationCap, CheckCircle2
} from 'lucide-react';
import Card from '../../../components/Card/Card';
import styles from './UpcomingFeatures.module.css';

interface UpcomingFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  highlights: string[];
}

const upcomingFeatures: UpcomingFeature[] = [
  {
    id: 'parent-portal',
    title: 'Parent Portal & Mobile App',
    description: 'Dedicated portal for parents to view student progress, pay fees, receive notifications, and communicate with teachers.',
    icon: <Smartphone size={24} />,
    highlights: [
      'Student progress tracking',
      'Fee payment portal',
      'Direct communication',
      'Mobile app access'
    ],
  },
  {
    id: 'notifications',
    title: 'Multi-Channel Notifications',
    description: 'Send automated notifications via SMS, email, and push notifications for attendance, fees, exams, and events.',
    icon: <Bell size={24} />,
    highlights: [
      'SMS notifications',
      'Email alerts',
      'Push notifications',
      'Automated reminders'
    ],
  },
  {
    id: 'biometric',
    title: 'Biometric Attendance System',
    description: 'Integrate with biometric devices for automated attendance marking with facial recognition and fingerprint scanning.',
    icon: <Fingerprint size={24} />,
    highlights: [
      'Fingerprint scanning',
      'Facial recognition',
      'Automated marking',
      'Device integration'
    ],
  },
  {
    id: 'report-cards',
    title: 'Automated Report Card Generation',
    description: 'Generate professional report cards automatically with customizable templates and digital signatures.',
    icon: <FileText size={24} />,
    highlights: [
      'Customizable templates',
      'Automated generation',
      'Digital signatures',
      'PDF export'
    ],
  },
  {
    id: 'inventory',
    title: 'Inventory & Asset Management',
    description: 'Track school assets, equipment, and inventory with barcode scanning and automated stock alerts.',
    icon: <Package size={24} />,
    highlights: [
      'Asset tracking',
      'Barcode scanning',
      'Stock management',
      'Maintenance tracking'
    ],
  },
  {
    id: 'multi-branch',
    title: 'Multi-Branch Management',
    description: 'Manage multiple school branches from a single dashboard with centralized control and branch-specific customization.',
    icon: <Building2 size={24} />,
    highlights: [
      'Centralized management',
      'Branch-specific settings',
      'Cross-branch analytics',
      'Unified reporting'
    ],
  },
  {
    id: 'advanced-analytics',
    title: 'Advanced BI & Predictive Analytics',
    description: 'Leverage AI-powered analytics to predict student performance, identify at-risk students, and optimize operations.',
    icon: <TrendingUp size={24} />,
    highlights: [
      'Predictive analytics',
      'At-risk student detection',
      'Performance forecasting',
      'Operational insights'
    ],
  },
  {
    id: 'video-conferencing',
    title: 'Video Conferencing Integration',
    description: 'Integrated video classes, parent-teacher meetings, and virtual events with calendar scheduling.',
    icon: <Video size={24} />,
    highlights: [
      'Virtual classrooms',
      'Parent-teacher meetings',
      'Event hosting',
      'Calendar integration'
    ],
  },
  {
    id: 'alumni',
    title: 'Alumni Management System',
    description: 'Maintain connections with alumni, track career progress, organize events, and build a strong alumni network.',
    icon: <GraduationCap size={24} />,
    highlights: [
      'Alumni database',
      'Career tracking',
      'Event management',
      'Network building'
    ],
  },
];

const UpcomingFeatures: React.FC = () => {
  return (
    <section className={styles.upcomingFeatures}>
      <div className={styles.container}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className={styles.sectionHeader}
        >
          <h2 className={styles.sectionTitle}>Coming Soon</h2>
          <p className={styles.sectionDescription}>
            Exciting features we're building to make your school management even better
          </p>
        </motion.div>

        <div className={styles.featuresGrid}>
          {upcomingFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={styles.featureCard}>
                <div className={styles.featureHeader}>
                  <div className={styles.featureIcon}>{feature.icon}</div>
                  <span className={styles.comingSoonBadge}>Coming Soon</span>
                </div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDescription}>{feature.description}</p>
                <ul className={styles.featureHighlights}>
                  {feature.highlights.map((highlight, idx) => (
                    <li key={idx}>
                      <CheckCircle2 size={14} />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default UpcomingFeatures;

