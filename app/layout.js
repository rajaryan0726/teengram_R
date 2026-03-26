import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionWrapper from "./Components/SessionWrapper";
import { ThemeProvider } from "./Components/ThemeProvider";
import SocketProvider from "./providers/SocketProvider";
import BottomNavbar from "./Components/BottomNavbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "TeenGram",
  description: "Your Own Filtered Social Media",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-gray-100 transition-colors duration-300`}
      >
        <ThemeProvider>
          <SessionWrapper> 
            <SocketProvider>
              {children}
              <BottomNavbar />
            </SocketProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
