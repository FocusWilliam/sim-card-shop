import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'SIM Card Shop - Prepaid Data Plans',
  description: 'Buy prepaid SIM cards and data plans at the best prices',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/" className="text-xl font-bold text-primary-700">
              📱 SIM Card Shop
            </Link>
            <nav className="flex items-center gap-6 text-sm">
              <Link href="/" className="hover:text-primary-600 transition-colors">
                Plans
              </Link>
              <Link
                href="/orders"
                className="hover:text-primary-600 transition-colors"
              >
                My Orders
              </Link>
              <Link
                href="/cart"
                className="relative hover:text-primary-600 transition-colors"
              >
                Cart
              </Link>
            </nav>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t bg-gray-50 py-8 mt-12">
          <div className="max-w-6xl mx-auto px-4 text-center text-sm text-gray-500">
            <p>© 2025 SIM Card Shop. All rights reserved.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
