import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getDocument, updateDocument } from '@/lib/firebase-db';
import { useAuth } from '@/hooks/useAuth';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Load theme from database
  useEffect(() => {
    if (!user) return;

    const loadTheme = async () => {
      // No Firestore, a preferência do usuário deve ser um documento na coleção 'userPreferences'
      // com o ID do documento sendo o user.id
      const preference = await getDocument('userPreferences', user.id);

      if (preference?.theme) {
        setThemeState(preference.theme as Theme);
      }
    };

    loadTheme();
  }, [user]);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.remove('light', 'dark');
        root.classList.add(systemTheme);
        setResolvedTheme(systemTheme);
      } else {
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        setResolvedTheme(theme);
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    if (user) {
      // Save to database
      // No Firestore, usamos updateDocument com o ID do usuário para criar/atualizar
      await updateDocument('userPreferences', user.id, {
        theme: newTheme,
        updatedAt: new Date().toISOString(),
      }, true); // O 'true' indica que é um set/merge
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
