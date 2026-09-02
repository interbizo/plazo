import { UnifiedDashboardLayout } from "@/components/dashboard/unified-dashboard-layout";

export default function SellerDashboardLayout({ children }: { children: React.ReactNode }) {
  return <UnifiedDashboardLayout requireSeller>{children}</UnifiedDashboardLayout>;
}
