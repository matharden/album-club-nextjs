import type { Metadata } from "next";
import Script from "next/script";

import { siteMetadata } from "@/lib/content";

import "./globals.css";

const { title, siteUrl, fontName, googleAnalyticsId } = siteMetadata;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    // Pages set only their own name; Gatsby's Head exports appended the site
    // title by hand ("Archive - Album Club").
    template: `%s - ${title}`,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Replaces gatsby-omni-font-loader. */}
        {fontName && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link
              rel="stylesheet"
              href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`}
            />
          </>
        )}
        {fontName && (
          <style>{`:root { --font-name: ${fontName}; }`}</style>
        )}
      </head>
      <body>
        {children}
        {/* Replaces gatsby-plugin-google-gtag. */}
        {googleAnalyticsId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${googleAnalyticsId}');`}
            </Script>
          </>
        )}
      </body>
    </html>
  );
}
