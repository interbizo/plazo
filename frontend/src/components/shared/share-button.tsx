"use client";

import { useState } from "react";
import {
  Share2,
  MessageCircle,
  Link as LinkIcon,
  Mail,
  X,
  Check,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  image?: string;
  variant?: "default" | "icon" | "floating";
  className?: string;
}

// Custom SVG icons for social media
const FacebookIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const TwitterIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const LinkedInIcon = () => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

export function ShareButton({
  url,
  title,
  description = "",
  image = "",
  variant = "default",
  className = "",
}: ShareButtonProps) {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: MessageCircle,
      color: "bg-green-500 hover:bg-green-600",
      url: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      name: "Telegram",
      icon: Send,
      color: "bg-blue-500 hover:bg-blue-600",
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "Facebook",
      icon: FacebookIcon,
      color: "bg-blue-600 hover:bg-blue-700",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      name: "Twitter",
      icon: TwitterIcon,
      color: "bg-sky-500 hover:bg-sky-600",
      url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      name: "LinkedIn",
      icon: LinkedInIcon,
      color: "bg-blue-700 hover:bg-blue-800",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      name: "Email",
      icon: Mail,
      color: "bg-gray-600 hover:bg-gray-700",
      url: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
    },
  ];

  const handleShare = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "width=600,height=400");
    setShowModal(false);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link berhasil disalin!");
      setTimeout(() => {
        setCopied(false);
        setShowModal(false);
      }, 1500);
    } catch (err) {
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          toast.success("Link berhasil disalin!");
          setTimeout(() => {
            setCopied(false);
            setShowModal(false);
          }, 1500);
        } else {
          toast.error("Gagal menyalin link");
        }
      } catch (fallbackErr) {
        toast.error("Gagal menyalin link");
      }
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url,
        });
        setShowModal(false);
      } catch (err) {
        // User cancelled or error
        if ((err as Error).name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
    } else {
      setShowModal(true);
    }
  };

  if (variant === "floating") {
    return (
      <>
        <button
          onClick={handleNativeShare}
          className={`fixed bottom-24 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 group ${className}`}
          title="Bagikan"
        >
          <Share2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
          <span className="text-sm font-semibold">Bagikan</span>
        </button>

        {showModal && (
          <ShareModal
            shareOptions={shareOptions}
            onShare={handleShare}
            onCopyLink={handleCopyLink}
            onClose={() => setShowModal(false)}
            copied={copied}
          />
        )}
      </>
    );
  }

  if (variant === "icon") {
    return (
      <>
        <button
          onClick={handleNativeShare}
          className={`inline-flex items-center justify-center p-2.5 rounded-lg text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200 group ${className}`}
          title="Bagikan"
        >
          <Share2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
        </button>

        {showModal && (
          <ShareModal
            shareOptions={shareOptions}
            onShare={handleShare}
            onCopyLink={handleCopyLink}
            onClose={() => setShowModal(false)}
            copied={copied}
          />
        )}
      </>
    );
  }

  // Default variant
  return (
    <>
      <button
        onClick={handleNativeShare}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 text-purple-700 hover:from-purple-100 hover:to-pink-100 hover:border-purple-300 hover:shadow-md transition-all duration-300 group ${className}`}
        title="Bagikan"
      >
        <Share2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
        <span className="text-sm font-semibold">Bagikan</span>
      </button>

      {showModal && (
        <ShareModal
          shareOptions={shareOptions}
          onShare={handleShare}
          onCopyLink={handleCopyLink}
          onClose={() => setShowModal(false)}
          copied={copied}
        />
      )}
    </>
  );
}

interface ShareModalProps {
  shareOptions: Array<{
    name: string;
    icon: any;
    color: string;
    url: string;
  }>;
  onShare: (url: string) => void;
  onCopyLink: () => void;
  onClose: () => void;
  copied: boolean;
}

function ShareModal({
  shareOptions,
  onShare,
  onCopyLink,
  onClose,
  copied,
}: ShareModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">
            Bagikan ke
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Share Options */}
        <div className="p-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            {shareOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <button
                  key={option.name}
                  onClick={() => onShare(option.url)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full ${option.color} text-white transition-transform group-hover:scale-110`}
                  >
                    {typeof IconComponent === 'function' && IconComponent.prototype === undefined ? (
                      <IconComponent />
                    ) : (
                      <IconComponent className="h-6 w-6" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {option.name}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Copy Link */}
          <div className="pt-4 border-t border-gray-100">
            <button
              onClick={onCopyLink}
              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                copied
                  ? "bg-green-50 border-2 border-green-500 text-green-700"
                  : "bg-gray-50 border-2 border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300"
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-5 w-5" />
                  <span className="text-sm font-semibold">Link Tersalin!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="h-5 w-5" />
                  <span className="text-sm font-semibold">Salin Link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
