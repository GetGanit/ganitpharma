import './globals.css';

export const metadata = {
  title: 'GanitPharma - Enterprise Pharmacy OS',
  description: 'Ultra-fast POS, FEFO Inventory, and Multi-Tenant Pharmacy Management.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
