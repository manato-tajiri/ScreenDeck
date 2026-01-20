"use client";

import { useEffect, useState } from "react";
import { RefreshCw, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import type { Device, Area } from "@/types";
import { useAuthStore } from "@/lib/store";
import { formatDateTime } from "@/lib/utils";

function getStatusBadgeClass(status: string) {
  switch (status) {
    case "online":
      return "badge-success";
    case "offline":
      return "badge-danger";
    default:
      return "badge-default";
  }
}

function getStatusText(status: string) {
  switch (status) {
    case "online":
      return "オンライン";
    case "offline":
      return "オフライン";
    default:
      return "不明";
  }
}

export default function StaffDevicesPage() {
  const { user } = useAuthStore();
  const [devices, setDevices] = useState<Device[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  useEffect(() => {
    if (user?.store_id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user?.store_id) return;

    setIsLoading(true);
    try {
      const [devicesData, areasData] = await Promise.all([
        api.getDevices({ store_id: user.store_id }),
        api.getAreas(user.store_id),
      ]);
      setDevices(devicesData);
      setAreas(areasData);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAreaName = (areaId: string) => {
    return areas.find((a) => a.id === areaId)?.name || "-";
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">端末一覧</h1>
          <p className="text-gray-400 mt-1">担当店舗の端末を管理</p>
        </div>
        <button onClick={loadData} className="btn btn-secondary">
          <RefreshCw className="h-4 w-4 mr-2" />
          更新
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="loading-spinner h-8 w-8" />
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>端末コード</th>
                  <th>名前</th>
                  <th>エリア</th>
                  <th>ステータス</th>
                  <th>最終同期</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="font-mono text-neon-cyan">{device.device_code}</td>
                    <td>{device.name || "-"}</td>
                    <td className="text-gray-400">{getAreaName(device.area_id)}</td>
                    <td>
                      <span className={`badge ${getStatusBadgeClass(device.status)}`}>
                        {getStatusText(device.status)}
                      </span>
                    </td>
                    <td className="text-gray-400">
                      {device.last_sync_at
                        ? formatDateTime(device.last_sync_at)
                        : "-"}
                    </td>
                    <td>
                      <button
                        onClick={() => {
                          setSelectedDevice(device);
                          setShowMoveModal(true);
                        }}
                        className="btn btn-secondary text-sm"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        移動
                      </button>
                    </td>
                  </tr>
                ))}
                {devices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500 py-8">
                      端末がありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Move Device Modal */}
      {showMoveModal && selectedDevice && (
        <MoveDeviceModal
          device={selectedDevice}
          areas={areas}
          onClose={() => setShowMoveModal(false)}
          onSave={async () => {
            await loadData();
            setShowMoveModal(false);
          }}
        />
      )}
    </div>
  );
}

function MoveDeviceModal({
  device,
  areas,
  onClose,
  onSave,
}: {
  device: Device;
  areas: Area[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [selectedArea, setSelectedArea] = useState(device.area_id);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.updateDeviceArea(device.id, selectedArea);
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || "移動に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-md mx-4">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            端末をエリア移動
          </h2>
        </div>
        <div className="modal-body">
          <p className="text-sm text-gray-400 mb-4">
            端末: <span className="font-mono text-neon-cyan">{device.device_code}</span>
          </p>

          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">移動先エリア</label>
              <select
                required
                className="input"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
              >
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
          </form>
        </div>
        <div className="modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="btn btn-primary"
          >
            {isLoading ? "移動中..." : "移動"}
          </button>
        </div>
      </div>
    </div>
  );
}
