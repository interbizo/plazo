"use client";

import Link from "next/link";
import {
  Store,
  Phone,
  Mail,
  MapPin,
  Clock,
  Globe,
  MessageCircle,
  ExternalLink,
} from "lucide-react";
import type { Tenant, StorePage } from "@/types";

// Simple social media icons as SVG components
const Instagram = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const Facebook = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const Twitter = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
);

const Youtube = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

interface StorefrontFooterProps {
  store: Tenant & {
    storePages?: StorePage[];
  };
  subdomain: string;
}

export function StorefrontFooter({ store, subdomain }: StorefrontFooterProps) {
  const socialLinks = store.socialLinks
    ? typeof store.socialLinks === "string"
      ? JSON.parse(store.socialLinks)
      : store.socialLinks
    : {};

  const storeHours = store.storeHours
    ? typeof store.storeHours === "string"
      ? JSON.parse(store.storeHours)
      : store.storeHours
    : null;

  const hasContactInfo =
    store.contactEmail ||
    store.contactPhone ||
    store.contactWhatsapp ||
    store.address;

  const hasSocialLinks = Object.values(socialLinks).some((link) => link);

  const hasStoreHours = storeHours && Object.keys(storeHours).length > 0;

  const visiblePages = store.storePages?.filter((page) => page.isVisible !== false) || [];
  const hasStorePages = visiblePages.length > 0;
  const hasPortfolioOrPages = true; // Always show portfolio section

  return (
    <footer className="mt-20 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Store Info */}
          <div className={`overflow-hidden ${hasPortfolioOrPages ? "" : "lg:col-span-2"}`}>
            <div className="flex items-center gap-3 mb-4">
              {store.logo ? (
                <img
                  src={store.logo}
                  alt={store.name}
                  className="h-12 w-12 rounded-lg object-cover ring-2 ring-gray-100"
                />
              ) : (
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-lg ring-2 ring-gray-100"
                  style={{
                    backgroundColor: store.themeColor
                      ? `${store.themeColor}20`
                      : "rgb(219 234 254)",
                  }}
                >
                  <Store
                    className="h-6 w-6"
                    style={{ color: store.themeColor || "rgb(37 99 235)" }}
                  />
                </div>
              )}
              <div>
                <h3 className="text-lg font-bold text-gray-900">{store.name}</h3>
                {store.tagline && (
                  <p className="text-sm text-gray-500">{store.tagline}</p>
                )}
              </div>
            </div>

            {store.description && (
              <p className="text-sm text-gray-600 leading-relaxed mb-4 max-w-md break-words overflow-hidden">
                {store.description.length > 150
                  ? `${store.description.substring(0, 150)}...`
                  : store.description}
              </p>
            )}

            {/* Social Links */}
            {hasSocialLinks && (
              <div className="flex items-center gap-3 mt-4">
                {socialLinks.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-pink-100 hover:text-pink-600 transition-colors"
                    aria-label="Instagram"
                  >
                    <Instagram className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-blue-100 hover:text-blue-600 transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-sky-100 hover:text-sky-600 transition-colors"
                    aria-label="Twitter"
                  >
                    <Twitter className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.youtube && (
                  <a
                    href={socialLinks.youtube}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-600 transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="h-5 w-5" />
                  </a>
                )}
                {socialLinks.website && (
                  <a
                    href={socialLinks.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                    aria-label="Website"
                  >
                    <Globe className="h-5 w-5" />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Store Pages & Portfolio */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Halaman
            </h4>
            <div className="space-y-2">
              <Link
                href={`/store/${subdomain}/portfolio`}
                className="block text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                Portfolio
              </Link>
              {visiblePages.map((page) => (
                <Link
                  key={page.id}
                  href={`/store/${subdomain}/${page.slug}`}
                  className="block text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  {page.title}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact Info */}
          {hasContactInfo && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Hubungi Kami
              </h4>
              <div className="space-y-3">
                {store.contactEmail && (
                  <a
                    href={`mailto:${store.contactEmail}`}
                    className="flex items-start gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                  >
                    <Mail className="h-4 w-4 mt-0.5 flex-shrink-0 group-hover:text-blue-600" />
                    <span className="break-all">{store.contactEmail}</span>
                  </a>
                )}
                {store.contactPhone && (
                  <a
                    href={`tel:${store.contactPhone}`}
                    className="flex items-start gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                  >
                    <Phone className="h-4 w-4 mt-0.5 flex-shrink-0 group-hover:text-green-600" />
                    <span>{store.contactPhone}</span>
                  </a>
                )}
                {store.contactWhatsapp && (
                  <a
                    href={`https://wa.me/${store.contactWhatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-3 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                  >
                    <MessageCircle className="h-4 w-4 mt-0.5 flex-shrink-0 group-hover:text-green-600" />
                    <span>WhatsApp</span>
                  </a>
                )}
                {store.address && (
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{store.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Store Hours */}
          {hasStoreHours && (
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-4">
                Jam Operasional
              </h4>
              <div className="space-y-2">
                {Object.entries(storeHours).map(([day, hours]: [string, any]) => {
                  const dayLabels: Record<string, string> = {
                    monday: "Senin",
                    tuesday: "Selasa",
                    wednesday: "Rabu",
                    thursday: "Kamis",
                    friday: "Jumat",
                    saturday: "Sabtu",
                    sunday: "Minggu",
                  };

                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-gray-600 font-medium">
                        {dayLabels[day]}
                      </span>
                      <span className="text-gray-500">
                        {hours.closed
                          ? "Tutup"
                          : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <div
                className="p-1.5 rounded-lg"
                style={{
                  backgroundColor: store.themeColor
                    ? `${store.themeColor}15`
                    : "rgb(219 234 254)",
                }}
              >
                <Store
                  className="h-4 w-4"
                  style={{ color: store.themeColor || "rgb(37 99 235)" }}
                />
              </div>
              <span>
                Powered by{" "}
                <a
                  href="https://plazo.id"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold hover:underline transition-colors"
                  style={{ color: store.themeColor || "rgb(37 99 235)" }}
                >
                  Plazo
                </a>
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span>© 2024 {store.name}</span>
              {store.termsOfService && (
                <>
                  <span>•</span>
                  <Link
                    href={`/store/${subdomain}/terms`}
                    className="hover:text-gray-600 transition-colors"
                  >
                    Syarat & Ketentuan
                  </Link>
                </>
              )}
              {store.privacyPolicy && (
                <>
                  <span>•</span>
                  <Link
                    href={`/store/${subdomain}/privacy`}
                    className="hover:text-gray-600 transition-colors"
                  >
                    Kebijakan Privasi
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
