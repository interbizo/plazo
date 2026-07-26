"use client";

import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";

interface WhatsAppFloatProps {
  phoneNumber: string;
  storeName: string;
  themeColor?: string;
  message?: string;
}

export function WhatsAppFloat({
  phoneNumber,
  storeName,
  themeColor = "#25D366",
  message,
}: WhatsAppFloatProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Show button after 2 seconds
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (!phoneNumber) return null;

  // Clean phone number (remove non-digits)
  const cleanPhone = phoneNumber.replace(/\D/g, "");

  // Default message
  const defaultMessage = `Halo ${storeName}, saya ingin bertanya tentang produk/jasa Anda.`;
  const whatsappMessage = encodeURIComponent(message || defaultMessage);

  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  const handleClick = () => {
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col items-start gap-3">
        {/* Tooltip/Message Box */}
        {isExpanded && (
          <div
            className="animate-in slide-in-from-bottom-2 fade-in duration-300 mb-2 max-w-xs rounded-2xl bg-white p-4 shadow-2xl border border-gray-200"
            style={{
              animation: "slideInLeft 0.3s ease-out",
            }}
          >
            <div className="flex items-start gap-3 mb-3">
              <div
                className="flex-shrink-0 p-2 rounded-full"
                style={{ backgroundColor: `${themeColor}20` }}
              >
                <MessageCircle
                  className="h-5 w-5"
                  style={{ color: themeColor }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  {storeName}
                </p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ada yang bisa kami bantu? Chat dengan kami sekarang!
                </p>
              </div>
              <button
                onClick={() => setIsExpanded(false)}
                className="flex-shrink-0 p-1 rounded-full hover:bg-gray-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <button
              onClick={handleClick}
              className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:shadow-lg"
              style={{
                backgroundColor: themeColor,
                boxShadow: `0 4px 12px ${themeColor}40`,
              }}
            >
              Mulai Chat
            </button>
          </div>
        )}

        {/* Main Button */}
        <button
          onClick={() => {
            if (isExpanded) {
              handleClick();
            } else {
              setIsExpanded(true);
            }
          }}
          className="group relative flex h-14 w-14 items-center justify-center rounded-full shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-3xl"
          style={{
            backgroundColor: themeColor,
            boxShadow: `0 8px 24px ${themeColor}60`,
          }}
          aria-label="Chat WhatsApp"
        >
          <MessageCircle className="h-7 w-7 text-white" />

          {/* Pulse Animation */}
          <span
            className="absolute inset-0 rounded-full animate-ping opacity-75"
            style={{ backgroundColor: themeColor }}
          />

          {/* Notification Badge */}
          {!isExpanded && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-lg">
              1
            </span>
          )}
        </button>
      </div>

      {/* Styles for animation */}
      <style jsx>{`
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
