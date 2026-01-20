"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { Sparkles, Eye, EyeOff, ArrowRight, Monitor } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.login({ email, password });
      const user = await api.getMe();
      setUser(user);

      if (user.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/staff/devices");
      }
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "ログインに失敗しました"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-dark-950">
        {/* Gradient orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-neon-magenta/20 rounded-full blur-[128px] animate-float" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[128px] animate-float" style={{ animationDelay: "-3s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-purple/10 rounded-full blur-[128px]" />

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md">
        {/* Card glow effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-neon-magenta via-neon-purple to-neon-cyan rounded-3xl opacity-20 blur-xl" />

        <div className="relative bg-dark-900/90 backdrop-blur-xl rounded-2xl border border-dark-600/50 overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-0">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-magenta to-neon-cyan flex items-center justify-center shadow-2xl">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-neon-magenta to-neon-cyan opacity-50 blur-xl" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-center text-white tracking-tight">
              ScreenDeck
            </h1>
            <p className="text-center text-gray-400 mt-2 text-sm">
              デジタルサイネージ管理システム
            </p>

            {/* Decorative line */}
            <div className="mt-8 h-px bg-gradient-to-r from-transparent via-dark-500 to-transparent" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-8 space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center">
                <div className="w-2 h-2 rounded-full bg-red-500 mr-3" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                パスワード
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="input pr-12"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn btn-primary w-full py-3 text-base relative overflow-hidden group"
            >
              {/* Shimmer effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

              <span className="relative flex items-center justify-center">
                {isLoading ? (
                  <>
                    <div className="loading-spinner h-5 w-5 mr-2" />
                    ログイン中...
                  </>
                ) : (
                  <>
                    ログイン
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </span>
            </button>
          </form>

          {/* Footer */}
          <div className="px-8 pb-8">
            <div className="flex items-center justify-center space-x-2 text-xs text-gray-600">
              <Monitor className="h-3 w-3" />
              <span>Powered by ScreenDeck v1.0</span>
            </div>
          </div>
        </div>

        {/* Bottom decorative element */}
        <div className="mt-8 flex items-center justify-center space-x-3">
          <div className="w-12 h-px bg-gradient-to-r from-transparent to-neon-magenta/50" />
          <div className="w-2 h-2 rounded-full bg-neon-magenta/50 animate-pulse" />
          <div className="w-2 h-2 rounded-full bg-neon-cyan/50 animate-pulse" style={{ animationDelay: "0.5s" }} />
          <div className="w-2 h-2 rounded-full bg-neon-purple/50 animate-pulse" style={{ animationDelay: "1s" }} />
          <div className="w-12 h-px bg-gradient-to-l from-transparent to-neon-cyan/50" />
        </div>
      </div>
    </div>
  );
}
