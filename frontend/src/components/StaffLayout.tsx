"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Monitor, QrCode, LogOut, Sparkles } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "端末管理", href: "/staff/devices", icon: Monitor },
  { name: "端末登録", href: "/staff/register", icon: QrCode },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearUser } = useAuthStore();

  const handleLogout = async () => {
    await api.logout();
    clearUser();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* Background mesh gradient */}
      <div className="fixed inset-0 bg-mesh-pattern pointer-events-none" />

      {/* Header */}
      <header className="relative border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href="/staff/devices" className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-magenta to-neon-cyan flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">ScreenDeck</h1>
              </Link>
              <nav className="ml-8 flex space-x-2">
                {navigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        "flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-neon-magenta/20 text-neon-magenta border border-neon-magenta/30"
                          : "text-gray-400 hover:text-white hover:bg-dark-700/50"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4 mr-2",
                        isActive ? "text-neon-magenta" : ""
                      )} />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-400">{user?.name}</span>
              <button
                onClick={handleLogout}
                className="icon-btn"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
