import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import "./globals.css";
import localFont from "next/font/local";

export const ltRogile = localFont({
  src: "../../public/fonts/LTRogile-Regular.ttf",
  variable: "--font-main",
});

export const metadata: Metadata = {
  title: "Viduushi Paathak",
  description: "The portfolio of Viduushi Paathak.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${ltRogile.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
