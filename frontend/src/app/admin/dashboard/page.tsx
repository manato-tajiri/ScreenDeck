"use client";

import { useEffect, useState } from "react";
import { Store, MapPin, Monitor, Megaphone, Play } from "lucide-react";
import { api } from "@/lib/api";
import type { ReportSummary } from "@/types";
import { formatNumber } from "@/lib/utils";

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const stats = [
    {
      name: "総店舗数",
      value: summary?.inventory.total_stores || 0,
      icon: Store,
      color: "bg-blue-500",
    },
    {
      name: "総エリア数",
      value: summary?.inventory.total_areas || 0,
      icon: MapPin,
      color: "bg-green-500",
    },
    {
      name: "総端末数",
      value: summary?.inventory.total_devices || 0,
      icon: Monitor,
      color: "bg-purple-500",
    },
    {
      name: "キャンペーン数",
      value: summary?.inventory.total_campaigns || 0,
      icon: Megaphone,
      color: "bg-orange-500",
    },
  ];

  const playbackStats = [
    {
      name: "総再生回数（30日）",
      value: summary?.playback.total_plays || 0,
      icon: Play,
    },
    {
      name: "アクティブ端末",
      value: summary?.playback.active_devices || 0,
      icon: Monitor,
    },
    {
      name: "配信中キャンペーン",
      value: summary?.playback.active_campaigns || 0,
      icon: Megaphone,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatNumber(stat.value)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Playback Stats */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          再生状況（過去30日間）
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {playbackStats.map((stat) => (
            <div
              key={stat.name}
              className="flex items-center p-4 bg-gray-50 rounded-lg"
            >
              <stat.icon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-xl font-bold text-gray-900">
                  {formatNumber(stat.value)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          クイックアクション
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a
            href="/admin/stores"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Store className="h-6 w-6 text-primary-600" />
            <span className="ml-3 text-gray-900">新規店舗を追加</span>
          </a>
          <a
            href="/admin/campaigns"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Megaphone className="h-6 w-6 text-primary-600" />
            <span className="ml-3 text-gray-900">キャンペーンを作成</span>
          </a>
          <a
            href="/admin/reports"
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Play className="h-6 w-6 text-primary-600" />
            <span className="ml-3 text-gray-900">レポートを確認</span>
          </a>
        </div>
      </div>
    </div>
  );
}
