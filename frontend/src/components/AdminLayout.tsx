"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Store,
  Monitor,
  Megaphone,
  BarChart3,
  LogOut,
  Menu,
  X,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "ダッシュボード", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "店舗管理", href: "/admin/stores", icon: Store },
  { name: "端末管理", href: "/admin/devices", icon: Monitor },
  { name: "キャンペーン", href: "/admin/campaigns", icon: Megaphone },
  { name: "レポート", href: "/admin/reports", icon: BarChart3 },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await api.logout();
    clearUser();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Background mesh gradient */}
      <div className="fixed inset-0 bg-mesh-pattern pointer-events-none" />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar background with glass effect */}
        <div className="absolute inset-0 bg-dark-900/95 backdrop-blur-xl border-r border-dark-700/50" />

        {/* Decorative gradient line on right edge */}
        <div className="absolute top-0 right-0 bottom-0 w-px bg-gradient-to-b from-neon-magenta/50 via-neon-cyan/30 to-neon-purple/50" />

        <div className="relative h-full flex flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between h-20 px-6">
            <Link href="/admin/dashboard" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-magenta to-neon-cyan flex items-center justify-center shadow-neon-magenta">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-neon-magenta to-neon-cyan opacity-50 blur-lg group-hover:opacity-75 transition-opacity" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">ScreenDeck</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Digital Signage</p>
              </div>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-dark-700/50 text-gray-400 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto no-scrollbar">
            {navigation.map((item, index) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive
                      ? "text-white"
                      : "text-gray-400 hover:text-white"
                  )}
                  onClick={() => setSidebarOpen(false)}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  {/* Active background */}
                  {isActive && (
                    <>
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-neon-magenta/20 via-neon-magenta/10 to-transparent" />
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-neon-magenta shadow-neon-magenta" />
                    </>
                  )}

                  {/* Hover background */}
                  {!isActive && (
                    <div className="absolute inset-0 rounded-xl bg-dark-700/0 group-hover:bg-dark-700/50 transition-colors" />
                  )}

                  <item.icon
                    className={cn(
                      "relative h-5 w-5 mr-3 transition-colors",
                      isActive ? "text-neon-magenta" : "text-gray-500 group-hover:text-gray-300"
                    )}
                  />
                  <span className="relative">{item.name}</span>

                  {isActive && (
                    <ChevronRight className="relative ml-auto h-4 w-4 text-neon-magenta/50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User profile */}
          <div className="px-4 py-4 border-t border-dark-700/50">
            <div className="card-glass p-4">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center text-white font-bold text-sm">
                  {user?.name?.charAt(0) || "U"}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {user?.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center w-full px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-700/50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4 mr-2" />
                ログアウト
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-72">
        {/* Top bar */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-dark-950/80 border-b border-dark-700/50">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-dark-700/50 text-gray-400 hover:text-white transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Breadcrumb or page title area */}
            <div className="hidden lg:flex items-center">
              <span className="text-xs text-gray-500 uppercase tracking-widest">管理画面</span>
            </div>

            {/* Right side - could add notifications, quick actions etc */}
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-dark-800/50 border border-dark-600/50">
                <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
                <span className="text-xs text-gray-400">システム稼働中</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
