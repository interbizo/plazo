"use client";

import { useState } from "react";
import { CKEditor4 } from "@/components/ui/ckeditor4";
import { CKEditorWrapper } from "@/components/ui/ckeditor-wrapper";

export default function CKEditorTestPage() {
  const [content1, setContent1] = useState("<p>Test CKEditor4 Component</p>");
  const [content2, setContent2] = useState("<p>Test CKEditorWrapper Component</p>");

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <h1 className="text-3xl font-bold mb-8">CKEditor 4.22.1 Test Page</h1>

      {/* Test CKEditor4 Component */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">1. CKEditor4 Component (Recommended)</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <CKEditor4
            value={content1}
            onChange={setContent1}
            placeholder="Tulis sesuatu di sini..."
            minHeight="400px"
          />
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Preview HTML:</h3>
            <div className="bg-gray-100 p-4 rounded border border-gray-300 overflow-auto max-h-40">
              <code className="text-sm">{content1}</code>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Rendered Output:</h3>
            <div 
              className="bg-white p-4 rounded border border-gray-300"
              dangerouslySetInnerHTML={{ __html: content1 }}
            />
          </div>
        </div>
      </div>

      {/* Test CKEditorWrapper Component */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">2. CKEditorWrapper Component (Alternative)</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <CKEditorWrapper
            value={content2}
            onChange={setContent2}
            placeholder="Tulis sesuatu di sini..."
            minHeight="400px"
          />
          
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-2">Preview HTML:</h3>
            <div className="bg-gray-100 p-4 rounded border border-gray-300 overflow-auto max-h-40">
              <code className="text-sm">{content2}</code>
            </div>
          </div>
          
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Rendered Output:</h3>
            <div 
              className="bg-white p-4 rounded border border-gray-300"
              dangerouslySetInnerHTML={{ __html: content2 }}
            />
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Informasi:</h3>
        <ul className="list-disc list-inside space-y-2 text-blue-800">
          <li>Versi: CKEditor 4.22.1 (Full Package)</li>
          <li>Warning keamanan sudah dihilangkan dengan <code className="bg-blue-100 px-1 rounded">versionCheck: false</code></li>
          <li>Notification sudah di-hide dengan CSS</li>
          <li>Toolbar lengkap dengan semua fitur</li>
          <li>Support untuk Image, Table, Link, dan lainnya</li>
        </ul>
        
        <div className="mt-4 pt-4 border-t border-blue-300">
          <p className="text-sm text-blue-700">
            Dokumentasi lengkap ada di: <code className="bg-blue-100 px-1 rounded">frontend/CKEDITOR_DOCS.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}
