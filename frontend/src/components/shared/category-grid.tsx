"use client";

import Link from "next/link";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Icon } from "@iconify/react";
import { useState } from "react";

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  type: string;
  children?: Category[];
  _count?: {
    products?: number;
    services?: number;
    children?: number;
  };
}

interface CategoryGridProps {
  categories: Category[];
  type: "PRODUCT" | "SERVICE";
  title: string;
  description: string;
  viewAllHref: string;
}

// Default fallback icons
const getDefaultIcon = (type: string) => {
  return type === "PRODUCT" ? "mdi:shopping" : "mdi:briefcase";
};

const colors = [
  { bg: "bg-blue-500", hover: "group-hover:bg-blue-600", text: "text-blue-600" },
  { bg: "bg-indigo-500", hover: "group-hover:bg-indigo-600", text: "text-indigo-600" },
  { bg: "bg-purple-500", hover: "group-hover:bg-purple-600", text: "text-purple-600" },
  { bg: "bg-pink-500", hover: "group-hover:bg-pink-600", text: "text-pink-600" },
  { bg: "bg-cyan-500", hover: "group-hover:bg-cyan-600", text: "text-cyan-600" },
  { bg: "bg-teal-500", hover: "group-hover:bg-teal-600", text: "text-teal-600" },
  { bg: "bg-emerald-500", hover: "group-hover:bg-emerald-600", text: "text-emerald-600" },
  { bg: "bg-sky-500", hover: "group-hover:bg-sky-600", text: "text-sky-600" },
];

export function CategoryGrid({
  categories,
  type,
  title,
  description,
  viewAllHref,
}: CategoryGridProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

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

  // Show only root categories (max 8)
  const rootCategories = categories.filter(c => !c.children || c.children.length === 0).slice(0, 8);
  const categoriesWithChildren = categories.filter(c => c.children && c.children.length > 0).slice(0, 4);

  return (
    <section className="mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
                <Icon icon={type === "PRODUCT" ? "mdi:shopping" : "mdi:briefcase"} className="w-6 h-6" />
              </span>
              {title}
            </h2>
            <p className="text-xs text-gray-500 mt-1 ml-13">{description}</p>
          </div>
          <Link
            href={viewAllHref}
            className="group text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
          >
            Lihat Semua
            <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Root Categories Grid */}
        {rootCategories.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {rootCategories.map((cat, idx) => {
              const color = colors[idx % colors.length];
              const icon = cat.icon || getDefaultIcon(cat.type);
              const count = type === "PRODUCT" ? cat._count?.products : cat._count?.services;

              return (
                <Link
                  key={cat.id}
                  href={`${viewAllHref}?categorySlug=${cat.slug}`}
                  className="group relative flex flex-col items-center gap-2.5 rounded-xl bg-white border border-gray-100 p-4 text-center hover:border-blue-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <div className={`relative flex h-14 w-14 items-center justify-center rounded-xl ${color.bg} ${color.hover} shadow-md group-hover:shadow-xl transition-all duration-300 group-hover:scale-110`}>
                    <Icon icon={icon} className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-700 group-hover:text-blue-600 font-semibold leading-tight transition-colors">
                      {cat.name}
                    </span>
                    {count !== undefined && count > 0 && (
                      <span className="text-[10px] text-gray-400">
                        {count} items
                      </span>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-xl bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                </Link>
              );
            })}
          </div>
        )}

        {/* Categories with Children */}
        {categoriesWithChildren.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {categoriesWithChildren.map((cat, idx) => {
              const isExpanded = expandedCategories.has(cat.id);
              const color = colors[idx % colors.length];
              const icon = cat.icon || getDefaultIcon(cat.type);
              const childrenCount = cat._count?.children || 0;

              return (
                <div
                  key={cat.id}
                  className="rounded-xl bg-white border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Parent Category Header */}
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`${viewAllHref}?categorySlug=${cat.slug}`}
                        className={`flex items-center gap-3 group flex-1`}
                      >
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color.bg} shadow-sm`}>
                          <Icon icon={icon} className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className={`text-sm font-semibold ${color.text} group-hover:underline`}>
                            {cat.name}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {childrenCount} sub kategori
                          </p>
                        </div>
                      </Link>
                      {cat.children && cat.children.length > 0 && (
                        <button
                          onClick={() => toggleExpand(cat.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <ChevronDown
                            className={`h-4 w-4 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sub Categories */}
                  {isExpanded && cat.children && cat.children.length > 0 && (
                    <div className="p-3 grid grid-cols-2 gap-2">
                      {cat.children.slice(0, 6).map((subCat) => {
                        const subCount = type === "PRODUCT" ? subCat._count?.products : subCat._count?.services;
                        const subIcon = subCat.icon || getDefaultIcon(subCat.type);
                        
                        return (
                          <Link
                            key={subCat.id}
                            href={`${viewAllHref}?categorySlug=${subCat.slug}`}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
                          >
                            <Icon icon={subIcon} className="w-4 h-4 text-gray-600" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-gray-700 group-hover:text-blue-600 truncate">
                                {subCat.name}
                              </p>
                              {subCount !== undefined && subCount > 0 && (
                                <p className="text-[10px] text-gray-400">
                                  {subCount} items
                                </p>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                      {cat.children.length > 6 && (
                        <Link
                          href={`${viewAllHref}?categorySlug=${cat.slug}`}
                          className="flex items-center justify-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors col-span-2"
                        >
                          <span className="text-xs text-gray-600 font-medium">
                            +{cat.children.length - 6} lainnya
                          </span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
