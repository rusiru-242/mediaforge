import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Inter } from 'next/font/google';
import '@/styles/globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'MediaForge — Universal Media Downloader & Transcoder',
  description:
    'High-performance cross-platform media downloader and universal media converter. Download authorized web media and transcode video, audio, and images seamlessly.',
  keywords: ['media downloader', 'video converter', 'audio transcoder', 'ffmpeg', 'image converter', 'mediaforge'],
  authors: [{ name: 'MediaForge Team' }],
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'MediaForge — Universal Media Downloader & Transcoder',
    description: 'High-performance, database-free, privacy-first media downloader and converter.',
    url: 'https://mediaforge.local',
    siteName: 'MediaForge',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MediaForge — Universal Media Downloader & Transcoder',
    description: 'High-performance, database-free, privacy-first media downloader and converter.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const stored = localStorage.getItem('theme');
                  const supportDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (stored === 'dark' || (!stored && supportDark)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-surface font-sans text-on-surface antialiased transition-colors duration-200 dark:bg-slate-950 dark:text-slate-100">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
