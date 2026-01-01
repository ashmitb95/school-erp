import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useScroll, useTransform } from 'framer-motion';
import {
  Sparkles, Bus, BarChart3, Users, DollarSign, Calendar, BookOpen,
  Shield, Zap, Globe, ArrowRight, Check, Play, MapPin, TrendingUp,
  MessageSquare, Database, ChevronDown, Menu, X
} from 'lucide-react';
import Button from '../../components/Button/Button';
import Card from '../../components/Card/Card';
import AIChatDemo from './components/AIChatDemo';
import TransportDemo from './components/TransportDemo';
import DashboardDemo from './components/DashboardDemo';
import FeaturesCarousel from './components/FeaturesCarousel';
import UpcomingFeatures from './components/UpcomingFeatures';
import styles from './Landing.module.css';

const Landing: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className={styles.landing}>
      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navContainer}>
          <div className={styles.logo}>
            <Sparkles size={28} />
            <span>Praxis ERP</span>
          </div>
          <div className={`${styles.navLinks} ${mobileMenuOpen ? styles.navLinksOpen : ''}`}>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#demo" onClick={() => setMobileMenuOpen(false)}>Demo</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <Link to="/login">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
            <Link to="/login">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
          <button
            className={styles.mobileMenuButton}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        className={styles.hero}
        style={{ opacity }}
      >
        <div className={styles.heroContent}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className={styles.heroText}
          >
            <div className={styles.heroBadge}>
              <Sparkles size={16} />
              <span>AI-Powered School Management</span>
            </div>
            <h1 className={styles.heroTitle}>
              Transform Your School Operations
              <span className={styles.heroTitleHighlight}> with AI</span>
            </h1>
            <p className={styles.heroDescription}>
              The all-in-one ERP system that helps you manage students, fees, attendance, 
              transport, and more. Ask questions in natural language and get instant insights.
            </p>
            <div className={styles.heroActions}>
              <Link to="/login">
                <Button size="lg" icon={<ArrowRight size={20} />}>
                  Start Free Trial
                </Button>
              </Link>
              <button className={styles.heroWatchButton} onClick={scrollToFeatures}>
                <Play size={20} />
                <span>Watch Demo</span>
              </button>
            </div>
            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <div className={styles.heroStatValue}>10,000+</div>
                <div className={styles.heroStatLabel}>Students Managed</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.heroStatValue}>500+</div>
                <div className={styles.heroStatLabel}>Schools Trust Us</div>
              </div>
              <div className={styles.heroStat}>
                <div className={styles.heroStatValue}>99.9%</div>
                <div className={styles.heroStatLabel}>Uptime</div>
              </div>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={styles.heroVisual}
          >
            <div className={styles.heroDashboardPreview}>
              <DashboardDemo isPreview />
            </div>
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className={styles.heroScroll}
          onClick={scrollToFeatures}
        >
          <ChevronDown size={24} />
        </motion.div>
      </motion.section>

      {/* Features Showcase */}
      <section id="features" ref={featuresRef} className={styles.features}>
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className={styles.sectionHeader}
          >
            <h2 className={styles.sectionTitle}>Powerful Features, Simple Interface</h2>
            <p className={styles.sectionDescription}>
              Everything you need to manage your school efficiently, all in one place
            </p>
          </motion.div>

          {/* AI Chat Feature */}
          <FeatureShowcase
            title="AI-Powered Natural Language Queries"
            description="Ask questions in plain English and get instant answers from your data. No SQL knowledge required."
            icon={<Sparkles size={32} />}
            demo={<AIChatDemo />}
            reverse={false}
          />

          {/* Transport Feature */}
          <FeatureShowcase
            title="Interactive Transport Route Management"
            description="Visualize bus routes on an interactive map, track student pickups, and optimize routes automatically."
            icon={<Bus size={32} />}
            demo={<TransportDemo />}
            reverse={true}
          />

          {/* Features Carousel */}
          <div className={styles.featuresCarouselSection}>
            <FeaturesCarousel />
          </div>
        </div>
      </section>

      {/* Upcoming Features Section */}
      <UpcomingFeatures />

      {/* All Features Grid */}
      <section className={styles.allFeatures}>
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={styles.sectionHeader}
          >
            <h2 className={styles.sectionTitle}>Complete School Management Suite</h2>
            <p className={styles.sectionDescription}>
              All the tools you need to run your school efficiently
            </p>
          </motion.div>
          <div className={styles.featuresGrid}>
            {featureList.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={styles.featureCard}>
                  <div className={styles.featureIcon}>{feature.icon}</div>
                  <h3 className={styles.featureTitle}>{feature.title}</h3>
                  <p className={styles.featureDescription}>{feature.description}</p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className={styles.pricing}>
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={styles.sectionHeader}
          >
            <h2 className={styles.sectionTitle}>Simple, Transparent Pricing</h2>
            <p className={styles.sectionDescription}>
              Choose the plan that works best for your school
            </p>
          </motion.div>
          <div className={styles.pricingGrid}>
            <PricingCard
              name="Starter"
              price="₹5,000"
              period="month"
              description="Perfect for small schools"
              features={[
                'Up to 500 students',
                'Basic modules',
                'Email support',
                'Mobile app access',
              ]}
              popular={false}
            />
            <PricingCard
              name="Professional"
              price="₹15,000"
              period="month"
              description="For growing schools"
              features={[
                'Up to 2,000 students',
                'All modules',
                'AI Chat included',
                'Priority support',
                'Custom integrations',
              ]}
              popular={true}
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              period=""
              description="For large institutions"
              features={[
                'Unlimited students',
                'All features',
                'Dedicated support',
                'Custom development',
                'On-premise option',
              ]}
              popular={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.cta}>
        <div className={styles.container}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className={styles.ctaContent}
          >
            <h2 className={styles.ctaTitle}>Ready to Transform Your School?</h2>
            <p className={styles.ctaDescription}>
              Join hundreds of schools already using Praxis ERP to streamline their operations
            </p>
            <Link to="/login">
              <Button size="lg" icon={<ArrowRight size={20} />}>
                Start Your Free Trial
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.container}>
          <div className={styles.footerContent}>
            <div className={styles.footerSection}>
              <div className={styles.footerLogo}>
                <Sparkles size={24} />
                <span>Praxis ERP</span>
              </div>
              <p className={styles.footerDescription}>
                The modern ERP system for modern schools
              </p>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>Product</h4>
              <a href="#features">Features</a>
              <a href="#demo">Demo</a>
              <a href="#pricing">Pricing</a>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>Company</h4>
              <a href="#about">About</a>
              <a href="#contact">Contact</a>
              <a href="#blog">Blog</a>
            </div>
            <div className={styles.footerSection}>
              <h4 className={styles.footerTitle}>Legal</h4>
              <a href="#privacy">Privacy</a>
              <a href="#terms">Terms</a>
              <a href="#security">Security</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <p>&copy; 2024 Praxis ERP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

