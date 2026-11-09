import Script from "next/script";

interface SeoDefaults {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
}

/**
 * Ambil default SEO publik dari CMS (endpoint `/api/public/cms/seo`).
 * Berisi Google Analytics ID (`seo_ga_id`) dan Facebook Pixel ID (`seo_fb_pixel`).
 */
async function fetchSeoDefaults(): Promise<SeoDefaults | null> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const response = await fetch(`${apiUrl}/api/public/cms/seo`, {
      next: { revalidate: 3600, tags: ["cms-seo"] },
    });

    if (!response.ok) return null;

    const text = await response.text();
    if (!text || text.trim() === "") return null;

    return JSON.parse(text) as SeoDefaults;
  } catch (error) {
    console.error("Gagal memuat default SEO untuk analytics:", error);
    return null;
  }
}

/**
 * Menyuntikkan script Google Analytics (gtag) dan Facebook Pixel secara
 * server-side berdasarkan konfigurasi CMS. Tidak merender apa pun bila
 * ID belum dikonfigurasi.
 */
export async function AnalyticsScripts() {
  const seo = await fetchSeoDefaults();
  const gaId = seo?.googleAnalyticsId?.trim();
  const pixelId = seo?.facebookPixelId?.trim();

  if (!gaId && !pixelId) return null;

  return (
    <>
      {gaId ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${gaId}');
            `}
          </Script>
        </>
      ) : null}

      {pixelId ? (
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      ) : null}
    </>
  );
}
