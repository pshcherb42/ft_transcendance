import type { Metadata } from 'next';
import { Gasoek_One, Manrope } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { I18nProvider } from '@/context/I18nProvider';
import Footer from "@/components/Footer";
import { Toaster } from 'sonner';
import  { NotificationListener } from "@/components/NotificationListener";

const gasoekOne = Gasoek_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-gasoek',
});

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
});

export const metadata: Metadata = {
  title: 'ft_transcendance',
  description: 'Pong web app',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${gasoekOne.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          <AuthProvider>
            <SocketProvider>
            <NotificationListener />
              <div className="flex flex-1 flex-col">{children}</div>
              <Footer />
              <Toaster position="top-right" richColors />
            </SocketProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}