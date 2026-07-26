"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  id: string;
  name: string;
  slug: string;
}

interface CategoryBreadcrumbProps {
  categoryId: string;
  type: "PRODUCT" | "SERVICE";
  className?: string;
}

export function CategoryBreadcrumb({
  categoryId,
  type,
  className = "",
}: CategoryBreadcrumbProps) {
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBreadcrumb = async () => {
      if (!categoryId) {
        setBreadcrumb([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/categories/${categoryId}/breadcrumb`);
        const data = await response.json();
        setBreadcrumb(data.breadcrumb || []);
      } catch (error) {
        console.error("Failed to fetch breadcrumb:", error);
        setBreadcrumb([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBreadcrumb();
  }, [categoryId]);

  if (isLoading || breadcrumb.length === 0) {
    return null;
  }

  const baseUrl = type === "PRODUCT" ? "/products" : "/services";

  return (
    <nav className={`flex items-center gap-1 text-sm ${className}`}>
      <Link
        href={baseUrl}
        className="text-gray-500 hover:text-gray-700 transition-colors"
      >
        {type === "PRODUCT" ? "Produk" : "Jasa"}
      </Link>
      {breadcrumb.map((item, index) => (
        <div key={item.id} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4 text-gray-400" />
          {index === breadcrumb.length - 1 ? (
            <span className="text-gray-900 font-medium">{item.name}</span>
          ) : (
            <Link
              href={`${baseUrl}?category=${item.slug}`}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {item.name}
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}
