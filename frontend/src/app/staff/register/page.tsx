"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QrCode, CheckCircle, Monitor } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import type { Area, Device } from "@/types";

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const areaId = searchParams.get("area_id");
  const { user, isAuthenticated } = useAuthStore();

  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedArea, setSelectedArea] = useState(areaId || "");
  const [areaInfo, setAreaInfo] = useState<Area | null>(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingArea, setIsLoadingArea] = useState(false);
  const [registeredDevice, setRegisteredDevice] = useState<Device | null>(null);
  const [error, setError] = useState("");

  // QR code flow - load area info without authentication
  useEffect(() => {
    if (areaId) {
      loadAreaInfo(areaId);
    }
  }, [areaId]);

  // Authenticated flow - load areas list
  useEffect(() => {
    if (isAuthenticated && user?.store_id && !areaId) {
      loadAreas();
    }
  }, [isAuthenticated, user, areaId]);

  const loadAreaInfo = async (id: string) => {
    setIsLoadingArea(true);
    try {
      const area = await api.getAreaPublic(id);
      setAreaInfo(area);
      setSelectedArea(id);
    } catch (error) {
      console.error("Failed to load area info", error);
      setError("エリア情報の取得に失敗しました。QRコードが無効か、エリアが非アクティブの可能性があります。");
    } finally {
      setIsLoadingArea(false);
    }
  };

  const loadAreas = async () => {
    if (!user?.store_id) return;
    try {
      const data = await api.getAreas(user.store_id);
      setAreas(data);
    } catch (error) {
      console.error("Failed to load areas", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    setRegisteredDevice(null);

    try {
      let device: Device;

      if (areaId) {
        // QR code flow - use public registration
        device = await api.registerDeviceViaQR({
          area_id: selectedArea,
          device_code: deviceCode || undefined,
        });
      } else {
        // Authenticated flow
        device = await api.registerDevice({
          area_id: selectedArea,
          device_code: deviceCode || undefined,
        });
      }

      setRegisteredDevice(device);
      setDeviceCode("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "登録に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const goToPlayer = () => {
    if (registeredDevice) {
      router.push(`/player?device_id=${registeredDevice.id}`);
    }
  };

  if (isLoadingArea) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-10 w-10" />
      </div>
    );
  }

  // Show different UI based on whether we're in QR mode or authenticated mode
  const isQRMode = !!areaId;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="flex items-center">
        <QrCode className="h-8 w-8 text-neon-cyan mr-3" />
        <h1 className="text-2xl font-bold text-white">端末登録</h1>
      </div>

      {registeredDevice ? (
        <div className="card p-6">
          <div className="text-center">
            <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-12 w-12 text-neon-green" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">
              登録完了
            </h2>
            <p className="text-gray-400 mb-4">
              端末が正常に登録されました
            </p>
            <div className="bg-dark-700/50 rounded-xl p-4 mb-6 border border-dark-600">
              <p className="text-sm text-gray-500 mb-1">端末コード</p>
              <p className="text-2xl font-mono font-bold text-neon-cyan">
                {registeredDevice.device_code}
              </p>
            </div>

            <button
              onClick={goToPlayer}
              className="btn btn-primary w-full mb-4"
            >
              <Monitor className="h-4 w-4 mr-2" />
              プレイヤー画面を開く
            </button>

            <p className="text-sm text-gray-500 mb-4">
              または以下のURLをブックマーク:
              <br />
              <code className="bg-dark-700 px-2 py-1 rounded text-xs text-neon-cyan block mt-2 break-all">
                {typeof window !== "undefined" ? window.location.origin : ""}/player?device_id={registeredDevice.id}
              </code>
            </p>
            <button
              onClick={() => setRegisteredDevice(null)}
              className="btn btn-secondary"
            >
              別の端末を登録
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-6">
          {error && (
            <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          {isQRMode && areaInfo && (
            <div className="mb-6 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl p-4">
              <p className="text-sm text-neon-cyan">登録先エリア</p>
              <p className="text-lg font-semibold text-white">{areaInfo.name}</p>
              <p className="text-sm text-gray-400">コード: {areaInfo.code}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isQRMode && (
              <div>
                <label className="label">エリア</label>
                <select
                  required
                  className="input"
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="label">端末コード（任意）</label>
              <input
                type="text"
                className="input"
                value={deviceCode}
                onChange={(e) => setDeviceCode(e.target.value)}
                placeholder="空欄の場合は自動生成"
              />
              <p className="text-xs text-gray-500 mt-2">
                任意の識別コードを入力できます（例: TABLET-001）
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || !selectedArea}
              className="btn btn-primary w-full"
            >
              {isLoading ? "登録中..." : "端末を登録"}
            </button>
          </form>
        </div>
      )}

      <div className="card p-4 border-neon-purple/30 bg-neon-purple/5">
        <h3 className="font-medium text-white mb-2">使い方</h3>
        <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
          <li>エリアのQRコードをスキャンすると自動でエリアが選択されます</li>
          <li>端末コードは空欄にすると自動で生成されます</li>
          <li>登録後に「プレイヤー画面を開く」ボタンを押してください</li>
        </ol>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="loading-spinner h-10 w-10" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
