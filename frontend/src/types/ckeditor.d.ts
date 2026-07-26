declare module '@ckeditor/ckeditor5-build-classic' {
  const ClassicEditor: any;
  export default ClassicEditor;
}

declare module '@ckeditor/ckeditor5-react' {
  import { Component } from 'react';
  
  export interface CKEditorProps {
    editor: any;
    data?: string;
    config?: any;
    disabled?: boolean;
    onChange?: (event: any, editor: any) => void;
    onReady?: (editor: any) => void;
    onFocus?: (event: any, editor: any) => void;
    onBlur?: (event: any, editor: any) => void;
  }
  
  export class CKEditor extends Component<CKEditorProps> {}
}
