"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  X, 
  Edit2, 
  Check,
  Trash2,
  GripVertical,
  Package
} from "lucide-react";
import toast from "react-hot-toast";

export interface VariantOption {
  optionName: string;
  optionValue: string;
}

export interface ProductVariant {
  id?: string;
  tempId?: string; // Temporary ID for frontend tracking
  name: string;
  sku?: string;
  price?: number;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  options: VariantOption[];
}

interface ProductVariantsFormProps {
  hasVariants: boolean;
  onHasVariantsChange: (has: boolean) => void;
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  basePrice: number;
}

export default function ProductVariantsForm({
  hasVariants,
  onHasVariantsChange,
  variants,
  onVariantsChange,
  basePrice,
}: ProductVariantsFormProps) {
  const [isAddingVariant, setIsAddingVariant] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newVariant, setNewVariant] = useState<ProductVariant>({
    tempId: `temp-${Date.now()}`,
    name: "",
    sku: "",
    price: undefined,
    stock: 0,
    isActive: true,
    sortOrder: 0,
    options: [],
  });
  const [newOption, setNewOption] = useState({ optionName: "", optionValue: "" });

  // Quick variant templates
  const templates = [
    {
      name: "Ukuran Pakaian",
      options: [
        { optionName: "Ukuran", values: ["S", "M", "L", "XL", "XXL"] }
      ]
    },
    {
      name: "Warna",
      options: [
        { optionName: "Warna", values: ["Hitam", "Putih", "Merah", "Biru", "Hijau"] }
      ]
    },
    {
      name: "Ukuran Sepatu",
      options: [
        { optionName: "Ukuran", values: ["38", "39", "40", "41", "42", "43", "44"] }
      ]
    },
    {
      name: "Paket",
      options: [
        { optionName: "Paket", values: ["Basic", "Standard", "Premium"] }
      ]
    },
  ];

  const handleAddOption = () => {
    if (!newOption.optionName || !newOption.optionValue) {
      toast.error("Isi nama dan nilai opsi");
      return;
    }

    setNewVariant(prev => ({
      ...prev,
      options: [...prev.options, { ...newOption }],
    }));
    setNewOption({ optionName: "", optionValue: "" });
  };

  const handleRemoveOption = (index: number) => {
    setNewVariant(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index),
    }));
  };

  const handleSaveVariant = () => {
    if (!newVariant.name) {
      toast.error("Nama variant harus diisi");
      return;
    }

    if (newVariant.options.length === 0) {
      toast.error("Tambahkan minimal 1 opsi variant");
      return;
    }

    if (editingIndex !== null) {
      // Update existing - create new array with updated variant
      const updated = variants.map((v, i) => 
        i === editingIndex 
          ? { ...newVariant, sortOrder: i, tempId: v.tempId || v.id } 
          : v
      );
      onVariantsChange(updated);
      toast.success("Variant diupdate");
    } else {
      // Add new with unique tempId
      const newVariantWithId = { 
        ...newVariant, 
        sortOrder: variants.length,
        tempId: `temp-${Date.now()}-${Math.random()}`
      };
      onVariantsChange([...variants, newVariantWithId]);
      toast.success("Variant ditambahkan");
    }

    // Reset form with new tempId
    setNewVariant({
      tempId: `temp-${Date.now()}`,
      name: "",
      sku: "",
      price: undefined,
      stock: 0,
      isActive: true,
      sortOrder: 0,
      options: [],
    });
    setIsAddingVariant(false);
    setEditingIndex(null);
  };

  const handleEditVariant = (index: number) => {
    // Deep clone to avoid reference issues
    const variantToEdit = JSON.parse(JSON.stringify(variants[index]));
    setNewVariant(variantToEdit);
    setEditingIndex(index);
    setIsAddingVariant(true);
  };

  const handleDeleteVariant = (index: number) => {
    if (confirm("Hapus variant ini?")) {
      onVariantsChange(variants.filter((_, i) => i !== index));
      toast.success("Variant dihapus");
    }
  };

  const handleUseTemplate = (template: typeof templates[0]) => {
    const newVariants: ProductVariant[] = [];
    
    template.options[0].values.forEach((value, index) => {
      newVariants.push({
        tempId: `temp-${Date.now()}-${index}`,
        name: `${template.options[0].optionName}: ${value}`,
        sku: `VAR-${value.toUpperCase()}`,
        price: undefined,
        stock: 0,
        isActive: true,
        sortOrder: index,
        options: [
          {
            optionName: template.options[0].optionName,
            optionValue: value,
          }
        ],
      });
    });

    onVariantsChange(newVariants);
    toast.success(`${newVariants.length} variant ditambahkan dari template`);
  };

  const generateCombinations = () => {
    // Group options by name
    const optionGroups: { [key: string]: string[] } = {};
    
    variants.forEach(v => {
      v.options.forEach(opt => {
        if (!optionGroups[opt.optionName]) {
          optionGroups[opt.optionName] = [];
        }
        if (!optionGroups[opt.optionName].includes(opt.optionValue)) {
          optionGroups[opt.optionName].push(opt.optionValue);
        }
      });
    });

    const optionNames = Object.keys(optionGroups);
    if (optionNames.length < 2) {
      toast.error("Perlu minimal 2 jenis opsi untuk generate kombinasi");
      return;
    }

    // Generate all combinations
    const combinations: ProductVariant[] = [];
    const generate = (current: VariantOption[], depth: number) => {
      if (depth === optionNames.length) {
        const name = current.map(o => o.optionValue).join(" - ");
        const sku = current.map(o => o.optionValue.substring(0, 3).toUpperCase()).join("-");
        combinations.push({
          tempId: `temp-${Date.now()}-${combinations.length}`,
          name,
          sku,
          price: undefined,
          stock: 0,
          isActive: true,
          sortOrder: combinations.length,
          options: [...current],
        });
        return;
      }

      const optionName = optionNames[depth];
      optionGroups[optionName].forEach(value => {
        generate([...current, { optionName, optionValue: value }], depth + 1);
      });
    };

    generate([], 0);
    onVariantsChange(combinations);
    toast.success(`${combinations.length} kombinasi variant dibuat`);
  };

  return (
    <div className="space-y-5">
      {/* Enable Variants Toggle */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Variant Produk
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Aktifkan jika produk memiliki variant seperti ukuran, warna, dll
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => {
              onHasVariantsChange(!hasVariants);
              if (hasVariants) {
                onVariantsChange([]);
              }
            }}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              hasVariants ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                hasVariants ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {hasVariants && (
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-blue-600 bg-blue-50 p-3 rounded-lg">
              💡 Tip: Gunakan template untuk cepat menambahkan variant umum, atau buat custom variant sesuai kebutuhan
            </p>
          </div>
        )}
      </div>

      {/* Variant Management */}
      {hasVariants && (
        <>
          {/* Quick Templates */}
          {variants.length === 0 && !isAddingVariant && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Pilih Cara Menambahkan Variant
                </h3>
              </div>
              
              <div className="space-y-4">
                {/* Manual Add Button */}
                <button
                  type="button"
                  onClick={() => setIsAddingVariant(true)}
                  className="w-full flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 hover:border-blue-400 transition-all"
                >
                  <Plus className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    Tambah Variant Manual
                  </span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-white px-2 text-gray-500">atau gunakan template</span>
                  </div>
                </div>

                {/* Templates */}
                <div className="grid grid-cols-2 gap-3">
                  {templates.map((template, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => handleUseTemplate(template)}
                      className="flex items-center gap-3 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                    >
                      <Package className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">
                          {template.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {template.options[0].values.length} variant
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Existing Variants List */}
          {variants.length > 0 && !isAddingVariant && (
            <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  Daftar Variant ({variants.length})
                </h3>
                <div className="flex gap-2">
                  {variants.length > 0 && (
                    <button
                      type="button"
                      onClick={generateCombinations}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Generate Kombinasi
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsAddingVariant(true)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="h-4 w-4" />
                    Tambah Variant
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {variants.map((variant, index) => (
                  <div
                    key={variant.tempId || variant.id || `variant-${index}`}
                    className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {variant.name}
                        </span>
                        {variant.sku && (
                          <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded">
                            SKU: {variant.sku}
                          </span>
                        )}
                        {!variant.isActive && (
                          <span className="text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-gray-600">
                          Harga: Rp {variant.price?.toLocaleString() || basePrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-600">
                          Stok: {variant.stock}
                        </span>
                        <div className="flex gap-1">
                          {variant.options.map((opt, i) => (
                            <span key={i} className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                              {opt.optionName}: {opt.optionValue}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleEditVariant(index)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVariant(index)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add/Edit Variant Form */}
          {isAddingVariant && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">
                  {editingIndex !== null ? 'Edit Variant' : 'Tambah Variant Baru'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingVariant(false);
                    setEditingIndex(null);
                    setNewVariant({
                      tempId: `temp-${Date.now()}`,
                      name: "",
                      sku: "",
                      price: undefined,
                      stock: 0,
                      isActive: true,
                      sortOrder: 0,
                      options: [],
                    });
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4 bg-white p-4 rounded-lg">
                <Input
                  label="Nama Variant *"
                  value={newVariant.name}
                  onChange={(e) => setNewVariant(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Contoh: Ukuran M - Warna Merah"
                />

                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="SKU (Opsional)"
                    value={newVariant.sku || ""}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, sku: e.target.value }))}
                    placeholder="VAR-001"
                  />
                  <Input
                    label="Harga (Opsional)"
                    type="number"
                    value={newVariant.price || ""}
                    onChange={(e) => setNewVariant(prev => ({ 
                      ...prev, 
                      price: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder={`Default: ${basePrice}`}
                    helperText="Kosongkan untuk pakai harga produk"
                  />
                  <Input
                    label="Stok *"
                    type="number"
                    value={newVariant.stock}
                    onChange={(e) => setNewVariant(prev => ({ 
                      ...prev, 
                      stock: parseInt(e.target.value) || 0 
                    }))}
                  />
                </div>

                {/* Variant Options */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opsi Variant *
                  </label>
                  
                  {newVariant.options.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {newVariant.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700 flex-1">
                            <span className="font-medium">{option.optionName}:</span> {option.optionValue}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      placeholder="Nama opsi (Ukuran, Warna, dll)"
                      value={newOption.optionName}
                      onChange={(e) => setNewOption(prev => ({ ...prev, optionName: e.target.value }))}
                    />
                    <Input
                      placeholder="Nilai (M, Merah, dll)"
                      value={newOption.optionValue}
                      onChange={(e) => setNewOption(prev => ({ ...prev, optionValue: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={handleAddOption}
                      className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="variantActive"
                    checked={newVariant.isActive}
                    onChange={(e) => setNewVariant(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="variantActive" className="text-sm text-gray-700">
                    Variant aktif dan bisa dibeli
                  </label>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={handleSaveVariant}
                  className="flex items-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  {editingIndex !== null ? 'Update Variant' : 'Simpan Variant'}
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingVariant(false);
                    setEditingIndex(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
