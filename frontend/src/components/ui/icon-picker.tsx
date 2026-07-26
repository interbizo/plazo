"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "@iconify/react";
import { Search, X } from "lucide-react";

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
  placeholder?: string;
}

// Popular icons untuk kategori marketplace
const POPULAR_ICONS = [
  // Shopping & Commerce
  { icon: "mdi:cart", label: "Cart" },
  { icon: "mdi:shopping", label: "Shopping" },
  { icon: "mdi:store", label: "Store" },
  { icon: "mdi:tag", label: "Tag" },
  { icon: "mdi:gift", label: "Gift" },
  
  // Electronics & Tech
  { icon: "mdi:laptop", label: "Laptop" },
  { icon: "mdi:cellphone", label: "Phone" },
  { icon: "mdi:monitor", label: "Monitor" },
  { icon: "mdi:headphones", label: "Headphones" },
  { icon: "mdi:camera", label: "Camera" },
  { icon: "mdi:printer", label: "Printer" },
  { icon: "mdi:keyboard", label: "Keyboard" },
  { icon: "mdi:mouse", label: "Mouse" },
  
  // Fashion & Clothing
  { icon: "mdi:tshirt-crew", label: "T-Shirt" },
  { icon: "mdi:shoe-formal", label: "Shoes" },
  { icon: "mdi:bag-personal", label: "Bag" },
  { icon: "mdi:watch", label: "Watch" },
  { icon: "mdi:sunglasses", label: "Sunglasses" },
  { icon: "mdi:ring", label: "Ring" },
  
  // Home & Living
  { icon: "mdi:home", label: "Home" },
  { icon: "mdi:sofa", label: "Sofa" },
  { icon: "mdi:bed", label: "Bed" },
  { icon: "mdi:lamp", label: "Lamp" },
  { icon: "mdi:table-furniture", label: "Table" },
  { icon: "mdi:chair-rolling", label: "Chair" },
  
  // Food & Beverage
  { icon: "mdi:food", label: "Food" },
  { icon: "mdi:coffee", label: "Coffee" },
  { icon: "mdi:pizza", label: "Pizza" },
  { icon: "mdi:cake", label: "Cake" },
  { icon: "mdi:ice-cream", label: "Ice Cream" },
  
  // Sports & Fitness
  { icon: "mdi:dumbbell", label: "Dumbbell" },
  { icon: "mdi:run", label: "Running" },
  { icon: "mdi:bike", label: "Bike" },
  { icon: "mdi:basketball", label: "Basketball" },
  { icon: "mdi:soccer", label: "Soccer" },
  
  // Beauty & Health
  { icon: "mdi:face-woman", label: "Beauty" },
  { icon: "mdi:heart-pulse", label: "Health" },
  { icon: "mdi:bottle-tonic-plus", label: "Medicine" },
  { icon: "mdi:spray", label: "Spray" },
  
  // Books & Education
  { icon: "mdi:book-open-page-variant", label: "Book" },
  { icon: "mdi:school", label: "School" },
  { icon: "mdi:pencil", label: "Pencil" },
  { icon: "mdi:notebook", label: "Notebook" },
  
  // Toys & Kids
  { icon: "mdi:teddy-bear", label: "Toy" },
  { icon: "mdi:baby-carriage", label: "Baby" },
  { icon: "mdi:puzzle", label: "Puzzle" },
  
  // Automotive
  { icon: "mdi:car", label: "Car" },
  { icon: "mdi:motorbike", label: "Motorbike" },
  { icon: "mdi:car-wrench", label: "Car Parts" },
  
  // Services
  { icon: "mdi:wrench", label: "Repair" },
  { icon: "mdi:hammer", label: "Construction" },
  { icon: "mdi:paint-brush", label: "Paint" },
  { icon: "mdi:broom", label: "Cleaning" },
  { icon: "mdi:truck-delivery", label: "Delivery" },
  
  // Digital & Software
  { icon: "mdi:code-tags", label: "Code" },
  { icon: "mdi:web", label: "Web" },
  { icon: "mdi:cellphone-link", label: "App" },
  { icon: "mdi:cloud", label: "Cloud" },
  
  // Art & Design
  { icon: "mdi:palette", label: "Art" },
  { icon: "mdi:brush", label: "Brush" },
  { icon: "mdi:image", label: "Image" },
  { icon: "mdi:video", label: "Video" },
  { icon: "mdi:music", label: "Music" },
  
  // Office & Business
  { icon: "mdi:briefcase", label: "Business" },
  { icon: "mdi:file-document", label: "Document" },
  { icon: "mdi:calculator", label: "Calculator" },
  { icon: "mdi:chart-line", label: "Chart" },
];

export function IconPicker({ value, onChange, placeholder = "Pilih icon..." }: IconPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredIcons = POPULAR_ICONS.filter(
    (item) =>
      item.label.toLowerCase().includes(search.toLowerCase()) ||
      item.icon.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected Icon Display */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-4 py-2.5 border-2 border-gray-300 rounded-lg hover:border-indigo-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-colors bg-white"
      >
        {value ? (
          <>
            <Icon icon={value} className="w-6 h-6 text-indigo-600" />
            <span className="flex-1 text-left text-sm text-gray-900">{value}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
              }}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </>
        ) : (
          <span className="flex-1 text-left text-sm text-gray-500">{placeholder}</span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-white border-2 border-gray-200 rounded-lg shadow-xl max-h-96 overflow-hidden">
          {/* Search */}
          <div className="p-3 border-b border-gray-200 sticky top-0 bg-white">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari icon..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
              />
            </div>
          </div>

          {/* Icons Grid */}
          <div className="p-3 overflow-y-auto max-h-80">
            {filteredIcons.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                Tidak ada icon yang cocok
              </div>
            ) : (
              <div className="grid grid-cols-6 gap-2">
                {filteredIcons.map((item) => (
                  <button
                    key={item.icon}
                    type="button"
                    onClick={() => {
                      onChange(item.icon);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-lg hover:bg-indigo-50 transition-colors ${
                      value === item.icon ? "bg-indigo-100 ring-2 ring-indigo-500" : ""
                    }`}
                    title={item.label}
                  >
                    <Icon icon={item.icon} className="w-6 h-6 text-gray-700" />
                    <span className="text-xs text-gray-600 truncate w-full text-center">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="p-2 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500 text-center">
              {filteredIcons.length} icon tersedia • Powered by Iconify
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
