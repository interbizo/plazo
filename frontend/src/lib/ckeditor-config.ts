/**
 * CKEditor 4.22.1 Global Configuration
 * Konfigurasi ini akan menghilangkan warning keamanan dan update notification
 */

if (typeof window !== 'undefined') {
  // Disable version check dan notification
  window.CKEDITOR_BASEPATH = 'https://cdn.ckeditor.com/4.22.1/full/';
  
  // Set global config sebelum CKEditor load
  if (typeof window.CKEDITOR_CONFIG === 'undefined') {
    window.CKEDITOR_CONFIG = {
      versionCheck: false,
      notification_duration: 0,
    };
  }
  
  // Override notification system setelah CKEditor load
  if (typeof window.CKEDITOR !== 'undefined') {
    // Disable notification plugin
    if (window.CKEDITOR.plugins && window.CKEDITOR.plugins.notification) {
      window.CKEDITOR.plugins.notification = {
        init: function() {}
      };
    }
    
    // Override config defaults
    if (window.CKEDITOR.config) {
      window.CKEDITOR.config.versionCheck = false;
      window.CKEDITOR.config.notification_duration = 0;
    }
  }
}

// Type declarations
declare global {
  interface Window {
    CKEDITOR: any;
    CKEDITOR_BASEPATH: string;
    CKEDITOR_CONFIG: any;
  }
}

export {};
