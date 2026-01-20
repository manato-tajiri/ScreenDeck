"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { QrCode, CheckCircle, Monitor } from "lucide-react";
import { api } from "@/lib/api";
import type { Area, Device } from "@/types";

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

  useEffect(() => {
    if (areaId) {
      loadAreaInfo(areaId);
    } else {
      setError("エリアIDが指定されていません。QRコードを再度読み取ってください。");
      setIsLoadingArea(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-lg mx-auto px-4">
          <div className="flex items-center h-16">
            <h1 className="text-xl font-bold text-blue-600">ScreenDeck</h1>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center">
          <QrCode className="h-8 w-8 text-blue-600 mr-3" />
          <h2 className="text-2xl font-bold text-gray-900">端末登録</h2>
        </div>

        {registeredDevice ? (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                登録完了
              </h3>
              <p className="text-gray-600 mb-4">
                端末が正常に登録されました
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-gray-500 mb-1">端末コード</p>
                <p className="text-2xl font-mono font-bold text-blue-600">
                  {registeredDevice.device_code}
                </p>
              </div>

              <button
                onClick={goToPlayer}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors mb-3 flex items-center justify-center"
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
          <div className="bg-white rounded-lg shadow p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {areaInfo && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-600">登録先エリア</p>
                <p className="text-lg font-semibold text-blue-900">{areaInfo.name}</p>
                <p className="text-sm text-blue-700">コード: {areaInfo.code}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  端末コード（任意）
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={deviceCode}
                  onChange={(e) => setDeviceCode(e.target.value)}
                  placeholder="空欄の場合は自動生成"
                />
                <p className="text-xs text-gray-500 mt-1">
                  任意の識別コードを入力できます（例: TABLET-001）
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading || !areaId}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "登録中..." : "端末を登録"}
              </button>
            </form>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">使い方</h4>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
