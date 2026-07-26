"use client";

import { useEffect, useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  slug: string;
  type?: string;
  parentId?: string | null;
  children?: Category[];
  _count?: {
    products?: number;
    services?: number;
  };
}

interface CategoryTreeProps {
  type: "PRODUCT" | "SERVICE";
  selectedSlug?: string;
  onSelect?: (slug: string) => void;
  showCount?: boolean;
  className?: string;
}

export function CategoryTree({
  type,
  selectedSlug,
  onSelect,
  showCount = true,
  className = "",
}: CategoryTreeProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/categories?type=${type}`);
        const data = await response.json();
        const hierarchical = data.categories || [];
        setCategories(hierarchical);

        // Auto-expand categories that contain the selected item
        if (selectedSlug) {
          const toExpand = new Set<string>();
          const findAndExpand = (cats: Category[], targetSlug: string): boolean => {
            for (const cat of cats) {
              if (cat.slug === targetSlug) {
                return true;
              }
              if (cat.children && cat.children.length > 0) {
                if (findAndExpand(cat.children, targetSlug)) {
                  toExpand.add(cat.id);
                  return true;
                }
              }
            }
            return false;
          };
          findAndExpand(hierarchical, selectedSlug);
          setExpandedCategories(toExpand);
        }
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [type, selectedSlug]);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const renderCategory = (cat: Category, level: number = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expandedCategories.has(cat.id);
    const isSelected = cat.slug === selectedSlug;
    const indent = level * 16;

    const count = type === "PRODUCT" ? cat._count?.products : cat._count?.services;

    return (
      <div key={cat.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer transition-colors ${
            isSelected
              ? "bg-indigo-50 text-indigo-700 font-medium"
              : "text-gray-700 hover:bg-gray-50"
          }`}
          style={{ paddingLeft: `${12 + indent}px` }}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(cat.id);
            }
            if (onSelect) {
              onSelect(cat.slug);
            }
          }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(cat.id);
              }}
              className="p-0.5 hover:bg-gray-200 rounded flex-shrink-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <div className="w-4 flex-shrink-0" />
          )}
          <span className="text-sm flex-1">{cat.name}</span>
          {showCount && count !== undefined && count > 0 && (
            <span className="text-xs text-gray-500">({count})</span>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div>
            {cat.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className={`space-y-2 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 bg-gray-100 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Belum ada kategori
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {categories.map((cat) => renderCategory(cat))}
    </div>
  );
}
