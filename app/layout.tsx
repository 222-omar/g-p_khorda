import type { Metadata } from "next";
import { Noto_Kufi_Arabic as NotoKufiFont, Tajawal as TajawalFont } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LanguageProvider } from "@/components/providers/language-provider";
import { AuthProvider } from "@/components/providers/auth-provider";

const tajawal = TajawalFont({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["200", "300", "400", "500", "700", "800", "900"],
  display: "swap",
});

const notoKufi = NotoKufiFont({
  variable: "--font-noto-kufi",
  subsets: ["arabic"],
  weight: ["400", "500", "700", "800", "900"],
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
    <html lang="ar" suppressHydrationWarning className="scroll-smooth">
      <body
        className={`${tajawal.variable} ${notoKufi.variable} font-tajawal antialiased`}
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
