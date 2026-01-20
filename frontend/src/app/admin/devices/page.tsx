"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import type { Device, Store, Area } from "@/types";
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

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedStore, setSelectedStore] = useState<string>("");
  const [selectedArea, setSelectedArea] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadStores();
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      loadAreas(selectedStore);
    } else {
      setAreas([]);
      setSelectedArea("");
    }
  }, [selectedStore]);

  useEffect(() => {
    loadDevices();
  }, [selectedStore, selectedArea]);

  const loadStores = async () => {
    try {
      const data = await api.getStores();
      setStores(data);
    } catch (error) {
      console.error("Failed to load stores", error);
    }
  };

  const loadAreas = async (storeId: string) => {
    try {
      const data = await api.getAreas(storeId);
      setAreas(data);
    } catch (error) {
      console.error("Failed to load areas", error);
    }
  };

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const params: { store_id?: string; area_id?: string } = {};
      if (selectedStore) params.store_id = selectedStore;
      if (selectedArea) params.area_id = selectedArea;
      const data = await api.getDevices(params);
      setDevices(data);
    } catch (error) {
      console.error("Failed to load devices", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteDevice = async (id: string) => {
    if (!confirm("この端末を削除しますか？")) {
      return;
    }
    try {
      await api.deleteDevice(id);
      await loadDevices();
    } catch (error) {
      console.error("Failed to delete device", error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">端末管理</h1>
          <p className="text-gray-400 mt-1">デバイスの状態を監視・管理</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus className="h-4 w-4 mr-2" />
          端末を登録
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">店舗</label>
            <select
              className="input"
              value={selectedStore}
              onChange={(e) => setSelectedStore(e.target.value)}
            >
              <option value="">すべての店舗</option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">エリア</label>
            <select
              className="input"
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              disabled={!selectedStore}
            >
              <option value="">すべてのエリア</option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadDevices}
              className="btn btn-secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              更新
            </button>
          </div>
        </div>
      </div>

      {/* Device Table */}
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
                  <th>ステータス</th>
                  <th>最終同期</th>
                  <th>登録日時</th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-600">
                {devices.map((device) => (
                  <tr key={device.id}>
                    <td className="font-mono text-neon-cyan">{device.device_code}</td>
                    <td>{device.name || "-"}</td>
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
                    <td className="text-gray-400">{formatDateTime(device.registered_at)}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteDevice(device.id)}
                        className="icon-btn icon-btn-danger"
                      >
                        <Trash2 className="h-4 w-4" />
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

      {/* Register Modal */}
      {showModal && (
        <RegisterDeviceModal
          stores={stores}
          onClose={() => setShowModal(false)}
          onSave={async () => {
            await loadDevices();
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}

function RegisterDeviceModal({
  stores,
  onClose,
  onSave,
}: {
  stores: Store[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [deviceCode, setDeviceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedStore) {
      loadAreas(selectedStore);
    } else {
      setAreas([]);
    }
  }, [selectedStore]);

  const loadAreas = async (storeId: string) => {
    try {
      const data = await api.getAreas(storeId);
      setAreas(data);
    } catch (error) {
      console.error("Failed to load areas", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      await api.registerDevice({
        area_id: selectedArea,
        device_code: deviceCode || undefined,
      });
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || "登録に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-md mx-4">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            端末を登録
          </h2>
        </div>
        <div className="modal-body">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">店舗</label>
              <select
                required
                className="input"
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
              >
                <option value="">選択してください</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">エリア</label>
              <select
                required
                className="input"
                value={selectedArea}
                onChange={(e) => setSelectedArea(e.target.value)}
                disabled={!selectedStore}
              >
                <option value="">選択してください</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">端末コード（任意）</label>
              <input
                type="text"
                className="input"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="空欄の場合は自動生成"
              />
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
            disabled={isLoading || !selectedArea}
            className="btn btn-primary"
          >
            {isLoading ? "登録中..." : "登録"}
          </button>
        </div>
      </div>
    </div>
  );
}
