"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface FooterProps {
  settings?: Record<string, string>;
}

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  sortOrder: number;
}

export function Footer({ settings = {} }: FooterProps) {
  const siteName = settings.site_name || "Plazo";
  const siteLogo = settings.site_logo;
  const siteDescription = settings.site_description || "Platform marketplace all-in-one untuk produk, jasa, dan freelance.";
  const socialInstagram = settings.social_instagram;
  const socialTwitter = settings.social_twitter;
  const socialFacebook = settings.social_facebook;
  
  const [cmsPages, setCmsPages] = useState<CmsPage[]>([]);

  useEffect(() => {
    // Fetch CMS pages for footer
    const fetchCmsPages = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${baseUrl}/api/public/cms/navigation`);
        if (response.ok) {
          const data = await response.json();
          setCmsPages(data || []);
        }
      } catch (error) {
        console.error("Failed to fetch CMS pages:", error);
      }
    };

    fetchCmsPages();
  }, []);

  return (
    <footer className="bg-gray-900 text-gray-300">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              {siteLogo ? (
                <img
                  src={siteLogo}
                  alt={siteName}
                  className="h-8 w-8 object-contain"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <span className="text-sm font-bold text-white">
                    {siteName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xl font-bold text-white">{siteName}</span>
            </div>
            <p className="mt-3 text-sm text-gray-400 leading-relaxed">
              {siteDescription}
            </p>
            {/* Social media */}
            <div className="mt-4 flex items-center gap-3">
              {settings.social_instagram && (
                <a 
                  href={settings.social_instagram} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" 
                  aria-label="Instagram"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              )}
              {settings.social_twitter && (
                <a 
                  href={settings.social_twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" 
                  aria-label="Twitter"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
              )}
              {settings.social_facebook && (
                <a 
                  href={settings.social_facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-gray-800 p-2 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors" 
                  aria-label="Facebook"
                >
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              )}
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="text-sm font-semibold text-white">Marketplace</h3>
            <ul className="mt-3 space-y-2.5">
              <li><Link href="/products" className="text-sm text-gray-400 hover:text-white transition-colors">Semua Produk</Link></li>
              <li><Link href="/services" className="text-sm text-gray-400 hover:text-white transition-colors">Semua Jasa</Link></li>
              <li><Link href="/jobs" className="text-sm text-gray-400 hover:text-white transition-colors">Job Board</Link></li>
            </ul>
          </div>

          {/* Seller */}
          <div>
            <h3 className="text-sm font-semibold text-white">Untuk Seller</h3>
            <ul className="mt-3 space-y-2.5">
              <li><Link href="/register?role=SELLER" className="text-sm text-gray-400 hover:text-white transition-colors">Mulai Jualan</Link></li>
              <li><Link href="/seller/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">Seller Dashboard</Link></li>
            </ul>
          </div>

          {/* Bantuan */}
          <div>
            <h3 className="text-sm font-semibold text-white">Bantuan</h3>
            <ul className="mt-3 space-y-2.5">
              <li><Link href="/terms" className="text-sm text-gray-400 hover:text-white transition-colors">Syarat & Ketentuan</Link></li>
              <li><Link href="/privacy" className="text-sm text-gray-400 hover:text-white transition-colors">Kebijakan Privasi</Link></li>
              {cmsPages.map((page) => (
                <li key={page.id}>
                  <Link 
                    href={`/pages/${page.slug}`} 
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Pembayaran */}
          <div>
            <h3 className="text-sm font-semibold text-white">Pembayaran</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {["BCA", "BNI", "BRI", "Mandiri"].map((bank) => (
                <span key={bank} className="inline-flex items-center rounded-md bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300">
                  {bank}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500">Transfer bank manual dengan verifikasi admin</p>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              &copy; {new Date().getFullYear()} {siteName}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <Link href="/terms" className="hover:text-gray-300 transition-colors">Syarat & Ketentuan</Link>
              <span className="text-gray-700">|</span>
              <Link href="/privacy" className="hover:text-gray-300 transition-colors">Privasi</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
