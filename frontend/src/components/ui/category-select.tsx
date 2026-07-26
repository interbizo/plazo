"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug?: string;
  type?: string;
  parentId?: string | null;
  children?: Category[];
}

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  type: "PRODUCT" | "SERVICE";
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CategorySelect({
  value,
  onChange,
  type,
  placeholder = "Pilih kategori",
  className = "",
  disabled = false,
}: CategorySelectProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/categories?type=${type}`);
        const data = await response.json();
        const flat = data.allCategories || data.categories || [];
        setCategories(flat);
      } catch (error) {
        console.error("Failed to fetch categories:", error);
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, [type]);

  const renderOption = (cat: Category, level: number = 0): JSX.Element => {
    const indent = "  ".repeat(level);
    const prefix = level > 0 ? "└─ " : "";
    
    return (
      <option key={cat.id} value={cat.id}>
        {indent}{prefix}{cat.name}
      </option>
    );
  };

  const renderOptionsRecursive = (
    cats: Category[],
    parentId: string | null = null,
    level: number = 0
  ): JSX.Element[] => {
    const filtered = cats.filter((c) => c.parentId === parentId);
    const result: JSX.Element[] = [];

    filtered.forEach((cat) => {
      result.push(renderOption(cat, level));
      const children = renderOptionsRecursive(cats, cat.id, level + 1);
      result.push(...children);
    });

    return result;
  };

  if (isLoading) {
    return (
      <select
        disabled
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none ${className}`}
      >
        <option>Memuat kategori...</option>
      </select>
    );
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 appearance-none ${className}`}
      >
        <option value="">{placeholder}</option>
        {renderOptionsRecursive(categories, null, 0)}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
    </div>
  );
}
