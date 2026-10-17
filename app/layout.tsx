import type { Metadata } from 'next';
import './globals.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'LittleTalk AI - Adaptive English Learning for Kids Under 7',
  description:
    'A child-friendly, safe, and adaptive English learning chatbot for children aged 3–6. Learn words, phrases, and sentences with Lumi the friendly star companion.',
  keywords: [
    'English learning for kids',
    'children chatbot',
    'preschool vocabulary',
    'educational AI',
    'early childhood learning',
  ],
  authors: [{ name: 'LittleTalk AI Team' }],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#FEF9F0] text-gray-800 antialiased selection:bg-amber-200 selection:text-amber-900">
        {children}
      </body>
    </html>
  );
}
