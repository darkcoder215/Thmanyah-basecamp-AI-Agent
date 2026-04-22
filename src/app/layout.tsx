import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'عفريت شركة ثمانية · وكيل بيسكامب',
  description:
    'عفريت شركة ثمانية: وكيل ذكي للتعامل مع حساب بيسكامب — افتح المشاريع، أدر المهام، وادعُ الفريق بأمان كامل.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
