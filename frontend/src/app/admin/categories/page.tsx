"use client";

import { useEffect, useState } from "react";
import { adminApi } from "@/services/admin.service";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconPicker } from "@/components/ui/icon-picker";
import { FolderTree, Plus, Pencil, Trash2, ChevronRight, ChevronDown, FolderPlus } from "lucide-react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

interface Category {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  type?: string;
  parentId?: string | null;
  icon?: string;
  sortOrder?: number;
  isActive?: boolean;
  children?: Category[];
  _count?: {
    products?: number;
    services?: number;
    children?: number;
  };
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"PRODUCT" | "SERVICE">("PRODUCT");
  const [parentId, setParentId] = useState<string>("");
  const [icon, setIcon] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [filterType, setFilterType] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const { data } = await adminApi.getCategories(
        filterType ? { type: filterType } : undefined,
      );
      const hierarchical = Array.isArray(data)
        ? data
        : data.data || data.categories || [];
      
      // Flatten hierarchical categories to get all categories
      const flattenCategories = (cats: Category[]): Category[] => {
        const result: Category[] = [];
        const flatten = (items: Category[]) => {
          items.forEach(item => {
            result.push(item);
            if (item.children && item.children.length > 0) {
              flatten(item.children);
            }
          });
        };
        flatten(cats);
        return result;
      };
      
