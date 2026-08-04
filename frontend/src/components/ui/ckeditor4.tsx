"use client";

import { useEffect, useState, useRef } from "react";

const CKEDITOR_URL = "https://cdn.ckeditor.com/4.22.1/full/ckeditor.js";

type CKEditor4Preset = "default" | "article";

const ARTICLE_TOOLBAR_GROUPS = [
  { name: "document", groups: ["mode"] },
  { name: "clipboard", groups: ["undo"] },
  { name: "styles", groups: ["styles"] },
  { name: "basicstyles", groups: ["basicstyles", "cleanup"] },
  { name: "paragraph", groups: ["list", "indent", "blocks", "align"] },
  { name: "links", groups: ["links"] },
  { name: "insert", groups: ["insert"] },
];

const DEFAULT_REMOVE_BUTTONS =
  "Flash,Form,Checkbox,Radio,TextField,Textarea,Select,Button,ImageButton,HiddenField";

const ARTICLE_REMOVE_BUTTONS = [
  DEFAULT_REMOVE_BUTTONS,
  "Save",
  "NewPage",
  "Preview",
  "Print",
  "Templates",
  "About",
  "Smiley",
  "Iframe",
  "PageBreak",
  "Language",
  "BidiLtr",
  "BidiRtl",
  "ShowBlocks",
  "ExportPdf",
  "SpecialChar",
  "CreateDiv",
  "Font",
  "FontSize",
  "TextColor",
  "BGColor",
  "CopyFormatting",
  "PasteFromWord",
  "PasteText",
  "Find",
  "Replace",
  "SelectAll",
  "Maximize",
].join(",");

const ARTICLE_REMOVE_PLUGINS = [
  "exportpdf",
  "save",
  "newpage",
  "preview",
  "print",
  "templates",
  "about",
  "smiley",
  "iframe",
  "forms",
  "flash",
  "scayt",
  "language",
  "bidi",
  "showblocks",
  "pagebreak",
  "colordialog",
  "colorbutton",
].join(",");

const ARTICLE_EXTRA_PLUGINS = [
  "basicstyles",
  "blockquote",
  "clipboard",
  "elementspath",
  "format",
  "horizontalrule",
  "image",
  "indent",
  "indentblock",
  "indentlist",
  "justify",
  "link",
  "list",
  "removeformat",
  "sourcearea",
  "table",
  "tabletools",
  "tableselection",
  "toolbar",
  "undo",
  "wysiwygarea",
].join(",");

interface CKEditor4Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
  preset?: CKEditor4Preset;
}

