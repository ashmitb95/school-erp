import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import styles from './Settings.module.css';

const Settings: React.FC = () => {
  const { theme, toggleTheme, colors, setColors } = useTheme();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Appearance</h2>
        <div className={styles.setting}>
          <div>
            <label>Theme</label>
            <p>Switch between light and dark mode</p>
          </div>
          <Button variant="outline" onClick={toggleTheme}>
            {theme === 'light' ? 'Dark' : 'Light'} Mode
          </Button>
        </div>
      </Card>

      <Card className={styles.section}>
        <h2 className={styles.sectionTitle}>Theme Colors</h2>
        <div className={styles.colorGrid}>
          {Object.entries(colors).map(([key, value]) => (
            <div key={key} className={styles.colorItem}>
              <label>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
              <input
                type="color"
                value={value}
                onChange={(e) => setColors({ [key]: e.target.value })}
                className={styles.colorInput}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Settings;


