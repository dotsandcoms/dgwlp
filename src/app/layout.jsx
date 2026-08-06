import "./globals.css";
import { Providers } from "@/context/providers";
import { Header, Footer, CartDrawer, Toaster } from "@/components/chrome";
import { AuthModal } from "@/components/auth-modal";

export const metadata = {
  title: "Doron Goldstein Photography — Limited Edition Wildlife Prints",
  description: "Signed, limited-edition fine-art wildlife photographs by Doron Goldstein. Printed on archival paper and canvas, shipped across South Africa.",
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
      </body>
    </html>
  );
}
