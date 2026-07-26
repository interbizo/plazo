"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronDown,
  Home,
  Package,
  Wrench,
  FileText,
  ExternalLink,
  ShoppingBag,
  Briefcase,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================

interface StoreMenu {
  id: string;
  label: string;
  type: "page" | "products" | "services" | "external" | "custom" | "portfolio";
  url?: string;
  pageSlug?: string;
  icon?: string;
  isVisible: boolean;
  sortOrder: number;
  parentId?: string;
  children?: StoreMenu[];
}

interface StorefrontNavigationProps {
  subdomain: string;
  menus: StoreMenu[];
  themeColor?: string;
  className?: string;
}

// ============================================
// ICON MAPPING
// ============================================

const ICON_MAP: Record<string, any> = {
  home: Home,
  package: Package,
  wrench: Wrench,
  "file-text": FileText,
  "external-link": ExternalLink,
  "shopping-bag": ShoppingBag,
  briefcase: Briefcase,
};

// ============================================
// COMPONENT
// ============================================

export function StorefrontNavigation({
  subdomain,
  menus,
  themeColor = "#3B82F6",
  className,
}: StorefrontNavigationProps) {
  const pathname = usePathname();
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Close dropdowns on route change
  useEffect(() => {
    setOpenDropdown(null);
  }, [pathname]);

  // ============================================
  // HELPERS
  // ============================================

  const getMenuUrl = (menu: StoreMenu): string => {
    switch (menu.type) {
      case "products":
        return `/store/${subdomain}/products`;
      case "services":
        return `/store/${subdomain}/services`;
      case "portfolio":
        return `/store/${subdomain}/portfolio`;
      case "page":
        return `/store/${subdomain}/${menu.pageSlug}`;
      case "external":
        return menu.url || "#";
      case "custom":
        return menu.url || "#";
      default:
        return "#";
    }
  };

  const isActive = (menu: StoreMenu): boolean => {
    const url = getMenuUrl(menu);
    if (pathname === url) return true;
    
    // Check if current path starts with menu url (for nested routes)
    if (menu.type === "products" && pathname.includes("/products")) return true;
    if (menu.type === "services" && pathname.includes("/services")) return true;
    if (menu.type === "portfolio" && pathname.includes("/portfolio")) return true;
    
    return false;
  };

  const renderIcon = (menu: StoreMenu) => {
    if (!menu.icon) return null;
    
    const Icon = ICON_MAP[menu.icon];
    if (!Icon) return null;
    
    return <Icon className="h-4 w-4" />;
  };

  const toggleDropdown = (menuId: string) => {
    setOpenDropdown(openDropdown === menuId ? null : menuId);
  };

  // ============================================
  // RENDER MENU ITEM
  // ============================================

  const renderMenuItem = (menu: StoreMenu, isMobile: boolean = false) => {
    const hasChildren = menu.children && menu.children.length > 0;
    const url = getMenuUrl(menu);
    const active = isActive(menu);
    const isExternal = menu.type === "external";
    const isDropdownOpen = openDropdown === menu.id;

    const baseClasses = cn(
      "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300",
      active
        ? "text-white shadow-md"
        : "text-gray-700 hover:text-gray-900 hover:bg-gray-100",
      isMobile && "w-full justify-start"
    );

    const activeStyle = active
      ? { 
          background: themeColor 
            ? `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`
            : 'linear-gradient(135deg, rgb(59 130 246) 0%, rgb(37 99 235) 100%)',
          color: "white",
          boxShadow: themeColor 
            ? `0 4px 12px ${themeColor}40`
            : '0 4px 12px rgba(59, 130, 246, 0.3)'
        }
      : {};

    if (hasChildren) {
      return (
        <div key={menu.id} className={isMobile ? "w-full" : "relative group"}>
          <button
            onClick={() => isMobile && toggleDropdown(menu.id)}
            className={baseClasses}
            style={activeStyle}
          >
            {renderIcon(menu)}
            <span>{menu.label}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                isDropdownOpen && "rotate-180"
              )}
            />
          </button>

          {/* Desktop Dropdown */}
          {!isMobile && (
            <div className="absolute left-0 top-full mt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 py-2 overflow-hidden">
                {menu.children!.map((child) => {
                  const childUrl = getMenuUrl(child);
                  const childActive = isActive(child);
                  const childIsExternal = child.type === "external";

                  return (
                    <Link
                      key={child.id}
                      href={childUrl}
                      target={childIsExternal ? "_blank" : undefined}
                      rel={childIsExternal ? "noopener noreferrer" : undefined}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200",
                        childActive
                          ? "text-white font-semibold"
                          : "text-gray-700 hover:bg-gray-50"
                      )}
                      style={
                        childActive
                          ? { 
                              background: themeColor 
                                ? `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`
                                : 'linear-gradient(135deg, rgb(59 130 246) 0%, rgb(37 99 235) 100%)',
                              color: "white"
                            }
                          : {}
                      }
                    >
                      {renderIcon(child)}
                      <span>{child.label}</span>
                      {childIsExternal && (
                        <ExternalLink className="h-3 w-3 ml-auto" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Mobile Dropdown */}
          {isMobile && isDropdownOpen && (
            <div className="pl-4 mt-2 space-y-1">
              {menu.children!.map((child) => {
                const childUrl = getMenuUrl(child);
                const childActive = isActive(child);
                const childIsExternal = child.type === "external";

                return (
                  <Link
                    key={child.id}
                    href={childUrl}
                    target={childIsExternal ? "_blank" : undefined}
                    rel={childIsExternal ? "noopener noreferrer" : undefined}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all duration-200",
                      childActive
                        ? "text-white font-semibold shadow-md"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                    style={
                      childActive
                        ? { 
                            background: themeColor 
                              ? `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}dd 100%)`
                              : 'linear-gradient(135deg, rgb(59 130 246) 0%, rgb(37 99 235) 100%)',
                            color: "white"
                          }
                        : {}
                    }
                  >
                    {renderIcon(child)}
                    <span>{child.label}</span>
                    {childIsExternal && (
                      <ExternalLink className="h-3 w-3 ml-auto" />
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        key={menu.id}
        href={url}
        target={isExternal ? "_blank" : undefined}
        rel={isExternal ? "noopener noreferrer" : undefined}
        className={baseClasses}
        style={activeStyle}
      >
        {renderIcon(menu)}
        <span>{menu.label}</span>
        {isExternal && <ExternalLink className="h-3 w-3 ml-auto" />}
      </Link>
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <>
      {/* Desktop Navigation */}
      <nav
        className={cn(
          "hidden lg:flex items-center gap-2",
          !className?.includes('flex-col') && className
        )}
      >
        {menus.map((menu) => renderMenuItem(menu, false))}
      </nav>

      {/* Mobile Navigation - Used when className includes flex-col */}
      {className?.includes('flex-col') && (
        <nav className={cn("flex flex-col gap-2", className)}>
          {menus.map((menu) => renderMenuItem(menu, true))}
        </nav>
      )}
    </>
  );
}
