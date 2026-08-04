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
      <body className="min-h-full flex flex-col bg-white text-gray-900">
        <ClientLayout settings={{}} isStorefrontHost={isStorefrontHost}>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
