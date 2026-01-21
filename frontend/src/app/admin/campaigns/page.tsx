"use client";

import { useEffect, useState, useMemo } from "react";
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
  AlertTriangle,
  Check,
  Search,
  CheckSquare,
  Square,
  Building2,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { api } from "@/lib/api";
import type { Campaign, Media, Store, Area, AreaCampaignAssignment, CampaignConflict } from "@/types";
import { formatDate, formatFileSize } from "@/lib/utils";

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [expandedCampaigns, setExpandedCampaigns] = useState<Set<string>>(new Set());
  const [campaignMedia, setCampaignMedia] = useState<Record<string, Media[]>>({});

  // Load stores on mount
  useEffect(() => {
    loadStores();
  }, []);

  // Load campaigns when selected store changes
  useEffect(() => {
    if (selectedStoreId) {
      loadCampaigns(selectedStoreId);
    }
  }, [selectedStoreId]);

  const loadStores = async () => {
    try {
      const data = await api.getStores();
      setStores(data);
      // Auto-select first store if available
      if (data.length > 0) {
        setSelectedStoreId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load stores", error);
    }
  };

  const loadCampaigns = async (storeId: string) => {
    setIsLoading(true);
    try {
      const data = await api.getCampaigns({ store_id: storeId });
      setCampaigns(data);
    } catch (error) {
      console.error("Failed to load campaigns", error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedStore = stores.find((s) => s.id === selectedStoreId);

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
      if (selectedStoreId) {
        await loadCampaigns(selectedStoreId);
      }
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

  const handleMediaReorder = async (campaignId: string, activeId: string, overId: string) => {
    const media = campaignMedia[campaignId];
    if (!media) return;

    const oldIndex = media.findIndex((m) => m.id === activeId);
    const newIndex = media.findIndex((m) => m.id === overId);

    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    // Optimistically update the UI
    const reorderedMedia = arrayMove(media, oldIndex, newIndex);
    setCampaignMedia((prev) => ({ ...prev, [campaignId]: reorderedMedia }));

    // Persist to server
    try {
      const mediaIds = reorderedMedia.map((m) => m.id);
      await api.reorderCampaignMedia(campaignId, mediaIds);
    } catch (error) {
      console.error("Failed to reorder media", error);
      // Revert on error
      await loadMedia(campaignId);
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
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-400" />
            <select
              value={selectedStoreId}
              onChange={(e) => setSelectedStoreId(e.target.value)}
              className="input min-w-[200px]"
            >
              {stores.length === 0 ? (
                <option value="">店舗がありません</option>
              ) : (
                stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))
              )}
            </select>
          </div>
          <button
            onClick={() => {
              setEditingCampaign(null);
              setShowCampaignModal(true);
            }}
            className="btn btn-primary"
            disabled={!selectedStoreId}
          >
            <Plus className="h-4 w-4 mr-2" />
            キャンペーンを作成
          </button>
        </div>
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
                  <MediaList
                    media={campaignMedia[campaign.id] || []}
                    campaignId={campaign.id}
                    onReorder={handleMediaReorder}
                    onDelete={handleDeleteMedia}
                  />
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
      {showCampaignModal && selectedStore && (
        <CampaignModal
          campaign={editingCampaign}
          storeId={selectedStoreId}
          storeName={selectedStore.name}
          onClose={() => setShowCampaignModal(false)}
          onSave={async () => {
            await loadCampaigns(selectedStoreId);
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
          storeId={selectedCampaign.store_id}
          onClose={() => setShowAreaModal(false)}
          onSave={() => setShowAreaModal(false)}
        />
      )}
    </div>
  );
}

// Sortable Media Item Component
function SortableMediaItem({
  media,
  index,
  onDelete,
}: {
  media: Media;
  index: number;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: media.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 bg-dark-700/50 rounded-xl border border-dark-600 ${
        isDragging ? "opacity-50 border-neon-magenta/50" : "hover:border-dark-500"
      } transition-colors`}
    >
      {/* Drag Handle */}
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-400 touch-none"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Order Number */}
      <span className="text-sm text-gray-500 font-mono w-6 text-center">
        {index + 1}
      </span>

      {/* Thumbnail */}
      <div className="w-16 h-10 bg-dark-800 rounded-lg flex-shrink-0 overflow-hidden flex items-center justify-center">
        {media.type === "image" ? (
          media.gcs_url ? (
            <img
              src={media.gcs_url}
              alt={media.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <Image className="h-5 w-5 text-gray-600" />
          )
        ) : (
          <Video className="h-5 w-5 text-gray-600" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">
          {media.filename}
        </p>
        <p className="text-xs text-gray-500">
          {media.duration_seconds}秒 |{" "}
          {media.file_size ? formatFileSize(media.file_size) : "-"}
        </p>
      </div>

      {/* Delete Button */}
      <button
        onClick={onDelete}
        className="text-red-400 hover:text-red-300 text-sm transition-colors flex-shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

// Media List Component with DnD
function MediaList({
  media,
  campaignId,
  onReorder,
  onDelete,
}: {
  media: Media[];
  campaignId: string;
  onReorder: (campaignId: string, activeId: string, overId: string) => void;
  onDelete: (mediaId: string, campaignId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onReorder(campaignId, active.id as string, over.id as string);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={media.map((m) => m.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {media.map((item, index) => (
            <SortableMediaItem
              key={item.id}
              media={item}
              index={index}
              onDelete={() => onDelete(item.id, campaignId)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

type WizardStep = 1 | 2 | 3;

function CampaignModal({
  campaign,
  storeId,
  storeName,
  onClose,
  onSave,
}: {
  campaign: Campaign | null;
  storeId: string;
  storeName: string;
  onClose: () => void;
  onSave: () => void;
}) {
  // Step state
  const [currentStep, setCurrentStep] = useState<WizardStep>(1);
  const isEditMode = !!campaign;

  // Step 1: Basic info
  const [name, setName] = useState(campaign?.name || "");
  const [description, setDescription] = useState(campaign?.description || "");
  const [weight, setWeight] = useState(campaign?.weight || 1);
  const [startDate, setStartDate] = useState(campaign?.start_date || "");
  const [endDate, setEndDate] = useState(campaign?.end_date || "");
  const [isActive, setIsActive] = useState(campaign?.is_active ?? true);

  // Step 2: Area selection (simplified - single store)
  const [areaAssignments, setAreaAssignments] = useState<AreaCampaignAssignment[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [areasLoading, setAreasLoading] = useState(false);

  // General state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Conflict check state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflicts, setConflicts] = useState<CampaignConflict[]>([]);

  // Load area assignments when entering step 2
  useEffect(() => {
    if (currentStep === 2 && areaAssignments.length === 0) {
      loadAreaAssignments();
    }
  }, [currentStep]);

  // Load initial area assignments for edit mode
  useEffect(() => {
    if (campaign) {
      api.getCampaignAreas(campaign.id).then((areas) => {
        setSelectedAreas(new Set(areas.map((a) => a.id)));
      });
    }
  }, [campaign]);

  const loadAreaAssignments = async () => {
    if (!startDate || !endDate) return;

    setAreasLoading(true);
    try {
      const response = await api.getAreaCampaignAssignments({
        store_id: storeId,
        start_date: startDate,
        end_date: endDate,
        exclude_campaign_id: campaign?.id,
      });
      setAreaAssignments(response.areas);
    } catch (error) {
      console.error("Failed to load area assignments", error);
    } finally {
      setAreasLoading(false);
    }
  };

  // Filter areas by search query (simplified - no store grouping needed)
  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return areaAssignments;

    const query = searchQuery.toLowerCase();
    return areaAssignments.filter((area) =>
      area.area_name.toLowerCase().includes(query) ||
      area.area_code.toLowerCase().includes(query)
    );
  }, [areaAssignments, searchQuery]);

  // Count selected and conflicts
  const stats = useMemo(() => {
    let conflictCount = 0;
    for (const area of areaAssignments) {
      if (selectedAreas.has(area.area_id) && area.has_conflict) {
        conflictCount++;
      }
    }
    return {
      selectedCount: selectedAreas.size,
      conflictCount,
    };
  }, [areaAssignments, selectedAreas]);

  const toggleArea = (areaId: string) => {
    const newSelected = new Set(selectedAreas);
    if (newSelected.has(areaId)) {
      newSelected.delete(areaId);
    } else {
      newSelected.add(areaId);
    }
    setSelectedAreas(newSelected);
  };

  const selectAllAreas = () => {
    const allAreaIds = areaAssignments.map((a) => a.area_id);
    setSelectedAreas(new Set(allAreaIds));
  };

  const deselectAllAreas = () => {
    setSelectedAreas(new Set());
  };

  const getAreaStatus = (area: AreaCampaignAssignment) => {
    const isSelected = selectedAreas.has(area.area_id);

    if (isSelected && area.has_conflict) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        text: `重複: ${area.conflicting_campaigns.map((c) => `${c.name} (${formatDate(c.start_date)}〜${formatDate(c.end_date)})`).join(", ")}`,
        className: "text-amber-400",
      };
    }

    if (area.assigned_campaigns.length > 0 && !isSelected) {
      return {
        icon: <span className="h-4 w-4 inline-block text-center text-gray-500">─</span>,
        text: `${area.assigned_campaigns[0].name}配信中`,
        className: "text-gray-500",
      };
    }

    return {
      icon: <Check className="h-4 w-4 text-green-400" />,
      text: "配信可能",
      className: "text-green-400",
    };
  };

  // Validation
  const isStep1Valid = name.trim() && startDate && endDate && startDate <= endDate;

  const handleNext = () => {
    if (currentStep === 1 && isStep1Valid) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    } else if (currentStep === 3) {
      setCurrentStep(2);
    }
  };

  const handleSkipAreas = () => {
    setCurrentStep(3);
  };

  const handleSubmit = async (skipConflictCheck = false) => {
    setError("");

    // Check for conflicts first (unless skipping)
    if (!skipConflictCheck && selectedAreas.size > 0) {
      setIsLoading(true);
      try {
        const conflictResult = await api.checkCampaignConflicts({
          area_ids: Array.from(selectedAreas),
          start_date: startDate,
          end_date: endDate,
          exclude_campaign_id: campaign?.id,
        });

        if (conflictResult.has_conflicts) {
          setConflicts(conflictResult.conflicts);
          setShowConflictDialog(true);
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Failed to check conflicts", err);
        // Continue with save if conflict check fails
      }
    }

    setIsLoading(true);

    try {
      let campaignId = campaign?.id;

      if (campaign) {
        // Update existing campaign
        await api.updateCampaign(campaign.id, {
          name,
          description,
          weight,
          start_date: startDate,
          end_date: endDate,
          is_active: isActive,
        });
      } else {
        // Create new campaign (with store_id)
        const newCampaign = await api.createCampaign({
          store_id: storeId,
          name,
          description,
          weight,
          start_date: startDate,
          end_date: endDate,
        });
        campaignId = newCampaign.id;
      }

      // Update area assignments
      if (campaignId) {
        await api.updateCampaignAreas(campaignId, Array.from(selectedAreas));
      }

      onSave();
    } catch (err: any) {
      setError(err.response?.data?.detail || "保存に失敗しました");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmWithConflicts = () => {
    setShowConflictDialog(false);
    handleSubmit(true); // Skip conflict check and proceed
  };

  // Get selected area names for confirmation
  const selectedAreaNames = useMemo(() => {
    return areaAssignments
      .filter((area) => selectedAreas.has(area.area_id))
      .map((area) => area.area_name);
  }, [areaAssignments, selectedAreas]);

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header with step indicator */}
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            {isEditMode ? "キャンペーンを編集" : "キャンペーンを作成"}
          </h2>

          {/* Step indicator */}
          <div className="flex items-center justify-center mt-4 gap-2">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    currentStep === step
                      ? "bg-neon-magenta text-white"
                      : currentStep > step
                      ? "bg-green-500 text-white"
                      : "bg-dark-600 text-gray-400"
                  }`}
                >
                  {currentStep > step ? <Check className="h-4 w-4" /> : step}
                </div>
                <span
                  className={`ml-2 text-sm ${
                    currentStep === step ? "text-white" : "text-gray-500"
                  }`}
                >
                  {step === 1 ? "基本情報" : step === 2 ? "エリア選択" : "確認"}
                </span>
                {step < 3 && (
                  <div className="w-8 h-px bg-dark-600 mx-2" />
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="label">店舗</label>
                <div className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-gray-300">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  {storeName}
                </div>
              </div>

              <div>
                <label className="label">キャンペーン名 *</label>
                <input
                  type="text"
                  required
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="例: 夏のキャンペーン"
                />
              </div>

              <div>
                <label className="label">説明</label>
                <textarea
                  className="input"
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="キャンペーンの説明（任意）"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">開始日 *</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="label">終了日 *</label>
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

              {isEditMode && (
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
            </div>
          )}

          {/* Step 2: Area Selection (Simplified - Single Store) */}
          {currentStep === 2 && (
            <div className="flex flex-col h-full">
              {/* Header with store name */}
              <div className="px-6 py-3 border-b border-dark-600 bg-dark-700/30">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <Building2 className="h-4 w-4" />
                  <span>配信エリア選択（{storeName}）</span>
                </div>
              </div>

              {/* Search and bulk actions */}
              <div className="px-6 py-4 border-b border-dark-600 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="エリアを検索..."
                    className="input pl-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={selectAllAreas} className="btn btn-secondary text-sm">
                    <CheckSquare className="h-4 w-4 mr-1" />
                    すべて選択
                  </button>
                  <button onClick={deselectAllAreas} className="btn btn-secondary text-sm">
                    <Square className="h-4 w-4 mr-1" />
                    すべて解除
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {areasLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="loading-spinner h-8 w-8" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredAreas.map((area) => {
                      const status = getAreaStatus(area);
                      const isSelected = selectedAreas.has(area.area_id);

                      return (
                        <label
                          key={area.area_id}
                          className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-dark-600/50 border border-neon-magenta/30"
                              : "hover:bg-dark-700/50 border border-dark-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleArea(area.area_id)}
                            className="checkbox"
                          />
                          <span className="ml-3 text-sm text-white font-medium min-w-[120px]">
                            {area.area_name}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({area.area_code})
                          </span>
                          <span className="flex items-center gap-1.5 ml-auto">
                            {status.icon}
                            <span className={`text-xs ${status.className}`}>
                              {status.text}
                            </span>
                          </span>
                        </label>
                      );
                    })}

                    {filteredAreas.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        {searchQuery ? "検索結果がありません" : "エリアがありません"}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Stats footer */}
              <div className="px-6 py-3 border-t border-dark-600 bg-dark-800/50">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400">
                      選択済み: <span className="text-white font-medium">{stats.selectedCount}エリア</span>
                    </span>
                    {stats.conflictCount > 0 && (
                      <span className="flex items-center gap-1 text-amber-400">
                        <AlertTriangle className="h-4 w-4" />
                        重複警告: {stats.conflictCount}件
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Confirmation */}
          {currentStep === 3 && (
            <div className="p-6 space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <h3 className="text-lg font-medium text-white">入力内容の確認</h3>

                <div className="bg-dark-700/50 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">店舗</span>
                    <span className="text-white font-medium">{storeName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">キャンペーン名</span>
                    <span className="text-white font-medium">{name}</span>
                  </div>
                  {description && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">説明</span>
                      <span className="text-white">{description}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">配信期間</span>
                    <span className="text-white">
                      {formatDate(startDate)} 〜 {formatDate(endDate)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">配信重み</span>
                    <span className="text-white">{weight}</span>
                  </div>
                  {isEditMode && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">ステータス</span>
                      <span className={isActive ? "text-green-400" : "text-gray-500"}>
                        {isActive ? "有効" : "無効"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="bg-dark-700/50 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-400">配信エリア</span>
                    <span className="text-white font-medium">{selectedAreaNames.length}エリア</span>
                  </div>
                  {selectedAreaNames.length > 0 ? (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {selectedAreaNames.map((areaName, i) => (
                        <div key={i} className="text-sm text-gray-300">
                          {areaName}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">エリアが選択されていません（後から設定できます）</p>
                  )}
                  {stats.conflictCount > 0 && (
                    <div className="mt-3 flex items-center gap-2 text-amber-400 text-sm">
                      <AlertTriangle className="h-4 w-4" />
                      {stats.conflictCount}件のエリアで他のキャンペーンと期間が重複しています
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            キャンセル
          </button>

          <div className="flex gap-2">
            {currentStep > 1 && (
              <button onClick={handleBack} className="btn btn-secondary">
                戻る
              </button>
            )}

            {currentStep === 1 && (
              <button
                onClick={handleNext}
                disabled={!isStep1Valid}
                className="btn btn-primary"
              >
                次へ: エリア選択
              </button>
            )}

            {currentStep === 2 && (
              <>
                <button onClick={handleSkipAreas} className="btn btn-secondary">
                  スキップ
                </button>
                <button onClick={handleNext} className="btn btn-primary">
                  次へ: 確認
                </button>
              </>
            )}

            {currentStep === 3 && (
              <button
                onClick={() => handleSubmit()}
                disabled={isLoading}
                className="btn btn-primary"
              >
                {isLoading ? "保存中..." : isEditMode ? "更新" : "作成"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Confirmation Dialog */}
      {showConflictDialog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60]">
          <div className="bg-dark-800 rounded-2xl border border-dark-600 w-full max-w-lg mx-4 shadow-xl">
            <div className="p-6 border-b border-dark-600">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">配信期間の重複</h3>
                  <p className="text-sm text-gray-400">
                    {conflicts.length}件のエリアで他のキャンペーンと期間が重複しています
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 max-h-60 overflow-y-auto">
              <div className="space-y-3">
                {conflicts.map((conflict, i) => (
                  <div key={i} className="bg-dark-700/50 rounded-lg p-3">
                    <div className="text-sm text-white font-medium">
                      {conflict.store_name} / {conflict.area_name}
                    </div>
                    <div className="text-xs text-amber-400 mt-1">
                      {conflict.conflicting_campaign.name}
                      （{formatDate(conflict.conflicting_campaign.start_date)}〜
                      {formatDate(conflict.conflicting_campaign.end_date)}）
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-6 border-t border-dark-600 flex justify-end gap-3">
              <button
                onClick={() => setShowConflictDialog(false)}
                className="btn btn-secondary"
              >
                戻って修正
              </button>
              <button
                onClick={handleConfirmWithConflicts}
                className="btn bg-amber-500 hover:bg-amber-600 text-white"
              >
                重複を承知で保存
              </button>
            </div>
          </div>
        </div>
      )}
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
  storeId,
  onClose,
  onSave,
}: {
  campaign: Campaign;
  storeId: string;
  onClose: () => void;
  onSave: () => void;
}) {
  const [areaAssignments, setAreaAssignments] = useState<AreaCampaignAssignment[]>([]);
  const [selectedAreas, setSelectedAreas] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [storeName, setStoreName] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [assignmentsResponse, assignedAreas] = await Promise.all([
        api.getAreaCampaignAssignments({
          store_id: storeId,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          exclude_campaign_id: campaign.id,
        }),
        api.getCampaignAreas(campaign.id),
      ]);

      setAreaAssignments(assignmentsResponse.areas);
      setSelectedAreas(new Set(assignedAreas.map((a) => a.id)));

      // Get store name from first area
      if (assignmentsResponse.areas.length > 0) {
        setStoreName(assignmentsResponse.areas[0].store_name);
      }
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter areas by search query (simplified - no store grouping)
  const filteredAreas = useMemo(() => {
    if (!searchQuery.trim()) return areaAssignments;

    const query = searchQuery.toLowerCase();
    return areaAssignments.filter((area) =>
      area.area_name.toLowerCase().includes(query) ||
      area.area_code.toLowerCase().includes(query)
    );
  }, [areaAssignments, searchQuery]);

  // Count selected and conflicts
  const stats = useMemo(() => {
    let conflictCount = 0;
    for (const area of areaAssignments) {
      if (selectedAreas.has(area.area_id) && area.has_conflict) {
        conflictCount++;
      }
    }
    return {
      selectedCount: selectedAreas.size,
      conflictCount,
    };
  }, [areaAssignments, selectedAreas]);

  const toggleArea = (areaId: string) => {
    const newSelected = new Set(selectedAreas);
    if (newSelected.has(areaId)) {
      newSelected.delete(areaId);
    } else {
      newSelected.add(areaId);
    }
    setSelectedAreas(newSelected);
  };

  const selectAll = () => {
    const allAreaIds = areaAssignments.map((a) => a.area_id);
    setSelectedAreas(new Set(allAreaIds));
  };

  const deselectAll = () => {
    setSelectedAreas(new Set());
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

  const getAreaStatus = (area: AreaCampaignAssignment) => {
    const isSelected = selectedAreas.has(area.area_id);

    if (isSelected && area.has_conflict) {
      return {
        icon: <AlertTriangle className="h-4 w-4 text-amber-400" />,
        text: `重複: ${area.conflicting_campaigns.map((c) => `${c.name} (${formatDate(c.start_date)}〜${formatDate(c.end_date)})`).join(", ")}`,
        className: "text-amber-400",
      };
    }

    if (area.assigned_campaigns.length > 0 && !isSelected) {
      return {
        icon: <span className="h-4 w-4 inline-block text-center text-gray-500">─</span>,
        text: `${area.assigned_campaigns[0].name}配信中`,
        className: "text-gray-500",
      };
    }

    if (!area.has_conflict && area.assigned_campaigns.length === 0) {
      return {
        icon: <Check className="h-4 w-4 text-green-400" />,
        text: "配信可能",
        className: "text-green-400",
      };
    }

    return {
      icon: <Check className="h-4 w-4 text-green-400" />,
      text: "配信可能",
      className: "text-green-400",
    };
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content w-full max-w-3xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="modal-header">
          <h2 className="text-lg font-semibold text-white">
            配信エリア設定: {campaign.name}
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            {formatDate(campaign.start_date)} 〜 {formatDate(campaign.end_date)}
          </p>
        </div>

        {/* Store name header */}
        <div className="px-6 py-3 border-b border-dark-600 bg-dark-700/30">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Building2 className="h-4 w-4" />
            <span>{storeName}</span>
          </div>
        </div>

        {/* Search and bulk actions */}
        <div className="px-6 py-4 border-b border-dark-600 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="エリアを検索..."
              className="input pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={selectAll} className="btn btn-secondary text-sm">
              <CheckSquare className="h-4 w-4 mr-1" />
              すべて選択
            </button>
            <button onClick={deselectAll} className="btn btn-secondary text-sm">
              <Square className="h-4 w-4 mr-1" />
              すべて解除
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="loading-spinner h-8 w-8" />
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAreas.map((area) => {
                const status = getAreaStatus(area);
                const isSelected = selectedAreas.has(area.area_id);

                return (
                  <label
                    key={area.area_id}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-dark-600/50 border border-neon-magenta/30"
                        : "hover:bg-dark-700/50 border border-dark-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleArea(area.area_id)}
                      className="checkbox"
                    />
                    <span className="ml-3 text-sm text-white font-medium min-w-[120px]">
                      {area.area_name}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({area.area_code})
                    </span>
                    <span className="flex items-center gap-1.5 ml-auto">
                      {status.icon}
                      <span className={`text-xs ${status.className}`}>
                        {status.text}
                      </span>
                    </span>
                  </label>
                );
              })}

              {filteredAreas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? "検索結果がありません" : "エリアがありません"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with stats */}
        <div className="px-6 py-3 border-t border-dark-600 bg-dark-800/50">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-gray-400">
                選択済み: <span className="text-white font-medium">{stats.selectedCount}エリア</span>
              </span>
              {stats.conflictCount > 0 && (
                <span className="flex items-center gap-1 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  重複警告: {stats.conflictCount}件
                </span>
              )}
            </div>
          </div>
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
