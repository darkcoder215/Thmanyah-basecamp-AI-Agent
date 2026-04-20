import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'مجال · وكيل ثمانية لبيسكامب',
  description:
    'وكيل ذكي من ثمانية للتعامل مع حساب بيسكامب — افتح المشاريع، أدر المهام، وادعُ الفريق بأمان كامل.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
