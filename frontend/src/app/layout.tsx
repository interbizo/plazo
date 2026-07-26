import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";
import { ClientLayout } from "@/components/layout/client-layout";
import { getSubdomainFromHostname } from "@/lib/domain";
import { generateDynamicMetadata } from "@/lib/metadata";

export async function generateMetadata(): Promise<Metadata> {
  return await generateDynamicMetadata();
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host = headersList.get("host") || "";
  const isStorefrontHost = Boolean(getSubdomainFromHostname(host));

  return (
    <html lang="id" className="h-full" data-scroll-behavior="smooth">
      <head>
        {/* CKEditor 4.22.1 - Load dari CDN (synchronous untuk memastikan load sebelum component) */}
        <script src="https://cdn.ckeditor.com/4.22.1/full/ckeditor.js"></script>
        
        {/* CKEditor Config - Disable warning (run after CKEditor loads) */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                window.CKEDITOR_BASEPATH = 'https://cdn.ckeditor.com/4.22.1/full/';
                
                // Wait for CKEDITOR to be available
                var checkCKEditor = setInterval(function() {
                  if (typeof CKEDITOR !== 'undefined') {
                    clearInterval(checkCKEditor);
                    CKEDITOR.config.versionCheck = false;
                    CKEDITOR.config.notification_duration = 0;
                  }
                }, 100);
                
                // Timeout after 10 seconds
                setTimeout(function() {
                  clearInterval(checkCKEditor);
                }, 10000);
              })();
            `,
          }}
        />
        
        {/* Hide CKEditor notifications */}
        <style>{`
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
        `}</style>
      </head>
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <ClientLayout settings={{}} isStorefrontHost={isStorefrontHost}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
