import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { AuthProvider } from "@/components/providers/auth-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const cairo = Cairo({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "4Sale - سوقك الذكي للمستعمل والخردة",
  description: "وفر فلوسك وساهم في حماية البيئة. منصة ذكية لبيع المستعمل والخردة في مصر مدعومة بالذكاء الاصطناعي",
  keywords: "بيع مستعمل، خردة، مصر، ذكاء اصطناعي، سوق، marketplace, refurb, sustainable",
  authors: [{ name: "4Sale Team" }],

  openGraph: {
    title: "4Sale - سوقك الذكي للمستعمل والخردة",
    description: "منصة ذكية لبيع المستعمل والخردة في مصر",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${cairo.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
