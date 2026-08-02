"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

// Mengambil URL halaman di browser setelah hidrasi agar hasil render server tetap konsisten.
export function useCurrentPageUrl() {
  const pathname = usePathname();
  const [pageUrl, setPageUrl] = useState("");

  useEffect(() => {
    setPageUrl(window.location.href);
  }, [pathname]);

  return pageUrl;
}
