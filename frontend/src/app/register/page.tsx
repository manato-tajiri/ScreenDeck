"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QrCode, CheckCircle, Monitor, Sparkles, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import { api } from "@/lib/api";
import {
  getDeviceIdentity,
  saveDeviceIdentity,
  clearDeviceIdentity,
  type DeviceIdentity,
} from "@/lib/storage";
import type { Area, Device } from "@/types";

type ExistingDeviceState = {
  identity: DeviceIdentity;
  serverDevice: Device | null;
  isSameArea: boolean;
};

function RegisterContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const areaId = searchParams.get("area_id");

  const [areaInfo, setAreaInfo] = useState<Area | null>(null);
  const [deviceCode, setDeviceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingArea, setIsLoadingArea] = useState(true);
  const [registeredDevice, setRegisteredDevice] = useState<Device | null>(null);
  const [error, setError] = useState("");

  // State for existing device detection
  const [existingDevice, setExistingDevice] = useState<ExistingDeviceState | null>(null);
  const [isCheckingDevice, setIsCheckingDevice] = useState(true);
  const [isMovingArea, setIsMovingArea] = useState(false);

  useEffect(() => {
    if (areaId) {
      loadAreaInfo(areaId);
      checkExistingDevice(areaId);
    } else {
      setError("エリアIDが指定されていません。QRコードを再度読み取ってください。");
      setIsLoadingArea(false);
      setIsCheckingDevice(false);
    }
  }, [areaId]);

  const loadAreaInfo = async (id: string) => {
    setIsLoadingArea(true);
    try {
      const area = await api.getAreaPublic(id);
      setAreaInfo(area);
    } catch (error) {
      console.error("Failed to load area info", error);
      setError("エリア情報の取得に失敗しました。QRコードが無効か、エリアが非アクティブの可能性があります。");
    } finally {
      setIsLoadingArea(false);
    }
  };

  const checkExistingDevice = async (currentAreaId: string) => {
    setIsCheckingDevice(true);
    try {
      const identity = await getDeviceIdentity();
      if (!identity) {
        setExistingDevice(null);
        return;
      }

      // Verify device still exists on server
      try {
        const serverDevice = await api.getDevicePublic(identity.deviceId);
        const isSameArea = serverDevice.area_id === currentAreaId;
        setExistingDevice({
          identity,
          serverDevice,
          isSameArea,
        });
      } catch (err: any) {
        // Device was deleted from server, clear local identity
        if (err.response?.status === 404) {
          await clearDeviceIdentity();
          setExistingDevice(null);
        }
      }
    } catch (error) {
      console.error("Failed to check existing device", error);
      setExistingDevice(null);
    } finally {
      setIsCheckingDevice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaId) return;

    setError("");
    setIsLoading(true);
    setRegisteredDevice(null);

    try {
      const device = await api.registerDeviceViaQR({
        area_id: areaId,
        device_code: deviceCode || undefined,
      });

      // Save device identity to IndexedDB
      await saveDeviceIdentity({
        deviceId: device.id,
        deviceCode: device.device_code,
        areaId: device.area_id,
        registeredAt: device.registered_at,
      });

      setRegisteredDevice(device);
      setDeviceCode("");
    } catch (err: any) {
      setError(err.response?.data?.detail || "登録に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const goToPlayer = (deviceId?: string) => {
    const id = deviceId || registeredDevice?.id || existingDevice?.serverDevice?.id;
    if (id) {
      router.push(`/player?device_id=${id}`);
    }
  };

  const handleOpenPlayer = () => {
    if (existingDevice?.serverDevice) {
      goToPlayer(existingDevice.serverDevice.id);
    }
  };

  const handleMoveArea = async () => {
    if (!existingDevice?.serverDevice || !areaId) return;

    setIsMovingArea(true);
    setError("");

    try {
      const updatedDevice = await api.updateDeviceAreaViaQR(
        existingDevice.serverDevice.id,
        areaId
      );

      // Update local identity with new area
      await saveDeviceIdentity({
        deviceId: updatedDevice.id,
        deviceCode: updatedDevice.device_code,
        areaId: updatedDevice.area_id,
        registeredAt: updatedDevice.registered_at,
      });

      // Go to player
      goToPlayer(updatedDevice.id);
    } catch (err: any) {
      setError(err.response?.data?.detail || "エリア移動に失敗しました");
    } finally {
      setIsMovingArea(false);
    }
  };

  const handleNewRegistration = async () => {
    // Clear local identity and show registration form
    await clearDeviceIdentity();
    setExistingDevice(null);
  };

  if (isLoadingArea || isCheckingDevice) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="loading-spinner h-10 w-10" />
      </div>
    );
  }

  // Show existing device options modal
  if (existingDevice && existingDevice.serverDevice) {
    return (
      <div className="min-h-screen bg-dark-950 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-neon-magenta/15 rounded-full blur-[128px]" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neon-cyan/15 rounded-full blur-[128px]" />
        </div>

        {/* Header */}
        <header className="relative border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-xl">
          <div className="max-w-lg mx-auto px-4">
            <div className="flex items-center h-16">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-magenta to-neon-cyan flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <h1 className="text-xl font-bold text-white">ScreenDeck</h1>
              </div>
            </div>
          </div>
        </header>

        <main className="relative max-w-lg mx-auto p-4 space-y-6">
          <div className="flex items-center mt-4">
            <AlertCircle className="h-8 w-8 text-neon-gold mr-3" />
            <h2 className="text-2xl font-bold text-white">端末検出</h2>
          </div>

          <div className="card p-6">
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-neon-gold/20 flex items-center justify-center mx-auto mb-4">
                <Monitor className="h-8 w-8 text-neon-gold" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                この端末は既に登録されています
              </h3>
              <div className="bg-dark-700/50 rounded-xl p-4 border border-dark-600">
                <p className="text-sm text-gray-500 mb-1">端末コード</p>
                <p className="text-xl font-mono font-bold text-neon-cyan">
                  {existingDevice.serverDevice.device_code}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Option 1: Open Player (always shown) */}
              <button
                onClick={handleOpenPlayer}
                className="btn btn-primary w-full py-3 flex items-center justify-center"
              >
                <Monitor className="h-5 w-5 mr-2" />
                そのままプレイヤーを開く
                <ArrowRight className="h-5 w-5 ml-2" />
              </button>

              {/* Option 2: Move Area (shown only if different area) */}
              {!existingDevice.isSameArea && areaInfo && (
                <button
                  onClick={handleMoveArea}
                  disabled={isMovingArea}
                  className="btn btn-secondary w-full py-3 flex items-center justify-center"
                >
                  <RefreshCw className={`h-5 w-5 mr-2 ${isMovingArea ? 'animate-spin' : ''}`} />
                  {isMovingArea ? '移動中...' : `「${areaInfo.name}」に移動する`}
                </button>
              )}

              {/* Option 3: New Registration */}
              <button
                onClick={handleNewRegistration}
                className="w-full py-3 text-gray-400 hover:text-white border border-dark-600 hover:border-dark-500 rounded-xl transition-colors flex items-center justify-center"
              >
                新しい端末として登録
              </button>
            </div>

            <div className="mt-6 p-3 bg-dark-700/30 rounded-xl border border-dark-600">
              <p className="text-xs text-gray-500">
                ※ 別の物理端末の場合は「新しい端末として登録」を選択してください
              </p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-neon-magenta/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-neon-cyan/15 rounded-full blur-[128px]" />
      </div>

      {/* Header */}
      <header className="relative border-b border-dark-700/50 bg-dark-900/80 backdrop-blur-xl">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-magenta to-neon-cyan flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white">ScreenDeck</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="relative max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center mt-4">
          <QrCode className="h-8 w-8 text-neon-cyan mr-3" />
          <h2 className="text-2xl font-bold text-white">端末登録</h2>
        </div>

        {registeredDevice ? (
          <div className="card p-6">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-12 w-12 text-neon-green" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                登録完了
              </h3>
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
                onClick={() => goToPlayer()}
                className="btn btn-primary w-full mb-4"
              >
                <Monitor className="h-5 w-5 mr-2" />
                プレイヤー画面を開く
              </button>

              <p className="text-sm text-gray-500">
                このURLをブックマークしておくと便利です
              </p>
            </div>
          </div>
        ) : (
          <div className="card p-6">
            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            {areaInfo && (
              <div className="mb-6 bg-neon-cyan/10 border border-neon-cyan/30 rounded-xl p-4">
                <p className="text-sm text-neon-cyan">登録先エリア</p>
                <p className="text-lg font-semibold text-white">{areaInfo.name}</p>
                <p className="text-sm text-gray-400">コード: {areaInfo.code}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">
                  端末コード（任意）
                </label>
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
                disabled={isLoading || !areaId}
                className="btn btn-primary w-full py-3"
              >
                {isLoading ? "登録中..." : "端末を登録"}
              </button>
            </form>
          </div>
        )}

        <div className="card p-4 border-neon-purple/30 bg-neon-purple/5">
          <h4 className="font-medium text-white mb-2">使い方</h4>
          <ol className="text-sm text-gray-400 space-y-1 list-decimal list-inside">
            <li>端末コードは空欄にすると自動で生成されます</li>
            <li>登録後に「プレイヤー画面を開く」ボタンを押してください</li>
            <li>プレイヤー画面をホーム画面に追加すると便利です</li>
          </ol>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="loading-spinner h-10 w-10" />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
