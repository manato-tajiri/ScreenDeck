"use client";

import { useEffect, useState } from "react";
import { BarChart3, Store, Monitor, Megaphone } from "lucide-react";
import { api } from "@/lib/api";
import type { CampaignReport, StoreReport, DeviceReport } from "@/types";
import { formatNumber } from "@/lib/utils";

type ReportType = "campaigns" | "stores" | "devices";

export default function ReportsPage() {
  const [reportType, setReportType] = useState<ReportType>("campaigns");
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });
  const [campaignReports, setCampaignReports] = useState<CampaignReport[]>([]);
  const [storeReports, setStoreReports] = useState<StoreReport[]>([]);
  const [deviceReports, setDeviceReports] = useState<DeviceReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, [reportType, startDate, endDate]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const params = { start_date: startDate, end_date: endDate };

      switch (reportType) {
        case "campaigns":
          const campaigns = await api.getCampaignReports(params);
          setCampaignReports(campaigns);
          break;
        case "stores":
          const stores = await api.getStoreReports(params);
          setStoreReports(stores);
          break;
        case "devices":
          const devices = await api.getDeviceReports(params);
          setDeviceReports(devices);
          break;
      }
    } catch (error) {
      console.error("Failed to load reports", error);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { key: "campaigns" as ReportType, label: "キャンペーン別", icon: Megaphone, color: "neon-magenta" },
    { key: "stores" as ReportType, label: "店舗別", icon: Store, color: "neon-cyan" },
    { key: "devices" as ReportType, label: "端末別", icon: Monitor, color: "neon-gold" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">レポート</h1>
          <p className="text-gray-400 mt-1">再生状況の分析と統計</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2">
            <label className="label">レポート種別</label>
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setReportType(tab.key)}
                  className={`flex items-center px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    reportType === tab.key
                      ? `bg-${tab.color}/20 text-${tab.color} border border-${tab.color}/30`
                      : "bg-dark-700/50 text-gray-400 border border-dark-600 hover:bg-dark-600 hover:text-gray-200"
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">開始日</label>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label">終了日</label>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Report Table */}
      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="loading-spinner h-8 w-8" />
          </div>
        ) : (
          <div className="table-container">
            {reportType === "campaigns" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>キャンペーン名</th>
                    <th className="text-right">再生回数</th>
                    <th className="text-right">ユニーク端末数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-600">
                  {campaignReports.map((report) => (
                    <tr key={report.campaign_id}>
                      <td className="text-white">{report.campaign_name}</td>
                      <td className="text-right font-mono text-neon-magenta">
                        {formatNumber(report.play_count)}
                      </td>
                      <td className="text-right font-mono text-gray-400">
                        {formatNumber(report.unique_devices)}
                      </td>
                    </tr>
                  ))}
                  {campaignReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-500 py-8">
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {reportType === "stores" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>店舗名</th>
                    <th className="text-right">再生回数</th>
                    <th className="text-right">アクティブ端末数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-600">
                  {storeReports.map((report) => (
                    <tr key={report.store_id}>
                      <td className="text-white">{report.store_name}</td>
                      <td className="text-right font-mono text-neon-cyan">
                        {formatNumber(report.play_count)}
                      </td>
                      <td className="text-right font-mono text-gray-400">
                        {formatNumber(report.device_count)}
                      </td>
                    </tr>
                  ))}
                  {storeReports.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-gray-500 py-8">
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

            {reportType === "devices" && (
              <table className="table">
                <thead>
                  <tr>
                    <th>端末コード</th>
                    <th>端末名</th>
                    <th>店舗</th>
                    <th>エリア</th>
                    <th className="text-right">再生回数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-600">
                  {deviceReports.map((report) => (
                    <tr key={report.device_id}>
                      <td className="font-mono text-neon-cyan">{report.device_code}</td>
                      <td className="text-white">{report.device_name || "-"}</td>
                      <td className="text-gray-400">{report.store_name}</td>
                      <td className="text-gray-400">{report.area_name}</td>
                      <td className="text-right font-mono text-neon-gold">
                        {formatNumber(report.play_count)}
                      </td>
                    </tr>
                  ))}
                  {deviceReports.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-gray-500 py-8">
                        データがありません
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Summary */}
      {!isLoading && (
        <div className="card p-4">
          <div className="flex items-center text-sm text-gray-400">
            <BarChart3 className="h-4 w-4 mr-2 text-neon-magenta" />
            <span>
              期間: {startDate} 〜 {endDate}
            </span>
            <span className="mx-3 text-dark-600">|</span>
            <span>
              総再生回数:{" "}
              <span className="font-mono text-white">
                {formatNumber(
                  reportType === "campaigns"
                    ? campaignReports.reduce((sum, r) => sum + r.play_count, 0)
                    : reportType === "stores"
                    ? storeReports.reduce((sum, r) => sum + r.play_count, 0)
                    : deviceReports.reduce((sum, r) => sum + r.play_count, 0)
                )}
              </span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
