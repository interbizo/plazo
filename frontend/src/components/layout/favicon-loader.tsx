"use client";

import { useEffect } from "react";

export function FaviconLoader() {
  useEffect(() => {
    const loadFavicon = async () => {
      try {
        // Fetch site settings from API
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/public/cms/settings`);
        const data = await response.json();
        
        // Get logo from settings
        const siteLogo = data?.find((s: any) => s.key === 'site_logo')?.value;
        
        if (siteLogo) {
          // Update favicon dynamically
          const link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
          if (link) {
            link.href = siteLogo;
          } else {
            // Create new link if doesn't exist
            const newLink = document.createElement('link');
            newLink.rel = 'icon';
            newLink.href = siteLogo;
            document.head.appendChild(newLink);
          }
          
          // Also update shortcut icon
          const shortcutLink = document.querySelector("link[rel='shortcut icon']") as HTMLLinkElement;
          if (shortcutLink) {
            shortcutLink.href = siteLogo;
          }
        }
      } catch (error) {
        console.error('Failed to load dynamic favicon:', error);
        // Fallback to static favicon (already set in HTML)
      }
    };

    loadFavicon();
  }, []);

  return null; // This component doesn't render anything
}
