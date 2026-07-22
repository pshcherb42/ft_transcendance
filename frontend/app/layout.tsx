import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';
import { I18nProvider } from '@/context/I18nProvider';
import Footer from "@/components/Footer";
import { Toaster } from 'sonner';
import  { NotificationListener } from "@/components/NotificationListener";

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ft_transcendance',
  description: 'Pong web app',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
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
