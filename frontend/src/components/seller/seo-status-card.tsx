"use client";

import { useEffect, useState } from "react";
import { Search, CheckCircle, XCircle, AlertCircle, ExternalLink } from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import api from "@/lib/api";

interface SeoStatusProps {
  className?: string;
}

export function SeoStatusCard({ className = "" }: SeoStatusProps) {
  const { user } = useAuthStore();
  const [tenant, setTenant] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTenantData = async () => {
      if (!user?.id) return;
      
      try {
        const { data } = await api.get("/api/tenants/my-tenants");
        if (data && data.length > 0) {
          setTenant(data[0]);
        }
      } catch (error) {
        console.error("Failed to fetch tenant data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTenantData();
  }, [user]);

  if (isLoading) {
    return (
      <div className={`rounded-xl border border-gray-200 bg-white p-5 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 w-32 bg-gray-200 rounded mb-3"></div>
          <div className="h-3 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return null;
  }

  const isSeoActive = tenant.isSeoActive || false;
  const isVerified = tenant.isVerified || false;
  const subdomain = tenant.subdomain || "";

  // Determine status
  let status: "active" | "inactive" | "pending";
  let statusText: string;
  let statusColor: string;
  let statusIcon: React.ReactNode;
  let description: string;

  if (isSeoActive && isVerified) {
    status = "active";
    statusText = "SEO Active";
    statusColor = "bg-green-50 border-green-200";
    statusIcon = <CheckCircle className="h-5 w-5 text-green-600" />;
    description = "Your store is indexed by search engines. Customers can find you on Google!";
  } else if (!isVerified) {
    status = "pending";
    statusText = "Verification Required";
    statusColor = "bg-yellow-50 border-yellow-200";
    statusIcon = <AlertCircle className="h-5 w-5 text-yellow-600" />;
    description = "Your store needs to be verified before SEO can be enabled. Contact admin for verification.";
  } else {
    status = "inactive";
    statusText = "SEO Inactive";
    statusColor = "bg-gray-50 border-gray-200";
    statusIcon = <XCircle className="h-5 w-5 text-gray-600" />;
    description = "Your store is not indexed by search engines. Contact admin to enable SEO indexing.";
  }

  // Use actual tenant subdomain URL
  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || "plazo.id";
  const storeUrl = `https://${subdomain}.${baseDomain}`;

  return (
    <div className={`rounded-xl border ${statusColor} p-5 ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">SEO Status</h3>
        </div>
        <div className="flex items-center gap-1.5">
          {statusIcon}
          <span className={`text-xs font-medium ${
            status === "active" ? "text-green-700" :
            status === "pending" ? "text-yellow-700" :
            "text-gray-700"
          }`}>
            {statusText}
          </span>
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed mb-3">
        {description}
      </p>

      {isSeoActive && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Your SEO-friendly URL:</p>
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
          >
            {storeUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}

      {!isVerified && (
        <div className="mt-3 pt-3 border-t border-yellow-200">
          <p className="text-xs text-yellow-700 font-medium">
            💡 Tip: Upgrade to premium and get verified to enable SEO indexing
          </p>
        </div>
      )}
    </div>
  );
}