interface FeatureShowcaseProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  demo: React.ReactNode;
  reverse: boolean;
}

const FeatureShowcase: React.FC<FeatureShowcaseProps> = ({
  title,
  description,
  icon,
  demo,
  reverse,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
      className={`${styles.featureShowcase} ${reverse ? styles.featureShowcaseReverse : ''}`}
    >
      <div className={styles.featureShowcaseContent}>
        <div className={styles.featureShowcaseIcon}>{icon}</div>
        <h3 className={styles.featureShowcaseTitle}>{title}</h3>
        <p className={styles.featureShowcaseDescription}>{description}</p>
        <ul className={styles.featureShowcaseList}>
          <li>
            <Check size={18} />
            <span>Real-time data processing</span>
          </li>
          <li>
            <Check size={18} />
            <span>Intuitive user interface</span>
          </li>
          <li>
            <Check size={18} />
            <span>Mobile-responsive design</span>
          </li>
        </ul>
      </div>
      <div className={styles.featureShowcaseDemo}>
        {demo}
      </div>
    </motion.div>
  );
};

interface PricingCardProps {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  popular: boolean;
}

const PricingCard: React.FC<PricingCardProps> = ({
  name,
  price,
  period,
  description,
  features,
  popular,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Card className={`${styles.pricingCard} ${popular ? styles.pricingCardPopular : ''}`}>
        {popular && <div className={styles.pricingBadge}>Most Popular</div>}
        <h3 className={styles.pricingName}>{name}</h3>
        <div className={styles.pricingPrice}>
          <span className={styles.pricingAmount}>{price}</span>
          {period && <span className={styles.pricingPeriod}>/{period}</span>}
        </div>
        <p className={styles.pricingDescription}>{description}</p>
        <ul className={styles.pricingFeatures}>
          {features.map((feature, index) => (
            <li key={index}>
              <Check size={18} />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link to="/login" style={{ width: '100%', display: 'block' }}>
          <Button size="md" fullWidth>
            Get Started
          </Button>
        </Link>
      </Card>
    </motion.div>
  );
};

const featureList = [
  {
    title: 'Student Management',
    description: 'Complete student information system with admission, enrollment, and records management.',
    icon: <Users size={24} />,
  },
  {
    title: 'Fee Management',
    description: 'Automated fee collection, payment tracking, and financial reporting.',
    icon: <DollarSign size={24} />,
  },
  {
    title: 'Attendance Tracking',
    description: 'Real-time attendance monitoring with automated notifications and reports.',
    icon: <Calendar size={24} />,
  },
  {
    title: 'Exam Management',
    description: 'Schedule exams, manage results, generate report cards, and track performance.',
    icon: <BookOpen size={24} />,
  },
  {
    title: 'Transport Management',
    description: 'Route optimization, vehicle tracking, and student pickup management.',
    icon: <Bus size={24} />,
  },
  {
    title: 'Library Management',
    description: 'Book cataloging, issue tracking, and automated reminders.',
    icon: <BookOpen size={24} />,
  },
  {
    title: 'HR & Payroll',
    description: 'Staff management, attendance, salary processing, and leave management.',
    icon: <Users size={24} />,
  },
  {
    title: 'Reports & Analytics',
    description: 'Comprehensive reporting with customizable dashboards and data visualization.',
    icon: <BarChart3 size={24} />,
  },
];

export default Landing;

