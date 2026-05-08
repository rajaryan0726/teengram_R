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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-blue-50 text-slate-900 dark:bg-slate-950 dark:text-gray-100 transition-colors duration-500 overflow-x-hidden`}
      >
        {/* Global Ambient 3D Background */}
        <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
          <div className="ambient-blob bg-blue-400 dark:bg-blue-600 top-[-10%] left-[-10%] w-[50vw] h-[50vw] animate-[pulse_8s_ease-in-out_infinite]"></div>
          <div className="ambient-blob bg-cyan-300 dark:bg-cyan-600 bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] animate-[pulse_10s_ease-in-out_infinite_reverse]"></div>
          <div className="ambient-blob bg-purple-400 dark:bg-purple-900 top-[40%] left-[20%] w-[30vw] h-[30vw] animate-[pulse_6s_ease-in-out_infinite] opacity-30 dark:opacity-10"></div>
        </div>

        <ThemeProvider>
          <SessionWrapper> 
            <SocketProvider>
              <div className="relative z-0">
                {children}
              </div>
              <BottomNavbar />
            </SocketProvider>
          </SessionWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
