"use client";

import { useEffect, useState, useMemo, useCallback } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string | null;
  isActive: boolean;
  children?: Category[];
}

interface CategorySubcategorySelectProps {
  categories: Category[];
  selectedCategoryId: string;
  selectedSubcategoryId?: string;
  onCategoryChange: (categoryId: string) => void;
  onSubcategoryChange?: (subcategoryId: string) => void;
  required?: boolean;
  disabled?: boolean;
  categoryLabel?: string;
  subcategoryLabel?: string;
  categoryPlaceholder?: string;
  subcategoryPlaceholder?: string;
}

export function CategorySubcategorySelect({
  categories,
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  onSubcategoryChange,
  required = false,
  disabled = false,
  categoryLabel = "Kategori",
  subcategoryLabel = "Sub Kategori",
  categoryPlaceholder = "Pilih kategori",
  subcategoryPlaceholder = "Pilih sub kategori",
}: CategorySubcategorySelectProps) {
  // Separate parent categories and build children map
  const { parentCategories, subcategoriesMap } = useMemo(() => {
    const parents: Category[] = [];
    const subMap = new Map<string, Category[]>();

    categories.forEach((cat) => {
      if (!cat.parentId) {
        parents.push(cat);
      } else {
        const existing = subMap.get(cat.parentId) || [];
        existing.push(cat);
        subMap.set(cat.parentId, existing);
      }
    });

    // Sort parent categories by name
    parents.sort((a, b) => a.name.localeCompare(b.name));

    // Sort subcategories by name
    subMap.forEach((subs) => {
      subs.sort((a, b) => a.name.localeCompare(b.name));
    });

    return { parentCategories: parents, subcategoriesMap: subMap };
  }, [categories]);

  // Get subcategories for selected parent category
  const availableSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategoriesMap.get(selectedCategoryId) || [];
  }, [selectedCategoryId, subcategoriesMap]);

  // Validate subcategory when category or subcategories change
  useEffect(() => {
    if (selectedSubcategoryId && selectedCategoryId && onSubcategoryChange) {
      // Check if the selected subcategory is valid for the current category
      const isValid = availableSubcategories.some(
        (sub) => sub.id === selectedSubcategoryId
      );
      
      // If not valid, reset subcategory
      if (!isValid) {
        onSubcategoryChange("");
      }
    }
  }, [selectedCategoryId, selectedSubcategoryId, availableSubcategories, onSubcategoryChange]);

  // Handle category change - wrapped with useCallback to prevent unnecessary re-renders
  const handleCategoryChange = useCallback(
    (categoryId: string) => {
      // If changing to a different category, reset subcategory first
      if (categoryId !== selectedCategoryId && onSubcategoryChange) {
        onSubcategoryChange("");
      }
      
      // Then update parent category
      onCategoryChange(categoryId);
    },
    [selectedCategoryId, onCategoryChange, onSubcategoryChange],
  );

  // Handle subcategory change
  const handleSubcategoryChange = useCallback(
    (subcategoryId: string) => {
      if (onSubcategoryChange) {
        onSubcategoryChange(subcategoryId);
      }
    },
    [onSubcategoryChange],
  );

  return (
    <div className="space-y-4">
      {/* Parent Category Select */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {categoryLabel} {required && <span className="text-red-500">*</span>}
        </label>
        <select
          value={selectedCategoryId || ""}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          required={required}
          disabled={disabled}
        >
          <option value="">{categoryPlaceholder}</option>
          {parentCategories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
        {selectedCategoryId && (
          <p className="text-xs text-emerald-600 mt-1 font-medium">
            ✓ Kategori terpilih
          </p>
        )}
      </div>

      {/* Subcategory Select - Only show if parent category is selected and has subcategories */}
      {selectedCategoryId && availableSubcategories.length > 0 && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {subcategoryLabel}{" "}
            <span className="text-gray-400 text-xs">(Opsional)</span>
          </label>
          <select
            value={selectedSubcategoryId || ""}
            onChange={(e) => handleSubcategoryChange(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            <option value="">{subcategoryPlaceholder}</option>
            {availableSubcategories.map((subcat) => (
              <option key={subcat.id} value={subcat.id}>
                {subcat.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Pilih sub kategori untuk klasifikasi yang lebih spesifik
          </p>
          {selectedSubcategoryId && (
            <p className="text-xs text-emerald-600 mt-1 font-medium">
              ✓ Sub kategori terpilih
            </p>
          )}
        </div>
      )}

      {/* Info message when no subcategories available */}
      {selectedCategoryId && availableSubcategories.length === 0 && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
          Kategori ini tidak memiliki sub kategori
        </div>
      )}
    </div>
  );
}
