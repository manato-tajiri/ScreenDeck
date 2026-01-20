"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, MapPin, ChevronDown, ChevronRight, QrCode, X, Download } from "lucide-react";
import { api } from "@/lib/api";
import type { Store, Area } from "@/types";
import { formatDateTime } from "@/lib/utils";

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [expandedStores, setExpandedStores] = useState<Set<string>>(new Set());
  const [storeAreas, setStoreAreas] = useState<Record<string, Area[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCodeData, setQRCodeData] = useState<{ url: string; areaName: string } | null>(null);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    loadStores();
  }, []);

  const loadStores = async () => {
    try {
      const data = await api.getStores();
      setStores(data);
    } catch (error) {
      console.error("Failed to load stores", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAreas = async (storeId: string) => {
    try {
      const areas = await api.getAreas(storeId);
      setStoreAreas((prev) => ({ ...prev, [storeId]: areas }));
    } catch (error) {
      console.error("Failed to load areas", error);
    }
  };

  const toggleStore = async (storeId: string) => {
    const newExpanded = new Set(expandedStores);
    if (newExpanded.has(storeId)) {
      newExpanded.delete(storeId);
    } else {
      newExpanded.add(storeId);
      if (!storeAreas[storeId]) {
        await loadAreas(storeId);
      }
    }
    setExpandedStores(newExpanded);
  };

  const handleDeleteStore = async (id: string) => {
    if (!confirm("この店舗を削除しますか？関連するエリアと端末も削除されます。")) {
      return;
    }
    try {
      await api.deleteStore(id);
      await loadStores();
    } catch (error) {
      console.error("Failed to delete store", error);
    }
  };

  const handleDeleteArea = async (id: string) => {
    if (!confirm("このエリアを削除しますか？関連する端末も削除されます。")) {
      return;
    }
    try {
      await api.deleteArea(id);
      if (selectedStoreId) {
        await loadAreas(selectedStoreId);
      }
    } catch (error) {
      console.error("Failed to delete area", error);
    }
  };

  const handleShowQR = async (areaId: string, areaName: string) => {
    try {
      const blob = await api.getAreaQRCode(areaId);
      const url = URL.createObjectURL(blob);
      setQRCodeData({ url, areaName });
      setShowQRModal(true);
    } catch (error) {
      console.error("Failed to load QR code", error);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeData) {
      const a = document.createElement("a");
      a.href = qrCodeData.url;
      a.download = `qr_${qrCodeData.areaName}.png`;
      a.click();
    }
  };

  const handleCloseQRModal = () => {
    if (qrCodeData) {
      URL.revokeObjectURL(qrCodeData.url);
    }
    setQRCodeData(null);
    setShowQRModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-10 w-10" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">店舗管理</h1>
          <p className="text-gray-400 mt-1">店舗とエリアを一元管理</p>
        </div>
        <button
          onClick={() => {
            setEditingStore(null);
            setShowStoreModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          店舗を追加
        </button>
      </div>

      <div className="space-y-4">
        {stores.map((store) => (
          <div key={store.id} className="card card-hover">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-700/30 transition-colors rounded-t-2xl"
              onClick={() => toggleStore(store.id)}
            >
              <div className="flex items-center">
                {expandedStores.has(store.id) ? (
                  <ChevronDown className="h-5 w-5 text-neon-magenta" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <div className="ml-3">
                  <h3 className="font-medium text-white">{store.name}</h3>
                  <p className="text-sm text-gray-500">コード: {store.code}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`badge ${
                    store.is_active
                      ? "badge-success"
                      : "badge-default"
                  }`}
                >
                  {store.is_active ? "有効" : "無効"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingStore(store);
                    setShowStoreModal(true);
                  }}
                  className="icon-btn"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteStore(store.id);
                  }}
                  className="icon-btn icon-btn-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expandedStores.has(store.id) && (
              <div className="border-t border-dark-600 p-4 bg-dark-800/30 rounded-b-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-300 flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-neon-cyan" />
                    エリア一覧
                  </h4>
                  <button
                    onClick={() => {
                      setSelectedStoreId(store.id);
                      setEditingArea(null);
                      setShowAreaModal(true);
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    エリア追加
                  </button>
                </div>

                {storeAreas[store.id]?.length === 0 ? (
                  <p className="text-sm text-gray-500">エリアがありません</p>
                ) : (
                  <div className="space-y-2">
                    {storeAreas[store.id]?.map((area) => (
                      <div
                        key={area.id}
                        className="flex items-center justify-between bg-dark-700/50 p-3 rounded-xl border border-dark-600 hover:border-dark-500 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-white">{area.name}</p>
                          <p className="text-sm text-gray-500">
                            コード: {area.code}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleShowQR(area.id, area.name)}
                            className="icon-btn"
                            title="QRコードを表示"
                          >
                            <QrCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedStoreId(store.id);
                              setEditingArea(area);
                              setShowAreaModal(true);
                            }}
                            className="icon-btn"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArea(area.id)}
                            className="icon-btn icon-btn-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {stores.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-gray-500">店舗がありません</p>
          </div>
        )}
      </div>

      {/* Store Modal */}
      {showStoreModal && (
        <StoreModal
          store={editingStore}
          onClose={() => setShowStoreModal(false)}
          onSave={async () => {
            await loadStores();
            setShowStoreModal(false);
          }}
        />
      )}

      {/* Area Modal */}
      {showAreaModal && selectedStoreId && (
        <AreaModal
          storeId={selectedStoreId}
          area={editingArea}
          onClose={() => setShowAreaModal(false)}
          onSave={async () => {
            await loadAreas(selectedStoreId);
            setShowAreaModal(false);
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCodeData && (
        <div className="modal-backdrop">
          <div className="modal-content w-full max-w-md mx-4">
            <div className="modal-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                QRコード - {qrCodeData.areaName}
              </h2>
              <button
                onClick={handleCloseQRModal}
                className="icon-btn"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="modal-body">
              <div className="flex flex-col items-center">
                <div className="bg-white p-6 rounded-xl">
                  <img
                    src={qrCodeData.url}
                    alt={`QRコード - ${qrCodeData.areaName}`}
                    className="w-64 h-64"
                  />
                </div>
                <p className="mt-4 text-sm text-gray-400 text-center">
                  このQRコードをタブレットで読み取ると、<br />
                  デバイス登録ページが開きます。
                </p>
              </div>
            </div>

            <div className="modal-footer justify-center">
              <button
                onClick={handleDownloadQR}
                className="btn btn-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                ダウンロード
              </button>
              <button
                onClick={handleCloseQRModal}
                className="btn btn-secondary"
              >
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StoreModal({
  store,
  onClose,
  onSave,
}: {
  store: Store | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(store?.name || "");
  const [code, setCode] = useState(store?.code || "");
  const [isActive, setIsActive] = useState(store?.is_active ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (store) {
        await api.updateStore(store.id, { name, code, is_active: isActive });
      } else {
        await api.createStore({ name, code });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || "保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-md mx-4">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            {store ? "店舗を編集" : "店舗を追加"}
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
              <label className="label">店舗名</label>
              <input
                type="text"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">店舗コード</label>
              <input
                type="text"
                required
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </div>

            {store && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 text-primary-600 rounded border-gray-300"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                  有効
                </label>
              </div>
            )}

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
            {isLoading ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AreaModal({
  storeId,
  area,
  onClose,
  onSave,
}: {
  storeId: string;
  area: Area | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(area?.name || "");
  const [code, setCode] = useState(area?.code || "");
  const [isActive, setIsActive] = useState(area?.is_active ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (area) {
        await api.updateArea(area.id, { name, code, is_active: isActive });
      } else {
        await api.createArea(storeId, { name, code });
      }
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || "保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-md mx-4">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            {area ? "エリアを編集" : "エリアを追加"}
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
              <label className="label">エリア名</label>
              <input
                type="text"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 入口、通路A、レジ前"
              />
            </div>

            <div>
              <label className="label">エリアコード</label>
              <input
                type="text"
                required
                className="input"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="例: ENTRANCE, AISLE-A"
              />
            </div>

            {area && (
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="checkbox"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-gray-300">
                  有効
                </label>
              </div>
            )}
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
            {isLoading ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
