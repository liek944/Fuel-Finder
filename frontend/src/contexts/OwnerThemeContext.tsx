import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Theme configuration types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  text: string;
  textSecondary?: string;
}

export interface ThemeFonts {
  heading: string;
  body: string;
}

export interface ThemeFeatures {
  analytics?: boolean;
  priceVerification?: boolean;
  stationEditing?: boolean;
  customFuelTypes?: boolean;
}

export interface ThemeConfig {
  brandName?: string;
  logoUrl?: string | null;
  colors?: ThemeColors;
  mode?: 'light' | 'dark';
  fonts?: ThemeFonts;
  features?: ThemeFeatures;
}

// Default theme configuration
const defaultTheme: ThemeConfig = {
  brandName: 'Fuel Finder Owner Portal',
  logoUrl: null,
  colors: {
    primary: '#0D47A1',
    secondary: '#FFC107',
    accent: '#00C853',
    background: '#0B1020',
    surface: '#151B2E',
    text: '#FFFFFF',
    textSecondary: '#B0B8D4',
  },
  mode: 'dark',
  fonts: {
    heading: 'Inter, system-ui, -apple-system, sans-serif',
    body: 'Inter, system-ui, -apple-system, sans-serif',
  },
  features: {
    analytics: true,
    priceVerification: true,
    stationEditing: true,
    customFuelTypes: true,
  },
};

interface OwnerThemeContextType {
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  applyTheme: (theme: ThemeConfig) => void;
  resetTheme: () => void;
}

const OwnerThemeContext = createContext<OwnerThemeContextType | undefined>(undefined);

interface OwnerThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeConfig;
}

export const OwnerThemeProvider: React.FC<OwnerThemeProviderProps> = ({
  children,
  initialTheme,
}) => {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    return { ...defaultTheme, ...initialTheme };
  });

  /**
   * Apply CSS variables to document root (internal helper)
   */
  const applyCSSVariables = (themeConfig: ThemeConfig) => {
    const root = document.documentElement.style;
    const colors = themeConfig.colors || defaultTheme.colors!;
    const fonts = themeConfig.fonts || defaultTheme.fonts!;

    // Apply color variables
    root.setProperty('--owner-primary', colors.primary);
    root.setProperty('--owner-secondary', colors.secondary);
    root.setProperty('--owner-accent', colors.accent);
    root.setProperty('--owner-bg', colors.background);
    root.setProperty('--owner-surface', colors.surface);
    root.setProperty('--owner-text', colors.text);
    root.setProperty('--owner-text-secondary', colors.textSecondary || '#B0B8D4');

    // Apply font variables
    root.setProperty('--owner-font-heading', fonts.heading);
    root.setProperty('--owner-font-body', fonts.body);

    // Apply theme mode
    document.documentElement.dataset.ownerThemeMode = themeConfig.mode || 'dark';

    console.log('🎨 Owner theme applied:', themeConfig.brandName || 'Default');
  };

  /**
   * Apply theme by updating state (CSS variables applied automatically)
   */
  const applyTheme = (themeConfig: ThemeConfig) => {
    const mergedTheme = { ...defaultTheme, ...themeConfig };
    setTheme(mergedTheme);
  };

  /**
   * Reset to default theme
   */
  const resetTheme = () => {
    setTheme(defaultTheme);
  };

  // Apply CSS variables whenever theme changes
  useEffect(() => {
    applyCSSVariables(theme);
  }, [theme]);

  return (
    <OwnerThemeContext.Provider value={{ theme, setTheme, applyTheme, resetTheme }}>
      {children}
    </OwnerThemeContext.Provider>
  );
};

/**
 * Hook to use owner theme context
 */
export const useOwnerTheme = (): OwnerThemeContextType => {
  const context = useContext(OwnerThemeContext);
  if (!context) {
    throw new Error('useOwnerTheme must be used within OwnerThemeProvider');
  }
  return context;
};

/**
 * Utility function to merge station theme with owner theme
 */
export const mergeStationTheme = (
  ownerTheme: ThemeConfig,
  stationTheme: ThemeConfig
): ThemeConfig => {
  return {
    ...ownerTheme,
    ...stationTheme,
    colors: {
      ...(ownerTheme.colors || {}),
      ...(stationTheme.colors || {}),
    } as ThemeColors,
    fonts: {
      ...(ownerTheme.fonts || {}),
      ...(stationTheme.fonts || {}),
    } as ThemeFonts,
    features: {
      ...ownerTheme.features,
      ...stationTheme.features,
    },
  };
};
