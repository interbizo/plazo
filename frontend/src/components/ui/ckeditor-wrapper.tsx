"use client";

import { useEffect, useRef } from "react";

interface CKEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
}

export function CKEditorWrapper({
  value,
  onChange,
  placeholder = "Tulis deskripsi...",
  disabled = false,
  minHeight = "400px",
}: CKEditorWrapperProps) {
  const editorRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Load CKEditor script
    if (typeof window !== "undefined" && !window.CKEDITOR) {
      const script = document.createElement("script");
      script.src = "https://cdn.ckeditor.com/4.22.1/full/ckeditor.js";
      script.async = true;
      document.body.appendChild(script);

      script.onload = () => {
        initializeEditor();
      };

      return () => {
        if (editorRef.current) {
          try {
            editorRef.current.destroy();
          } catch (e) {
            console.error("Error destroying editor:", e);
          }
        }
      };
    } else if (window.CKEDITOR && !isInitialized.current) {
      initializeEditor();
    }

    return () => {
      if (editorRef.current) {
        try {
          editorRef.current.destroy();
        } catch (e) {
          console.error("Error destroying editor:", e);
        }
      }
    };
  }, []);

  useEffect(() => {
    if (editorRef.current && editorRef.current.getData() !== value) {
      editorRef.current.setData(value);
    }
  }, [value]);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.setReadOnly(disabled);
    }
  }, [disabled]);

  const initializeEditor = () => {
    if (!containerRef.current || isInitialized.current) return;

    const textarea = containerRef.current.querySelector("textarea");
    if (!textarea || !window.CKEDITOR) return;

    try {
      // Konfigurasi CKEditor 4.22.1 SUPER LENGKAP
      const editor = window.CKEDITOR.replace(textarea, {
        // Hilangkan warning keamanan
        versionCheck: false,
        
        // Toolbar LENGKAP dengan semua fitur yang tersedia
        toolbarGroups: [
          { name: 'document', groups: [ 'mode', 'document', 'doctools' ] },
          { name: 'clipboard', groups: [ 'clipboard', 'undo' ] },
          { name: 'editing', groups: [ 'find', 'selection', 'spellchecker', 'editing' ] },
          '/',
          { name: 'basicstyles', groups: [ 'basicstyles', 'cleanup' ] },
          { name: 'paragraph', groups: [ 'list', 'indent', 'blocks', 'align', 'bidi', 'paragraph' ] },
          { name: 'links', groups: [ 'links' ] },
          { name: 'insert', groups: [ 'insert' ] },
          '/',
          { name: 'styles', groups: [ 'styles' ] },
          { name: 'colors', groups: [ 'colors' ] },
          { name: 'tools', groups: [ 'tools' ] },
          { name: 'others', groups: [ 'others' ] },
          { name: 'about', groups: [ 'about' ] }
        ],

        // Hapus button yang deprecated atau tidak tersedia
        removeButtons: 'Flash,Form,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField',

        // Plugin LENGKAP - Tanpa deprecated plugins (flash, forms)
        extraPlugins: [
          'a11yhelp',
          'about',
          'basicstyles',
          'bidi',
          'blockquote',
          'clipboard',
          'colorbutton',
          'colordialog',
          'contextmenu',
          'copyformatting',
          'dialogadvtab',
          'div',
          'elementspath',
          'enterkey',
          'entities',
          'filebrowser',
          'find',
          'floatingspace',
          'font',
          'format',
          'horizontalrule',
          'htmlwriter',
          'iframe',
          'image',
          'indent',
          'indentblock',
          'indentlist',
          'justify',
          'language',
          'link',
          'list',
          'liststyle',
          'magicline',
          'maximize',
          'newpage',
          'pagebreak',
          'pastefromword',
          'pastetext',
          'preview',
          'print',
          'removeformat',
          'resize',
          'save',
          'scayt',
          'selectall',
          'showblocks',
          'showborders',
          'smiley',
          'sourcearea',
          'specialchar',
          'stylescombo',
          'tab',
          'table',
          'tabletools',
          'tableselection',
          'templates',
          'toolbar',
          'undo',
          'wysiwygarea'
        ].join(','),
        
        // Konfigurasi tinggi
        height: minHeight,
        
        // Konfigurasi lainnya
        language: "id",
        
        // Content filtering - allow all HTML
        allowedContent: true,
        extraAllowedContent: '*(*){*}[*]',
        
        // Placeholder
        editorplaceholder: placeholder,
        
        // Disable notification about update
        notification_duration: 0,

        // Font options - Sangat lengkap
        font_names: 
          'Arial/Arial, Helvetica, sans-serif;' +
          'Comic Sans MS/Comic Sans MS, cursive;' +
          'Courier New/Courier New, Courier, monospace;' +
          'Georgia/Georgia, serif;' +
          'Lucida Sans Unicode/Lucida Sans Unicode, Lucida Grande, sans-serif;' +
          'Tahoma/Tahoma, Geneva, sans-serif;' +
          'Times New Roman/Times New Roman, Times, serif;' +
          'Trebuchet MS/Trebuchet MS, Helvetica, sans-serif;' +
          'Verdana/Verdana, Geneva, sans-serif;' +
          'Roboto/Roboto, sans-serif;' +
          'Open Sans/Open Sans, sans-serif;' +
          'Lato/Lato, sans-serif;' +
          'Montserrat/Montserrat, sans-serif;' +
          'Poppins/Poppins, sans-serif;' +
          'Raleway/Raleway, sans-serif;' +
          'Ubuntu/Ubuntu, sans-serif;' +
          'Playfair Display/Playfair Display, serif;' +
          'Merriweather/Merriweather, serif;' +
          'PT Sans/PT Sans, sans-serif;' +
          'Noto Sans/Noto Sans, sans-serif',

        // Font sizes - Sangat lengkap
        fontSize_sizes: '8/8px;9/9px;10/10px;11/11px;12/12px;14/14px;16/16px;18/18px;20/20px;22/22px;24/24px;26/26px;28/28px;36/36px;48/48px;72/72px',

        // Format tags
        format_tags: 'p;h1;h2;h3;h4;h5;h6;pre;address;div',

        // Color palette - Sangat lengkap
        colorButton_colors: 
          '000,800000,8B4513,2F4F4F,008080,000080,4B0082,696969,' +
          'B22222,A52A2A,DAA520,006400,40E0D0,0000CD,800080,808080,' +
          'F00,FF8C00,FFD700,008000,0FF,00F,EE82EE,A9A9A9,' +
          'FFA07A,FFA500,FFFF00,00FF00,AFEEEE,ADD8E6,DDA0DD,D3D3D3,' +
          'FFF0F5,FAEBD7,FFFFE0,F0FFF0,F0FFFF,F0F8FF,E6E6FA,FFF',

        // Enable color dialog
        colorButton_enableMore: true,

        // Table options
        table_defaultCellPadding: 5,
        table_defaultCellSpacing: 0,

        // Image options
        image_previewText: ' ',

        // Smiley options - Lengkap
        smiley_descriptions: [
          'smiley', 'sad', 'wink', 'laugh', 'frown', 'cheeky', 'blush', 'surprise',
          'indecision', 'angry', 'angel', 'cool', 'devil', 'crying', 'enlightened', 'no',
          'yes', 'heart', 'broken heart', 'kiss', 'mail'
        ],

        // Special characters - Sangat lengkap
        specialChars: [
          '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', '-', '.', '/',
          '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', ':', ';',
          '<', '=', '>', '?', '@',
          'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O',
          'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
          '[', ']', '^', '_', '`',
          'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p',
          'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
          '{', '|', '}', '~',
          '€', '£', '¥', '©', '®', '™', '§', '¶',
          'À', 'Á', 'Â', 'Ã', 'Ä', 'Å', 'Æ', 'Ç', 'È', 'É', 'Ê', 'Ë', 'Ì', 'Í', 'Î', 'Ï',
          'Ð', 'Ñ', 'Ò', 'Ó', 'Ô', 'Õ', 'Ö', 'Ø', 'Ù', 'Ú', 'Û', 'Ü', 'Ý', 'Þ', 'ß',
          'à', 'á', 'â', 'ã', 'ä', 'å', 'æ', 'ç', 'è', 'é', 'ê', 'ë', 'ì', 'í', 'î', 'ï',
          'ð', 'ñ', 'ò', 'ó', 'ô', 'õ', 'ö', 'ø', 'ù', 'ú', 'û', 'ü', 'ý', 'þ', 'ÿ',
          'Œ', 'œ', 'Š', 'š', 'Ÿ', 'ƒ', 'ˆ', '˜',
          'α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'ο',
          'π', 'ρ', 'ς', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω',
          '←', '↑', '→', '↓', '↔', '↕', '↖', '↗', '↘', '↙',
          '∀', '∂', '∃', '∅', '∇', '∈', '∉', '∋', '∏', '∑',
          '−', '∗', '√', '∝', '∞', '∠', '∧', '∨', '∩', '∪', '∫', '∴', '∼', '≅', '≈',
          '≠', '≡', '≤', '≥', '⊂', '⊃', '⊄', '⊆', '⊇', '⊕', '⊗', '⊥',
          '⋅', '⌈', '⌉', '⌊', '⌋', '〈', '〉', '◊', '♠', '♣', '♥', '♦'
        ],

        // Templates
        templates_replaceContent: false,

        // Resize options
        resize_enabled: true,
        resize_dir: 'both',
        resize_minWidth: 450,
        resize_minHeight: 300,
        resize_maxWidth: 3000,
        resize_maxHeight: 3000,

        // Paste options
        pasteFromWordRemoveFontStyles: false,
        pasteFromWordRemoveStyles: false,

        // Scayt (Spell Check As You Type)
        scayt_autoStartup: false,
      });

      editor.on("instanceReady", () => {
        editor.setData(value);
        isInitialized.current = true;
      });

      editor.on("change", () => {
        const data = editor.getData();
        onChange(data);
      });

      editor.on("blur", () => {
        const data = editor.getData();
        onChange(data);
      });

      editorRef.current = editor;
    } catch (error) {
      console.error("Error initializing CKEditor:", error);
    }
  };

  return (
    <div className="ckeditor-wrapper">
      <div ref={containerRef}>
        <textarea defaultValue={value} />
      </div>
      
      <style jsx global>{`
        /* Hide CKEditor notification */
        .cke_notification,
        .cke_notification_warning,
        .cke_notification_info,
        .cke_notification_success {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          height: 0 !important;
          overflow: hidden !important;
        }
        
        /* Custom styling */
        .ckeditor-wrapper .cke {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
        }
        
        .ckeditor-wrapper .cke_top {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 0.5rem 0.5rem 0 0;
          padding: 6px;
        }
        
        .ckeditor-wrapper .cke_bottom {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          display: none;
        }
        
        .ckeditor-wrapper .cke_contents {
          border-radius: 0 0 0.5rem 0.5rem;
        }
        
        /* Hide path bar */
        .ckeditor-wrapper .cke_path {
          display: none;
        }
      `}</style>
    </div>
  );
}

// Type declaration for window.CKEDITOR
declare global {
  interface Window {
    CKEDITOR: any;
  }
}
