"use client";

import { useState } from "react";
import type { Category } from "@/types";
import type { SortBy } from "@/services/marketplace.service";
import { ChevronDown, ChevronRight, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";


interface FilterSidebarProps {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  minPrice: string;
  maxPrice: string;
  onMinPriceChange: (v: string) => void;
  onMaxPriceChange: (v: string) => void;
  onApplyPrice: () => void;
  onReset: () => void;
  priceLabel?: string;
}

const SORT_OPTIONS: { value: SortBy; label: string }[] = [
  { value: "newest", label: "Terbaru" },
  { value: "best_seller", label: "Terlaris" },
  { value: "rating", label: "Rating Tertinggi" },
  { value: "popular", label: "Paling Populer" },
  { value: "price_low", label: "Harga: Rendah ke Tinggi" },
  { value: "price_high", label: "Harga: Tinggi ke Rendah" },
];

export function FilterSidebar({
  categories,
  selectedCategory,
  onCategoryChange,
  sortBy,
  onSortChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyPrice,
  onReset,
  priceLabel = "Harga",
}: FilterSidebarProps) {
  // Auto-expand all parent categories by default
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const parentIds = new Set<string>();
    categories.forEach(cat => {
      if (cat.parentId) {
        parentIds.add(cat.parentId);
      }
    });
    return parentIds;
  });
  
  const hasFilters =
    selectedCategory || minPrice || maxPrice || sortBy !== "newest";

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

  // Build hierarchy
  const buildHierarchy = (cats: Category[]): Category[] => {
    const categoryMap = new Map<string, Category & { children: Category[] }>();
    
    cats.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] });
    });

    cats.forEach(cat => {
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(categoryMap.get(cat.id)!);
        }
      }
    });

    return Array.from(categoryMap.values()).filter(c => !c.parentId);
  };

  const renderCategory = (cat: Category & { children?: Category[] }, level: number = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expandedCategories.has(cat.id);
    const isSelected = selectedCategory === cat.id;
    const indent = level * 16;

    return (
      <div key={cat.id}>
        <button
          onClick={() => {
            onCategoryChange(cat.id);
          }}
          className={`flex items-center gap-2 w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
            isSelected
              ? "bg-blue-50 font-medium text-blue-700"
              : "text-gray-600 hover:bg-gray-50"
          }`}
          style={{ paddingLeft: `${12 + indent}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(cat.id);
              }}
              className="flex-shrink-0 hover:bg-gray-200 rounded p-0.5"
            >
              {isExpanded ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronRight className="h-3.5 w-3.5" />
              )}
            </button>
          )}
          {!hasChildren && level > 0 && <span className="w-4" />}
          <span className="flex-1 truncate">{cat.name}</span>
          {cat._count && (cat._count.products || cat._count.services) && (
            <span className="text-xs text-gray-400">
              ({cat._count.products || cat._count.services})
            </span>
          )}
        </button>
        {hasChildren && isExpanded && (
          <div className="mt-0.5 space-y-0.5">
            {cat.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const hierarchicalCategories = buildHierarchy(categories);

  return (
    <aside className="space-y-6">
      {/* Sort */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Urutkan</h3>
        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Categories - Nested */}
      {categories.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Kategori</h3>
          <div className="space-y-1">
            <button
              onClick={() => onCategoryChange("")}
              className={`block w-full rounded-lg px-3 py-1.5 text-left text-sm transition-colors ${
                !selectedCategory
                  ? "bg-blue-50 font-medium text-blue-700"
                  : "text-gray-600 hover:bg-gray-50"
              }`}
            >
              Semua Kategori
            </button>
            {hierarchicalCategories.map((cat) => renderCategory(cat))}
          </div>
        </div>
      )}

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-2">
          {priceLabel}
        </h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onMinPriceChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-gray-400">—</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onMaxPriceChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="mt-2 w-full"
          onClick={onApplyPrice}
        >
          Terapkan
        </Button>
      </div>

      {/* Reset */}
      {hasFilters && (
        <button
          onClick={onReset}
          className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
        >
          <X className="h-3.5 w-3.5" />
          Reset Filter
        </button>
      )}
    </aside>
  );
}

// Mobile filter trigger
export function MobileFilterButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 lg:hidden"
    >
      <Filter className="h-4 w-4" />
      Filter
      {count > 0 && (
        <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">
          {count}
        </span>
      )}
    </button>
  );
}
