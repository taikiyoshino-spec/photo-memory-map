'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError('メールアドレスかパスワードが正しくありません')
      } else {
        router.push('/')
        router.refresh()
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) {
        setError(error.message)
      } else {
        setInfo('確認メールを送信しました。メールのリンクをクリック後、ログインしてください。')
        setMode('login')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-gray-50 dark:bg-slate-900">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🗺️</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">旅行記録マップ</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">家族の旅の思い出を地図で残そう</p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-6 space-y-4">
          {/* ログイン / 新規登録タブ */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-slate-700">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setInfo(null) }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === 'login'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setInfo(null) }}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                mode === 'signup'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              新規登録
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                メールアドレス
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="family@example.com"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                placeholder="6文字以上"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            {error && (
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            )}
            {info && (
              <p className="text-sm text-blue-600 dark:text-blue-400">{info}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 mt-1"
            >
              {loading ? '処理中...' : mode === 'login' ? 'ログイン' : '新規登録'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
