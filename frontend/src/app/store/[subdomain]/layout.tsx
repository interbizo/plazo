import { ReactNode } from "react";
import { notFound } from "next/navigation";
import { serverApi } from "@/lib/server-api";
import { StorefrontFooter } from "@/components/storefront/footer";

interface StoreLayoutProps {
  children: ReactNode;
  params: Promise<{ subdomain: string }>;
}

export default async function StoreLayout({ children, params }: StoreLayoutProps) {
  const { subdomain } = await params;

  // Fetch store data for footer
  let store: any = null;
  
  try {
    const response = await serverApi.getStorefront(subdomain);
    store = response?.store || response;
    
    if (!store || !store.isActive) {
      notFound();
    }
  } catch (error) {
    console.error("Failed to fetch store for layout:", error);
    notFound();
  }

  return (
    <>
      {children}
      <StorefrontFooter store={store} subdomain={subdomain} />
    </>
  );
}