export function CKEditor4({
  value,
  onChange,
  placeholder = "Tulis deskripsi...",
  disabled = false,
  minHeight = "400px",
  preset = "default",
}: CKEditor4Props) {
  const [CKEditor, setCKEditor] = useState<any>(null);
  const [isClient, setIsClient] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const editorReady = useRef(false);
  const isArticlePreset = preset === "article";

  useEffect(() => {
    let isMounted = true;

    setIsClient(true);

    const applyEditorConfig = () => {
      const ckeditor = (window as any).CKEDITOR;
      if (ckeditor?.config) {
        ckeditor.config.versionCheck = false;
        ckeditor.config.notification_duration = 0;
      }
    };

    const loadEditorComponent = () => {
      import("ckeditor4-react")
        .then((module) => {
          if (isMounted && module.CKEditor) {
            setCKEditor(() => module.CKEditor);
          } else if (isMounted) {
            setLoadError(true);
          }
        })
        .catch((error) => {
          console.error("Failed to load CKEditor:", error);
          if (isMounted) setLoadError(true);
        });
    };

    if ((window as any).CKEDITOR) {
      applyEditorConfig();
      loadEditorComponent();
      return () => {
        isMounted = false;
      };
    }

    (window as any).CKEDITOR_BASEPATH = "https://cdn.ckeditor.com/4.22.1/full/";

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${CKEDITOR_URL}"]`,
    );
    const script = existingScript || document.createElement("script");

    const handleLoad = () => {
      if (!isMounted) return;
      if ((window as any).CKEDITOR) {
        applyEditorConfig();
        loadEditorComponent();
      } else {
        setLoadError(true);
      }
    };

    const handleError = () => {
      if (isMounted) setLoadError(true);
    };

    script.addEventListener("load", handleLoad);
    script.addEventListener("error", handleError);

    if (!existingScript) {
      script.src = CKEDITOR_URL;
      script.async = true;
      document.head.appendChild(script);
    }

    const timeoutId = setTimeout(() => {
      if (isMounted && !(window as any).CKEDITOR) {
        setLoadError(true);
      }
    }, 15000);

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      script.removeEventListener("load", handleLoad);
      script.removeEventListener("error", handleError);
    };
  }, []);

  // Fallback jika CKEditor gagal load
  if (loadError) {
    return (
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          style={{ minHeight }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 resize-vertical"
        />
        <p className="mt-1 text-xs text-red-500">
          CKEditor gagal dimuat. Menggunakan editor sederhana.
        </p>
      </div>
    );
  }

  // Loading state
  if (!isClient || !CKEditor) {
    return (
      <div 
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm bg-gray-50 flex items-center justify-center"
        style={{ minHeight }}
      >
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-500">Loading editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ckeditor4-container">
      <CKEditor
        initData={value}
        onChange={(evt: any) => {
          // Only fire onChange after editor is fully initialized
          // This prevents the initial load from resetting form fields
          if (!editorReady.current) return;
          const data = evt.editor.getData();
          onChange(data);
        }}
        onInstanceReady={() => {
          // Mark editor as ready after a short delay to skip initial change events
          setTimeout(() => {
            editorReady.current = true;
          }, 500);
        }}
        config={{
          // Hilangkan warning keamanan
          versionCheck: false,
          
          toolbarGroups: isArticlePreset
            ? ARTICLE_TOOLBAR_GROUPS
            : [
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
          removeButtons: isArticlePreset
            ? ARTICLE_REMOVE_BUTTONS
            : DEFAULT_REMOVE_BUTTONS,
          removePlugins: isArticlePreset ? ARTICLE_REMOVE_PLUGINS : "",

          extraPlugins: isArticlePreset
            ? ARTICLE_EXTRA_PLUGINS
            : [
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
          
          // Tinggi editor
          height: minHeight,
          
          // Bahasa Indonesia
          language: "id",
          
          // Allow all HTML content
          allowedContent: true,
          
          // Extra allowed content untuk keamanan maksimal
          extraAllowedContent: '*(*){*}[*]',
          
          // Placeholder
          editorplaceholder: placeholder,
          
          // Disable notification
          notification_duration: 0,
          
          // Readonly mode
          readOnly: disabled,
          
          font_names: isArticlePreset
            ? 'Arial/Arial, Helvetica, sans-serif;' +
              'Georgia/Georgia, serif;' +
              'Times New Roman/Times New Roman, Times, serif;' +
              'Verdana/Verdana, Geneva, sans-serif'
            : 'Arial/Arial, Helvetica, sans-serif;' +
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

          fontSize_sizes: isArticlePreset
            ? '14/14px;16/16px;18/18px;20/20px;24/24px'
            : '8/8px;9/9px;10/10px;11/11px;12/12px;14/14px;16/16px;18/18px;20/20px;22/22px;24/24px;26/26px;28/28px;36/36px;48/48px;72/72px',

          // Format tags
          format_tags: isArticlePreset
            ? 'p;h2;h3;h4;pre'
            : 'p;h1;h2;h3;h4;h5;h6;pre;address;div',

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
          
          customConfig: "",
        }}
        editorUrl={CKEDITOR_URL}
      />
      
      <style jsx global>{`
        /* Hide semua notification dan warning */
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
        
        /* Custom styling untuk CKEditor */
        .ckeditor4-container .cke {
          border: 1px solid #d1d5db;
          border-radius: 0.5rem;
        }
        
        .ckeditor4-container .cke_top {
          background: #f9fafb;
          border-bottom: 1px solid #e5e7eb;
          border-radius: 0.5rem 0.5rem 0 0;
          padding: 6px;
        }
        
        .ckeditor4-container .cke_bottom {
          background: #f9fafb;
          border-top: 1px solid #e5e7eb;
          display: none;
        }
        
        .ckeditor4-container .cke_contents {
          border-radius: 0 0 0.5rem 0.5rem;
        }
        
        /* Hide path bar */
        .ckeditor4-container .cke_path {
          display: none;
        }
      `}</style>
    </div>
  );
}
