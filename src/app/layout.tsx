import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import Link from 'next/link'
import ThemeProvider from '@/components/ThemeProvider'
import ThemeToggle from '@/components/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'
import './globals.css'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '旅行記録マップ',
  description: '子供との旅行・遠出の写真を地図で整理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
      </head>
      <body className={`${geist.className} bg-gray-50 dark:bg-slate-900 min-h-screen`}>
        <ThemeProvider>
          <header className="bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 sticky top-0 z-50">
            <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
              <Link href="/" className="font-bold text-gray-900 dark:text-white text-lg">
                🗺️ 旅行記録
              </Link>
              <nav className="flex items-center gap-3">
                <Link href="/upload" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                  📷
                </Link>
                <Link href="/places" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                  📍 施設
                </Link>
                <Link href="/trips" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
                  ✈️ 旅行
                </Link>
                <Link href="/debug" className="text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                  🔧
                </Link>
                <ThemeToggle />
                <LogoutButton />
              </nav>
            </div>
          </header>
          <main className="max-w-2xl mx-auto">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  )
}
