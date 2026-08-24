import "./globals.css";
import { Analytics } from "@vercel/analytics/next";
import { Providers } from "@/context/providers";
import { Header, Footer, CartDrawer, Toaster } from "@/components/chrome";
import { AuthModal } from "@/components/auth-modal";

export const metadata = {
  title: "Doron Goldstein Photography — Wildlife Prints",
  description: "Wildlife photographs by Doron Goldstein. Shipped locally across South Africa and internationally.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <AuthModal />
          <Toaster />
        </Providers>
        <Analytics />
      </body>
    </html>
  );
}
