import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono, Source_Serif_4 } from "next/font/google";
import { NavigationProgress } from "@/components/navigation-progress";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const serif = Source_Serif_4({ variable: "--font-serif", subsets: ["latin"], weight: ["500", "600"] });

const description = "Verified community: hidden by default, video-checked by a person";

export const metadata: Metadata = {
  metadataBase: new URL("https://verified-community-gate.vercel.app"),
  title: { default: "Trust gate demo", template: "%s · Trust gate demo" },
  description,
  robots: { index: false, follow: false },
  // The image is app/opengraph-image.png (design/make_brand.py); Next.js adds its URL, size and alt text.
  openGraph: { title: "Trust gate demo", description, siteName: "Trust gate demo", type: "website" },
  twitter: { card: "summary_large_image", title: "Trust gate demo", description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} ${serif.variable}`}>
      <body className="flex min-h-dvh flex-col font-sans antialiased">
        <a
          href="#main"
          className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50"
        >
          Skip to content
        </a>
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        <SiteHeader />
        <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 outline-none sm:px-6 sm:py-10">
          {children}
        </main>
        <footer className="border-t border-border/80">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground sm:px-6">
            <p>Sample by Bereket A. · fictional people and media</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
