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
    { key: "campaigns" as ReportType, label: "キャンペーン別", icon: Megaphone },
    { key: "stores" as ReportType, label: "店舗別", icon: Store },
    { key: "devices" as ReportType, label: "端末別", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">レポート種別</label>
            <div className="flex space-x-2">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setReportType(tab.key)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm ${
                    reportType === tab.key
                      ? "bg-primary-100 text-primary-700"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-1" />
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
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
                <tbody className="divide-y divide-gray-200">
                  {campaignReports.map((report) => (
                    <tr key={report.campaign_id}>
                      <td>{report.campaign_name}</td>
                      <td className="text-right">
                        {formatNumber(report.play_count)}
                      </td>
                      <td className="text-right">
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
                <tbody className="divide-y divide-gray-200">
                  {storeReports.map((report) => (
                    <tr key={report.store_id}>
                      <td>{report.store_name}</td>
                      <td className="text-right">
                        {formatNumber(report.play_count)}
                      </td>
                      <td className="text-right">
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
                <tbody className="divide-y divide-gray-200">
                  {deviceReports.map((report) => (
                    <tr key={report.device_id}>
                      <td className="font-mono">{report.device_code}</td>
                      <td>{report.device_name || "-"}</td>
                      <td>{report.store_name}</td>
                      <td>{report.area_name}</td>
                      <td className="text-right">
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
          <div className="flex items-center text-sm text-gray-500">
            <BarChart3 className="h-4 w-4 mr-2" />
            <span>
              期間: {startDate} 〜 {endDate}
            </span>
            <span className="mx-2">|</span>
            <span>
              総再生回数:{" "}
              {formatNumber(
                reportType === "campaigns"
                  ? campaignReports.reduce((sum, r) => sum + r.play_count, 0)
                  : reportType === "stores"
                  ? storeReports.reduce((sum, r) => sum + r.play_count, 0)
                  : deviceReports.reduce((sum, r) => sum + r.play_count, 0)
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
