import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Mail, Lock, Sparkles, Building2 } from 'lucide-react';
import Input from '../components/Input/Input';
import Button from '../components/Button/Button';
import styles from './Login.module.css';

const DEMO_ACCOUNTS = [
  { label: 'Select a school...', email: '', password: '' },
  { label: 'School 1 - Admin', email: 'admin@school1.edu.in', password: 'teacher@123' },
  { label: 'School 2 - Admin', email: 'admin@school2.edu.in', password: 'teacher@123' },
  { label: 'School 3 - Admin', email: 'admin@school3.edu.in', password: 'teacher@123' },
  { label: 'School 4 - Admin', email: 'admin@school4.edu.in', password: 'teacher@123' },
];

const Login: React.FC = () => {
  const [selectedAccount, setSelectedAccount] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();

  const handleAccountSelect = (value: string) => {
    setSelectedAccount(value);
    if (value) {
      const account = DEMO_ACCOUNTS.find(acc => acc.label === value);
      if (account && account.email) {
        setEmail(account.email);
        setPassword(account.password);
      }
    } else {
      setEmail('');
      setPassword('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Sparkles size={32} />
          </div>
          <h1 className={styles.title}>Praxis ERP</h1>
          <p className={styles.subtitle}>AI-Powered Education Management</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.demoSection}>
            <label className={styles.demoLabel}>
              <Building2 size={16} />
              Login as:
            </label>
            <select
              className={styles.demoSelect}
              value={selectedAccount}
              onChange={(e) => handleAccountSelect(e.target.value)}
            >
              {DEMO_ACCOUNTS.map((account) => (
                <option key={account.label} value={account.label}>
                  {account.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.divider}>
            <span>or enter manually</span>
          </div>

          <Input
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setSelectedAccount('');
            }}
            required
            icon={<Mail size={18} />}
            fullWidth
          />

          <Input
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setSelectedAccount('');
            }}
            required
            icon={<Lock size={18} />}
            fullWidth
          />

          <Button type="submit" fullWidth loading={loading}>
            Sign In
          </Button>
        </form>

        <div className={styles.footer}>
          <p>Powered by AI • Secure & Fast</p>
        </div>
      </div>
    </div>
  );
};

export default Login;


