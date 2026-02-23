import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// Log startup
if (typeof window === 'undefined') {
  console.log('[TwinFlames] 🚀 Server starting up...');
  console.log('[TwinFlames] Node env:', process.env.NODE_ENV);
  console.log('[TwinFlames] Appwrite endpoint configured:', !!process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT);
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TwinFlames",
  description: "Our private space.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TwinFlames",
  },
};

export const viewport: Viewport = {
  themeColor: "#0d0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Prevents accidental zooming during dice rolls or drawing
};
export const appleWebApp: Metadata["appleWebApp"] = {
  capable: true,
  statusBarStyle: "black-translucent",
  title: "TwinFlames",
  // Add this line:
  startupImage: "/icon-512.png", 
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Debug logging for deployment
  if (typeof window !== 'undefined') {
    console.log('🚀 TwinFlames App Loaded (Client)');
  }

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
