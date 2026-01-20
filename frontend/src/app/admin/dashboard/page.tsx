"use client";

import { useEffect, useState } from "react";
import {
  Store,
  MapPin,
  Monitor,
  Megaphone,
  Play,
  TrendingUp,
  ArrowRight,
  Zap,
  Activity,
} from "lucide-react";
import { api } from "@/lib/api";
import type { ReportSummary } from "@/types";
import { formatNumber } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const data = await api.getReportSummary();
      setSummary(data);
    } catch (error) {
      console.error("Failed to load summary", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-10 w-10" />
      </div>
    );
  }

  const stats = [
    {
      name: "総店舗数",
      value: summary?.inventory.total_stores || 0,
      icon: Store,
      gradient: "from-neon-magenta to-pink-600",
      glowColor: "neon-magenta",
      bgGlow: "rgba(255, 45, 146, 0.15)",
    },
    {
      name: "総エリア数",
      value: summary?.inventory.total_areas || 0,
      icon: MapPin,
      gradient: "from-neon-cyan to-blue-500",
      glowColor: "neon-cyan",
      bgGlow: "rgba(0, 245, 255, 0.15)",
    },
    {
      name: "総端末数",
      value: summary?.inventory.total_devices || 0,
      icon: Monitor,
      gradient: "from-neon-purple to-violet-600",
      glowColor: "neon-purple",
      bgGlow: "rgba(191, 90, 242, 0.15)",
    },
    {
      name: "キャンペーン数",
      value: summary?.inventory.total_campaigns || 0,
      icon: Megaphone,
      gradient: "from-neon-gold to-amber-500",
      glowColor: "neon-gold",
      bgGlow: "rgba(255, 215, 0, 0.15)",
    },
  ];

  const playbackStats = [
    {
      name: "総再生回数（30日）",
      value: summary?.playback.total_plays || 0,
      icon: Play,
      color: "text-neon-magenta",
    },
    {
      name: "アクティブ端末",
      value: summary?.playback.active_devices || 0,
      icon: Activity,
      color: "text-neon-cyan",
    },
    {
      name: "配信中キャンペーン",
      value: summary?.playback.active_campaigns || 0,
      icon: Zap,
      color: "text-neon-gold",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">ダッシュボード</h1>
          <p className="text-gray-400 mt-1">システム全体の概要を確認</p>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-500">
          <TrendingUp className="h-4 w-4 text-neon-green" />
          <span>リアルタイム更新</span>
        </div>
      </div>

      {/* Inventory Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        {stats.map((stat, index) => (
          <div
            key={stat.name}
            className="group relative card card-hover p-6 overflow-hidden"
            style={{
              animationDelay: `${index * 100}ms`,
            }}
          >
            {/* Background glow */}
            <div
              className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl"
              style={{ backgroundColor: stat.bgGlow }}
            />

            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-2">{stat.name}</p>
                <p className="text-4xl font-bold text-white tracking-tight font-mono">
                  {formatNumber(stat.value)}
                </p>
              </div>
              <div
                className={`p-3 rounded-xl bg-gradient-to-br ${stat.gradient} shadow-lg`}
                style={{
                  boxShadow: `0 8px 24px ${stat.bgGlow}`,
                }}
              >
                <stat.icon className="h-6 w-6 text-white" />
              </div>
            </div>

            {/* Decorative line */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
          </div>
        ))}
      </div>

      {/* Playback Stats */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-white">再生状況</h2>
            <p className="text-sm text-gray-500">過去30日間のパフォーマンス</p>
          </div>
          <Link
            href="/admin/reports"
            className="flex items-center text-sm text-neon-magenta hover:text-neon-magenta/80 transition-colors"
          >
            詳細レポート
            <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {playbackStats.map((stat, index) => (
            <div
              key={stat.name}
              className="group relative p-5 rounded-xl bg-dark-700/30 border border-dark-600/50 hover:border-dark-500/50 transition-all duration-300"
            >
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-lg bg-dark-600/50">
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-400">{stat.name}</p>
                  <p className="text-2xl font-bold text-white font-mono">
                    {formatNumber(stat.value)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-white mb-6">クイックアクション</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/stores"
            className="group flex items-center p-5 rounded-xl bg-dark-700/30 border border-dark-600/50 hover:border-neon-magenta/30 hover:bg-dark-700/50 transition-all duration-300"
          >
            <div className="p-3 rounded-lg bg-neon-magenta/10 group-hover:bg-neon-magenta/20 transition-colors">
              <Store className="h-6 w-6 text-neon-magenta" />
            </div>
            <div className="ml-4 flex-1">
              <span className="text-white font-medium">新規店舗を追加</span>
              <p className="text-sm text-gray-500">店舗とエリアを管理</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-neon-magenta group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/campaigns"
            className="group flex items-center p-5 rounded-xl bg-dark-700/30 border border-dark-600/50 hover:border-neon-cyan/30 hover:bg-dark-700/50 transition-all duration-300"
          >
            <div className="p-3 rounded-lg bg-neon-cyan/10 group-hover:bg-neon-cyan/20 transition-colors">
              <Megaphone className="h-6 w-6 text-neon-cyan" />
            </div>
            <div className="ml-4 flex-1">
              <span className="text-white font-medium">キャンペーンを作成</span>
              <p className="text-sm text-gray-500">広告コンテンツを配信</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-neon-cyan group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/admin/reports"
            className="group flex items-center p-5 rounded-xl bg-dark-700/30 border border-dark-600/50 hover:border-neon-gold/30 hover:bg-dark-700/50 transition-all duration-300"
          >
            <div className="p-3 rounded-lg bg-neon-gold/10 group-hover:bg-neon-gold/20 transition-colors">
              <Play className="h-6 w-6 text-neon-gold" />
            </div>
            <div className="ml-4 flex-1">
              <span className="text-white font-medium">レポートを確認</span>
              <p className="text-sm text-gray-500">分析と統計を表示</p>
            </div>
            <ArrowRight className="h-5 w-5 text-gray-600 group-hover:text-neon-gold group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="flex items-center justify-center space-x-6 text-xs text-gray-600">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
          <span>API 接続中</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
          <span>データ同期完了</span>
        </div>
      </div>
    </div>
  );
}
