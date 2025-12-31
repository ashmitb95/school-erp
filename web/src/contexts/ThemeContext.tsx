import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  setColors: (colors: Partial<ThemeContextType['colors']>) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<'light' | 'dark'>('light');
  const [colors, setColorsState] = useState({
    primary: '#474448',
    secondary: '#534b52',
    success: '#474448',
    warning: '#534b52',
    error: '#2d232e',
    info: '#474448',
  });

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setThemeState(savedTheme);
    }

    // Load custom colors from localStorage
    const savedColors = localStorage.getItem('theme-colors');
    if (savedColors) {
      try {
        setColorsState(JSON.parse(savedColors));
      } catch (e) {
        console.error('Failed to parse saved colors', e);
      }
    }
  }, []);

  useEffect(() => {
    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    // Apply custom colors to CSS variables
    const root = document.documentElement;
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
    localStorage.setItem('theme-colors', JSON.stringify(colors));
  }, [colors]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  const setColors = (newColors: Partial<typeof colors>) => {
    setColorsState((prev) => ({ ...prev, ...newColors }));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, colors, setColors }}>
      {children}
    </ThemeContext.Provider>
  );
};


