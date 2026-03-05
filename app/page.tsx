"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="bg-gray-50 dark:bg-[#0a0a14] text-gray-900 dark:text-white min-h-screen overflow-hidden transition-colors duration-300">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl float" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-500/8 rounded-full blur-3xl float-delay" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Brand */}
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-orange-500 flex items-center justify-center">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Effort Chart</h1>
          </div>
          <p className="text-gray-500 dark:text-white/50 text-lg max-w-md">
            日々の努力を可視化し、目標達成をサポートする
          </p>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-sm">
          <div className="bg-white dark:bg-[#1e1e2e]/60 backdrop-blur-xl border border-gray-200 dark:border-white/[0.06] rounded-3xl p-8 shadow-xl dark:shadow-2xl">
            <h2 className="text-xl font-semibold text-center mb-2">ログイン</h2>
            <p className="text-gray-400 dark:text-white/40 text-sm text-center mb-8">
              アカウントにサインインして始めましょう
            </p>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-medium py-3.5 px-6 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all duration-200 hover:shadow-lg active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google でログイン
            </button>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/[0.06]">
              <p className="text-gray-400 dark:text-white/30 text-xs text-center leading-relaxed">
                ログインすることで、利用規約とプライバシーポリシーに同意したものとみなされます。
              </p>
            </div>
          </div>

          {/* Feature badges */}
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              { emoji: "⏱", label: "タイマー記録" },
              { emoji: "📊", label: "グラフ分析" },
              { emoji: "🏆", label: "実績解除" },
            ].map(({ emoji, label }) => (
              <div
                key={label}
                className="bg-white/80 dark:bg-[#1e1e2e]/30 backdrop-blur border border-gray-200 dark:border-white/[0.04] rounded-2xl p-4 text-center"
              >
                <div className="text-2xl mb-1">{emoji}</div>
                <div className="text-xs text-gray-500 dark:text-white/40">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
