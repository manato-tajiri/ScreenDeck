"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Image,
  Video,
  Upload,
  MapPin,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import type { Campaign, Media, Store, Area } from "@/types";
import { formatDate, formatFileSize } from "@/lib/utils";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [campaignMedia, setCampaignMedia] = useState<Record<string, Media[]>>({});

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await api.getCampaigns();
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to load campaigns", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMedia = async (campaignId: string) => {
    try {
      const media = await api.getCampaignMedia(campaignId);
      setCampaignMedia((prev) => ({ ...prev, [campaignId]: media }));
    } catch (error) {
      console.error("Failed to load media", error);
    }
  };

  const toggleCampaign = async (campaignId: string) => {
    const newExpanded = new Set(expandedCampaigns);
    if (newExpanded.has(campaignId)) {
      newExpanded.delete(campaignId);
    } else {
      newExpanded.add(campaignId);
      if (!campaignMedia[campaignId]) {
        await loadMedia(campaignId);
      }
    }
    setExpandedCampaigns(newExpanded);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm("このキャンペーンを削除しますか？")) {
      return;
    }
    try {
      await api.deleteCampaign(id);
      await loadCampaigns();
    } catch (error) {
      console.error("Failed to delete campaign", error);
    }
  };

  const handleDeleteMedia = async (mediaId: string, campaignId: string) => {
    if (!confirm("このメディアを削除しますか？")) {
      return;
    }
    try {
      await api.deleteMedia(mediaId);
      await loadMedia(campaignId);
    } catch (error) {
      console.error("Failed to delete media", error);
    }
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
          <h1 className="text-3xl font-bold text-white">キャンペーン管理</h1>
          <p className="text-gray-400 mt-1">広告コンテンツの配信を管理</p>
        </div>
        <button
          onClick={() => {
            setEditingCampaign(null);
            setShowCampaignModal(true);
          }}
          className="btn btn-primary"
        >
          <Plus className="h-4 w-4 mr-2" />
          キャンペーンを作成
        </button>
      </div>

      <div className="space-y-4">
        {campaigns.map((campaign) => (
          <div key={campaign.id} className="card card-hover">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-700/30 transition-colors rounded-t-2xl"
              onClick={() => toggleCampaign(campaign.id)}
            >
              <div className="flex items-center">
                {expandedCampaigns.has(campaign.id) ? (
                  <ChevronDown className="h-5 w-5 text-neon-magenta" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
                <div className="ml-3">
                  <h3 className="font-medium text-white">{campaign.name}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(campaign.start_date)} 〜 {formatDate(campaign.end_date)}
                    {" | "}重み: {campaign.weight}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span
                  className={`badge ${
                    campaign.is_active
                      ? "badge-success"
                      : "badge-default"
                  }`}
                >
                  {campaign.is_active ? "有効" : "無効"}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCampaign(campaign);
                    setShowAreaModal(true);
                  }}
                  className="icon-btn"
                  title="配信エリア設定"
                >
                  <MapPin className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCampaign(campaign);
                    setShowCampaignModal(true);
                  }}
                  className="icon-btn"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCampaign(campaign.id);
                  }}
                  className="icon-btn icon-btn-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {expandedCampaigns.has(campaign.id) && (
              <div className="border-t border-dark-600 p-4 bg-dark-800/30 rounded-b-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-medium text-gray-300">メディア一覧</h4>
                  <button
                    onClick={() => {
                      setSelectedCampaign(campaign);
                      setShowMediaModal(true);
                    }}
                    className="btn btn-secondary text-sm"
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    アップロード
                  </button>
                </div>

                {campaignMedia[campaign.id]?.length === 0 ? (
                  <p className="text-sm text-gray-500">メディアがありません</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {campaignMedia[campaign.id]?.map((media) => (
                      <div
                        key={media.id}
                        className="bg-dark-700/50 rounded-xl border border-dark-600 overflow-hidden hover:border-dark-500 transition-colors"
                      >
                        <div className="aspect-video bg-dark-800 flex items-center justify-center">
                          {media.type === "image" ? (
                            media.gcs_url ? (
                              <img
                                src={media.gcs_url}
                                alt={media.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Image className="h-12 w-12 text-gray-600" />
                            )
                          ) : (
                            <Video className="h-12 w-12 text-gray-600" />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-medium text-white truncate">
                            {media.filename}
                          </p>
                          <p className="text-xs text-gray-500">
                            {media.duration_seconds}秒 |{" "}
                            {media.file_size
                              ? formatFileSize(media.file_size)
                              : "-"}
                          </p>
                          <div className="mt-2 flex justify-end">
                            <button
                              onClick={() =>
                                handleDeleteMedia(media.id, campaign.id)
                              }
                              className="text-red-400 hover:text-red-300 text-sm transition-colors"
                            >
                              削除
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {campaigns.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-gray-500">キャンペーンがありません</p>
          </div>
        )}
      </div>

      {/* Campaign Modal */}
      {showCampaignModal && (
        <CampaignModal
          campaign={editingCampaign}
          onClose={() => setShowCampaignModal(false)}
          onSave={async () => {
            await loadCampaigns();
            setShowCampaignModal(false);
          }}
        />
      )}

      {/* Media Upload Modal */}
      {showMediaModal && selectedCampaign && (
        <MediaUploadModal
          campaign={selectedCampaign}
          onClose={() => setShowMediaModal(false)}
          onSave={async () => {
            await loadMedia(selectedCampaign.id);
            setShowMediaModal(false);
          }}
        />
      )}

      {/* Area Assignment Modal */}
      {showAreaModal && selectedCampaign && (
        <AreaAssignmentModal
          campaign={selectedCampaign}
          onClose={() => setShowAreaModal(false)}
          onSave={() => setShowAreaModal(false)}
        />
      )}
    </div>
  );
}

function CampaignModal({
  campaign,
  onClose,
  onSave,
}: {
  campaign: Campaign | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [name, setName] = useState(campaign?.name || "");
  const [description, setDescription] = useState(campaign?.description || "");
  const [weight, setWeight] = useState(campaign?.weight || 1);
  const [startDate, setStartDate] = useState(campaign?.start_date || "");
  const [endDate, setEndDate] = useState(campaign?.end_date || "");
  const [isActive, setIsActive] = useState(campaign?.is_active ?? true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (campaign) {
        await api.updateCampaign(campaign.id, {
          name,
          description,
          weight,
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
        });
      } else {
        await api.createCampaign({
          name,
          description,
          weight,
          start_date: startDate,
          end_date: endDate,
        });
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
      <div className="modal-content w-full max-w-lg mx-4">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            {campaign ? "キャンペーンを編集" : "キャンペーンを作成"}
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
              <label className="label">キャンペーン名</label>
              <input
                type="text"
                required
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="label">説明</label>
              <textarea
                className="input"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">開始日</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="label">終了日</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="label">配信重み（1〜100）</label>
              <input
                type="number"
                required
                min={1}
                max={100}
                className="input"
                value={weight}
                onChange={(e) => setWeight(parseInt(e.target.value) || 1)}
              />
              <p className="text-xs text-gray-500 mt-1">
                数値が大きいほど配信頻度が高くなります
              </p>
            </div>

            {campaign && (
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

function MediaUploadModal({
  campaign,
  onClose,
  onSave,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSave: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setError("");
    setIsLoading(true);

    try {
      await api.uploadMedia(campaign.id, file, duration);
      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || "アップロードに失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-md mx-4">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            メディアをアップロード
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
              <label className="label">ファイル</label>
              <input
                type="file"
                required
                accept="image/*,video/*"
                className="input file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-dark-600 file:text-gray-300 hover:file:bg-dark-500"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500 mt-2">
                画像: JPG, PNG, GIF, WebP / 動画: MP4, WebM
              </p>
            </div>

            <div>
              <label className="label">表示時間（秒）</label>
              <input
                type="number"
                required
                min={1}
                max={60}
                className="input"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 10)}
              />
              <p className="text-xs text-gray-500 mt-2">
                画像の表示時間、または動画の場合は無視されます
              </p>
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
            disabled={isLoading || !file}
            className="btn btn-primary"
          >
            {isLoading ? "アップロード中..." : "アップロード"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AreaAssignmentModal({
  campaign,
  onClose,
  onSave,
}: {
  campaign: Campaign;
  onClose: () => void;
  onSave: () => void;
}) {
  const [stores, setStores] = useState<Store[]>([]);
  const [storeAreas, setStoreAreas] = useState<Record<string, Area[]>>({});
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [storesData, assignedAreas] = await Promise.all([
        api.getStores(),
        api.getCampaignAreas(campaign.id),
      ]);

      setStores(storesData);
      setSelectedAreas(new Set(assignedAreas.map((a) => a.id)));

      // Load areas for all stores
      const areasMap: Record<string, Area[]> = {};
      for (const store of storesData) {
        areasMap[store.id] = await api.getAreas(store.id);
      }
      setStoreAreas(areasMap);
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleArea = (areaId: string) => {
    const newSelected = new Set(selectedAreas);
    if (newSelected.has(areaId)) {
      newSelected.delete(areaId);
    } else {
      newSelected.add(areaId);
    }
    setSelectedAreas(newSelected);
  };

  const toggleStore = (storeId: string) => {
    const storeAreaIds = storeAreas[storeId]?.map((a) => a.id) || [];
    const allSelected = storeAreaIds.every((id) => selectedAreas.has(id));

    const newSelected = new Set(selectedAreas);
    if (allSelected) {
      storeAreaIds.forEach((id) => newSelected.delete(id));
    } else {
      storeAreaIds.forEach((id) => newSelected.add(id));
    }
    setSelectedAreas(newSelected);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.updateCampaignAreas(campaign.id, Array.from(selectedAreas));
      onSave();
    } catch (error) {
      console.error("Failed to save areas", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            配信エリア設定: {campaign.name}
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="loading-spinner h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-4">
              {stores.map((store) => {
                const areas = storeAreas[store.id] || [];
                const selectedCount = areas.filter((a) =>
                  selectedAreas.has(a.id)
                ).length;
                const allSelected =
                  areas.length > 0 && selectedCount === areas.length;

                return (
                  <div key={store.id} className="border border-dark-600 rounded-xl overflow-hidden">
                    <div
                      className="flex items-center p-4 bg-dark-700/50 cursor-pointer hover:bg-dark-700 transition-colors"
                      onClick={() => toggleStore(store.id)}
                    >
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={() => toggleStore(store.id)}
                        className="checkbox"
                      />
                      <span className="ml-3 font-medium text-white">
                        {store.name}
                      </span>
                      <span className="ml-2 text-sm text-gray-500">
                        ({selectedCount}/{areas.length} エリア選択中)
                      </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2 bg-dark-800/30">
                      {areas.map((area) => (
                        <label
                          key={area.id}
                          className="flex items-center p-2 hover:bg-dark-700/50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedAreas.has(area.id)}
                            onChange={() => toggleArea(area.id)}
                            className="checkbox"
                          />
                          <span className="ml-2 text-sm text-gray-300">
                            {area.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary"
          >
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
