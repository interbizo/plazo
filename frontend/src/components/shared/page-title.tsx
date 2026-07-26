"use client";

import { useEffect } from "react";

/**
 * Sets the document title dynamically for client-rendered pages.
 * Usage: <PageTitle title="Produk" /> → "Produk | Plazo"
 */
export function PageTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title ? `${title} | Plazo` : "Plazo — Marketplace SaaS Platform";
  }, [title]);
  return null;
}
