import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sahasra Single — The Fold for Phones That Don’t Fold',
  description: 'Roll your phone like closing a book and the image folds away in real-time. A WebGL + gravity sensor experience.',
  metadataBase: new URL('https://single.sahasra.tech'),
  applicationName: 'Single',
  authors: [{ name: 'Sahasra Tech', url: 'https://www.instagram.com/sahasra.tech' }],
  keywords: ['iPhone fold animation', 'WebGL 2', 'gravity sensor', 'devicemotion', 'Sahasra Tech', 'PWA'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Single',
  },
  openGraph: {
    title: 'Sahasra Single — The Fold for Phones That Don’t Fold',
    description: 'Roll your phone like closing a book and the image folds away. WebGL + live gravity sensor magic.',
    url: 'https://single.sahasra.tech',
    siteName: 'Sahasra Single by Sahasra Tech',
    type: 'website',
    images: [
      {
        url: '/backgrounds/default.png',
        width: 1200,
        height: 630,
        alt: 'Sahasra Single Fold',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sahasra Single — The Fold for Phones That Don’t Fold',
    description: 'Roll your phone like closing a book and the image folds away. WebGL + live gravity sensor magic.',
    creator: '@sahasratech',
  },
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-black">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Single" />
      </head>
      <body className="w-screen h-screen bg-black text-white overflow-hidden select-none m-0 p-0">
        {children}
      </body>
    </html>
  );
}
