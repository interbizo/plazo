"use client";

import { useEffect } from "react";
import type { Tenant } from "@/types";

interface ThemeProviderProps {
  store: Tenant | null;
  children: React.ReactNode;
}

/**
 * StorefrontThemeProvider
 * Applies dynamic theming to storefront based on seller's CMS settings
 * Uses CSS custom properties for real-time theme updates
 */
export function StorefrontThemeProvider({ store, children }: ThemeProviderProps) {
  useEffect(() => {
    if (!store) {
      console.log('[Theme] No store data, using default theme');
      return;
    }

    console.log('[Theme] Applying theme for store:', store.name);
    console.log('[Theme] Colors:', { primary: store.themeColor, secondary: store.themeSecondary });

    const root = document.documentElement;

    // ============ COLORS ============
    
    // Primary color
    if (store.themeColor) {
      root.style.setProperty('--store-primary', store.themeColor);
      
      // Convert hex to RGB for opacity variants
      const rgb = hexToRgb(store.themeColor);
      if (rgb) {
        root.style.setProperty('--store-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
      
      console.log('[Theme] Primary color applied:', store.themeColor);
    }

    // Secondary color
    if (store.themeSecondary) {
      root.style.setProperty('--store-secondary', store.themeSecondary);
      
      const rgb = hexToRgb(store.themeSecondary);
      if (rgb) {
        root.style.setProperty('--store-secondary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
      }
      
      console.log('[Theme] Secondary color applied:', store.themeSecondary);
    }

    // ============ TYPOGRAPHY ============
    
    if (store.themeFontFamily) {
      const fontMap: Record<string, string> = {
        inter: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        poppins: '"Poppins", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        playfair: '"Playfair Display", Georgia, serif',
        roboto: '"Roboto", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        montserrat: '"Montserrat", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        lato: '"Lato", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        opensans: '"Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      };
      
      const fontFamily = fontMap[store.themeFontFamily.toLowerCase()] || store.themeFontFamily;
      root.style.setProperty('--store-font', fontFamily);
      root.style.setProperty('--store-font-heading', fontFamily);
      
      console.log('[Theme] Font applied:', store.themeFontFamily);
    }

    // ============ BORDER RADIUS ============
    
    if (store.themeBorderRadius) {
      const radiusMap: Record<string, { base: string; sm: string; lg: string; xl: string }> = {
        none: { base: '0px', sm: '0px', lg: '0px', xl: '0px' },
        sm: { base: '0.25rem', sm: '0.125rem', lg: '0.375rem', xl: '0.5rem' },
        md: { base: '0.5rem', sm: '0.25rem', lg: '0.75rem', xl: '1rem' },
        lg: { base: '0.75rem', sm: '0.375rem', lg: '1rem', xl: '1.25rem' },
        full: { base: '9999px', sm: '9999px', lg: '9999px', xl: '9999px' },
      };
      
      const radius = radiusMap[store.themeBorderRadius.toLowerCase()] || radiusMap.md;
      root.style.setProperty('--store-radius', radius.base);
      root.style.setProperty('--store-radius-sm', radius.sm);
      root.style.setProperty('--store-radius-lg', radius.lg);
      root.style.setProperty('--store-radius-xl', radius.xl);
      
      console.log('[Theme] Border radius applied:', store.themeBorderRadius);
    }

    // ============ SHADOWS ============
    
    if (store.themeShadowStyle) {
      const shadowMap: Record<string, { base: string; sm: string; md: string; lg: string; xl: string }> = {
        none: {
          base: 'none',
          sm: 'none',
          md: 'none',
          lg: 'none',
          xl: 'none',
        },
        soft: {
          base: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        },
        medium: {
          base: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          sm: '0 2px 4px 0 rgb(0 0 0 / 0.1)',
          md: '0 8px 12px -2px rgb(0 0 0 / 0.15)',
          lg: '0 16px 24px -4px rgb(0 0 0 / 0.15)',
          xl: '0 24px 32px -6px rgb(0 0 0 / 0.15)',
        },
        hard: {
          base: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          sm: '0 4px 6px 0 rgb(0 0 0 / 0.1)',
          md: '0 12px 18px -3px rgb(0 0 0 / 0.2)',
          lg: '0 20px 30px -5px rgb(0 0 0 / 0.2)',
          xl: '0 32px 40px -8px rgb(0 0 0 / 0.2)',
        },
      };
      
      const shadow = shadowMap[store.themeShadowStyle.toLowerCase()] || shadowMap.soft;
      root.style.setProperty('--store-shadow', shadow.base);
      root.style.setProperty('--store-shadow-sm', shadow.sm);
      root.style.setProperty('--store-shadow-md', shadow.md);
      root.style.setProperty('--store-shadow-lg', shadow.lg);
      root.style.setProperty('--store-shadow-xl', shadow.xl);
      
      console.log('[Theme] Shadow style applied:', store.themeShadowStyle);
    }

    console.log('[Theme] Theme applied successfully');

    // Cleanup function
    return () => {
      console.log('[Theme] Cleaning up theme');
      
      // Reset to defaults
      root.style.removeProperty('--store-primary');
      root.style.removeProperty('--store-primary-rgb');
      root.style.removeProperty('--store-secondary');
      root.style.removeProperty('--store-secondary-rgb');
      root.style.removeProperty('--store-font');
      root.style.removeProperty('--store-font-heading');
      root.style.removeProperty('--store-radius');
      root.style.removeProperty('--store-radius-sm');
      root.style.removeProperty('--store-radius-lg');
      root.style.removeProperty('--store-radius-xl');
      root.style.removeProperty('--store-shadow');
      root.style.removeProperty('--store-shadow-sm');
      root.style.removeProperty('--store-shadow-md');
      root.style.removeProperty('--store-shadow-lg');
      root.style.removeProperty('--store-shadow-xl');
    };
  }, [store, store?.themeColor, store?.themeSecondary, store?.themeFontFamily, store?.themeBorderRadius, store?.themeShadowStyle]);

  return (
    <div 
      className="storefront-theme-wrapper"
      style={{ 
        fontFamily: 'var(--store-font, inherit)',
        minHeight: '100vh',
      }}
    >
      {children}
    </div>
  );
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  
  if (hex.length !== 6) {
    return null;
  }
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}