      const flat = data.allCategories || flattenCategories(hierarchical);
      setCategories(hierarchical);
      setAllCategories(flat);
    } catch {
      setCategories([]);
      setAllCategories([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadCategories = async () => {
      setIsLoading(true);
      try {
        const { data } = await adminApi.getCategories(
          filterType ? { type: filterType } : undefined,
        );
        const hierarchical = Array.isArray(data)
          ? data
          : data.data || data.categories || [];
        
        // Flatten hierarchical categories to get all categories
        const flattenCategories = (cats: Category[]): Category[] => {
          const result: Category[] = [];
          const flatten = (items: Category[]) => {
            items.forEach(item => {
              result.push(item);
              if (item.children && item.children.length > 0) {
                flatten(item.children);
              }
            });
          };
          flatten(cats);
          return result;
        };
        
        const flat = data.allCategories || flattenCategories(hierarchical);
        setCategories(hierarchical);
        setAllCategories(flat);
      } catch {
        setCategories([]);
        setAllCategories([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadCategories();
  }, [filterType]);

  const resetForm = () => {
    setName("");
    setSlug("");
    setDescription("");
    setType("PRODUCT");
    setParentId("");
    setIcon("");
    setSortOrder(0);
    setIsActive(true);
    setEditId(null);
    setShowForm(false);
  };

  const handleEdit = (cat: Category) => {
    setName(cat.name);
    setSlug(cat.slug || "");
    setDescription(cat.description || "");
    setType((cat.type as "PRODUCT" | "SERVICE") || "PRODUCT");
    setParentId(cat.parentId || "");
    setIcon(cat.icon || "");
    setSortOrder(cat.sortOrder || 0);
    setIsActive(cat.isActive ?? true);
    setEditId(cat.id);
    setShowForm(true);
  };

  const handleAddSubCategory = (parentCategory: Category) => {
    resetForm();
    setType((parentCategory.type as "PRODUCT" | "SERVICE") || "PRODUCT");
    setParentId(parentCategory.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const payload = {
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        description: description || undefined,
        type,
        parentId: parentId || undefined,
        icon: icon || undefined,
        sortOrder,
        isActive,
      };
      if (editId) {
        await adminApi.updateCategory(editId, payload);
        toast.success("Kategori diupdate");
      } else {
        await adminApi.createCategory(payload);
        toast.success("Kategori dibuat");
      }
      resetForm();
      fetchCategories();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Yakin hapus kategori ini?")) return;
    try {
      await adminApi.deleteCategory(id);
      toast.success("Kategori dihapus");
      fetchCategories();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Gagal menghapus");
    }
  };

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

  // Calculate category level dynamically
  const getCategoryLevel = (category: Category): number => {
    let level = 0;
    let currentCat = category;
    
    while (currentCat.parentId) {
      level++;
      const parent = allCategories.find(c => c.id === currentCat.parentId);
      if (!parent) break;
      currentCat = parent;
    }
    
    return level;
  };

  const renderCategory = (cat: Category, level: number = 0) => {
    const hasChildren = cat.children && cat.children.length > 0;
    const isExpanded = expandedCategories.has(cat.id);
    const indent = level * 24;

    // Determine category level label dynamically (only for sub categories)
    let levelLabel = "";
    let levelColor = "";
    let showLevelBadge = level > 0; // Only show badge for sub categories
    
    if (level === 1) {
      levelLabel = "Sub";
      levelColor = "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    } else if (level === 2) {
      levelLabel = "Sub-Sub";
      levelColor = "bg-green-50 text-green-700 ring-1 ring-green-200";
    } else if (level > 2) {
      levelLabel = `L${level + 1}`;
      levelColor = "bg-gray-50 text-gray-700 ring-1 ring-gray-200";
    }

    return (
      <div key={cat.id}>
        <div
          className="flex items-center justify-between px-4 py-3 hover:bg-gray-50/80 transition-colors border-b border-gray-100"
          style={{ paddingLeft: `${16 + indent}px` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {hasChildren ? (
              <button
                onClick={() => toggleExpand(cat.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-200 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </button>
            ) : (
              <div className="w-6 flex-shrink-0" />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Level Badge - Only for sub categories */}
                {showLevelBadge && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${levelColor}`}
                  >
                    {levelLabel}
                  </span>
                )}
                
                {cat.icon && (
                  <Icon icon={cat.icon} className="w-4 h-4 text-gray-600 flex-shrink-0" />
                )}
                
                <span className={`text-sm ${level === 0 ? 'font-semibold' : 'font-medium'} text-gray-900 truncate`}>
                  {cat.name}
                </span>
                
                {/* Type Badge - Minimal */}
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${
                    cat.type === "PRODUCT"
                      ? "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200"
                      : "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                  }`}
                >
                  {cat.type === "PRODUCT" ? "Product" : "Service"}
                </span>
                
                {!cat.isActive && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-red-50 text-red-700 ring-1 ring-red-200">
                    Inactive
                  </span>
                )}
                
                {hasChildren && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                    <span className="text-gray-400">·</span>
                    {cat._count?.children} {cat._count?.children === 1 ? 'child' : 'children'}
                  </span>
                )}
              </div>
              
              {cat.description && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{cat.description}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-0.5 ml-3 flex-shrink-0">
            <button
              onClick={() => handleAddSubCategory(cat)}
              className="rounded p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600 transition-colors"
              title="Add Sub-Category"
            >
              <FolderPlus className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleEdit(cat)}
              className="rounded p-1.5 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              title="Edit Category"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDelete(cat.id)}
              className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Delete Category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
        {hasChildren && isExpanded && (
          <div className="bg-gray-50/30">
            {cat.children!.map((child) => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Get available parent categories (exclude current category and its children when editing)
  const getAvailableParents = () => {
    if (!editId) {
      return allCategories.filter((c) => c.type === type);
    }
    // When editing, exclude self and descendants
    const excludeIds = new Set<string>([editId]);
    const addDescendants = (catId: string) => {
      allCategories
        .filter((c) => c.parentId === catId)
        .forEach((child) => {
          excludeIds.add(child.id);
          addDescendants(child.id);
        });
    };
    addDescendants(editId);
    return allCategories.filter(
      (c) => c.type === type && !excludeIds.has(c.id)
    );
  };

  // Render parent options with hierarchy
  const renderParentOptions = () => {
    const parents = getAvailableParents();
    
    if (parents.length === 0) {
      return null;
    }
    
    // Sort by sortOrder first
    const sortedParents = [...parents].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    // Build a map for quick lookup
    const categoryMap = new Map<string, Category>();
    sortedParents.forEach(cat => {
      categoryMap.set(cat.id, cat);
    });

    // Recursive render function
    const renderCategoryAndChildren = (cat: Category, level: number = 0): JSX.Element[] => {
      const elements: JSX.Element[] = [];
      const indent = "\u00A0\u00A0".repeat(level * 2); // Non-breaking spaces for indentation
      
      let prefix = "";
      let levelLabel = "";
      
      if (level === 0) {
        prefix = "📁 ";
        levelLabel = " (KATEGORI UTAMA)";
      } else if (level === 1) {
        prefix = "  └─ ";
        levelLabel = " (SUB KATEGORI)";
      } else if (level === 2) {
        prefix = "    └─ ";
        levelLabel = " (SUB-SUB KATEGORI)";
      } else {
        prefix = "      └─ ";
        levelLabel = ` (LEVEL ${level + 1})`;
      }
      
      // Add current category
      elements.push(
        <option key={cat.id} value={cat.id}>
          {indent}{prefix}{cat.name}{levelLabel}
        </option>
      );

      // Find and render children
      const children = sortedParents.filter(c => c.parentId === cat.id);
      children.forEach(child => {
        elements.push(...renderCategoryAndChildren(child, level + 1));
      });

      return elements;
    };

    // Get root categories (no parent)
    const rootCategories = sortedParents.filter(c => !c.parentId);
    
    // If no root categories found, show all categories as flat list
    if (rootCategories.length === 0) {
      return sortedParents.map(cat => (
        <option key={cat.id} value={cat.id}>
          {cat.name}
        </option>
      ));
    }
    
    // Render all categories hierarchically
    const allOptions: JSX.Element[] = [];
    rootCategories.forEach(rootCat => {
      allOptions.push(...renderCategoryAndChildren(rootCat, 0));
    });

    return allOptions;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manage Categories</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize categories with hierarchical structure (Main → Sub → Sub-Sub)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Main Category
          </Button>
        </div>
      </div>

      {/* Info Box - Struktur Kategori */}
      {categories.length > 0 && (
        <div className="mb-4 rounded-lg bg-blue-50/50 border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Current Category Structure
          </h3>
          <div className="text-xs text-blue-800 space-y-2">
            {categories.slice(0, 2).map((cat) => (
              <div key={cat.id}>
                <div className="flex items-center gap-2">
                  <span className="inline-block rounded px-2 py-0.5 bg-purple-50 text-purple-700 ring-1 ring-purple-200 font-semibold text-[10px] uppercase">
                    Main
                  </span>
                  {cat.icon && <Icon icon={cat.icon} className="w-4 h-4 text-purple-700" />}
                  <span className="font-medium">{cat.name}</span>
                </div>
                {cat.children && cat.children.length > 0 && (
                  <>
                    {cat.children.slice(0, 2).map((subCat) => (
                      <div key={subCat.id}>
                        <div className="flex items-center gap-2 ml-4 mt-1.5">
                          <span className="inline-block rounded px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 font-semibold text-[10px] uppercase">
                            Sub
                          </span>
                          {subCat.icon && <Icon icon={subCat.icon} className="w-4 h-4 text-blue-700" />}
                          <span>└─ {subCat.name}</span>
                        </div>
                        {subCat.children && subCat.children.length > 0 && (
                          <>
                            {subCat.children.slice(0, 3).map((subSubCat) => (
                              <div key={subSubCat.id} className="flex items-center gap-2 ml-8 mt-1.5">
                                <span className="inline-block rounded px-2 py-0.5 bg-green-50 text-green-700 ring-1 ring-green-200 font-semibold text-[10px] uppercase">
                                  Sub-Sub
                                </span>
                                {subSubCat.icon && <Icon icon={subSubCat.icon} className="w-4 h-4 text-green-700" />}
                                <span>└─ {subSubCat.name}</span>
                              </div>
                            ))}
                            {subCat.children.length > 3 && (
                              <div className="ml-8 text-gray-600 text-[10px] mt-1">
                                ... and {subCat.children.length - 3} more
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                    {cat.children.length > 2 && (
                      <div className="ml-4 text-gray-600 text-[10px] mt-1">
                        ... and {cat.children.length - 2} more sub-categories
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
            {categories.length > 2 && (
              <div className="text-gray-600 text-[10px] mt-2">
                ... and {categories.length - 2} more main categories
              </div>
            )}
          </div>
          <p className="text-xs text-blue-700 mt-3 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-blue-600"></span>
            Leave "Parent Category" empty to create a new main category
          </p>
        </div>
      )}

      {/* Info Box - Panduan (hanya tampil jika belum ada kategori) */}
      {categories.length === 0 && (
        <div className="mb-4 rounded-lg bg-blue-50/50 border border-blue-200 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <FolderTree className="h-4 w-4" />
            Example Category Structure
          </h3>
          <div className="text-xs text-blue-800 space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-block rounded px-2 py-0.5 bg-purple-50 text-purple-700 ring-1 ring-purple-200 font-semibold uppercase">
                Main
              </span>
              <span>Fashion</span>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="inline-block rounded px-2 py-0.5 bg-blue-50 text-blue-700 ring-1 ring-blue-200 font-semibold uppercase">
                Sub
              </span>
              <span>└─ Women's Clothing</span>
            </div>
            <div className="flex items-center gap-2 ml-8">
              <span className="inline-block rounded px-2 py-0.5 bg-green-50 text-green-700 ring-1 ring-green-200 font-semibold uppercase">
                Sub-Sub
              </span>
              <span>└─ Long Sleeve Shirts</span>
            </div>
            <div className="ml-8 text-gray-600">
              <span>└─ Short Sleeve Shirts</span>
            </div>
            <div className="ml-8 text-gray-600">
              <span>└─ Blouses</span>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-3 flex items-center gap-1.5">
            <span className="inline-block w-1 h-1 rounded-full bg-blue-600"></span>
            Start by creating a main category first
          </p>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="mb-4 flex gap-2">
        {[
          { value: "", label: "All" },
          { value: "PRODUCT", label: "Products" },
          { value: "SERVICE", label: "Services" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterType(f.value)}
            className={`rounded-lg px-4 py-2 text-xs font-medium transition-colors ${
              filterType === f.value
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 hover:bg-gray-50 border border-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">
                {editId ? "Edit Category" : "New Category"}
              </h3>
              <div className="mt-2">
                {!parentId && (
                  <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg ring-1 ring-purple-200">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-600"></span>
                    <span className="text-xs font-medium">Creating New Main Category</span>
                  </div>
                )}
                {parentId && (() => {
                  const selectedParent = allCategories.find(c => c.id === parentId);
                  if (!selectedParent) return null;
                  
                  const parentLevel = getCategoryLevel(selectedParent);
                  
                  if (parentLevel === 0) {
                    return (
                      <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg ring-1 ring-blue-200">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                        <span className="text-xs font-medium">
                          Creating Sub-Category under "{selectedParent.name}"
                        </span>
                      </div>
                    );
                  } else if (parentLevel === 1) {
                    return (
                      <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg ring-1 ring-green-200">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-600"></span>
                        <span className="text-xs font-medium">
                          Creating Sub-Sub-Category under "{selectedParent.name}"
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg ring-1 ring-orange-200">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-600"></span>
                        <span className="text-xs font-medium">
                          Creating Level {parentLevel + 2} under "{selectedParent.name}"
                        </span>
                      </div>
                    );
                  }
                })()}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Category name *"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="Slug (optional, auto-generated)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            />
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Category description (optional)"
            rows={2}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category Type *
              </label>
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as "PRODUCT" | "SERVICE");
                  setParentId(""); // Reset parent when type changes
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                <option value="PRODUCT">Product</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Parent Category
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              >
                <option value="">None (Create Main Category)</option>
                {renderParentOptions()}
              </select>
              <p className="text-xs text-gray-500 mt-1.5">
                Leave empty to create a main category
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Category Icon *
              </label>
              <IconPicker
                value={icon}
                onChange={setIcon}
                placeholder="Select icon for category..."
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Use icons from Iconify library
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Display Order
              </label>
              <input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Status
            </label>
            <select
              value={isActive ? "true" : "false"}
              onChange={(e) => setIsActive(e.target.value === "true")}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            >
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} isLoading={saving}>
              {editId ? "Update Category" : "Create Category"}
            </Button>
            <Button size="sm" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-12 w-12 text-gray-300" />}
          title="Belum ada kategori"
          description=""
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {categories.map((cat) => renderCategory(cat))}
        </div>
      )}
    </div>
  );
}
