"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import {
  savePlaylist,
  getPlaylist,
  savePlaybackLog,
  getUnsyncedLogs,
  markLogsSynced,
  cachePlaylistMedia,
  getMediaUrl,
  getDeviceIdentity,
  saveDeviceIdentity,
} from "@/lib/storage";
import type { Playlist, PlaylistItem, PlaybackLogCreate } from "@/types";

const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
const LOG_SYNC_INTERVAL = 60 * 1000; // 1 minute
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-dark-950 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="loading-spinner h-12 w-12 mx-auto mb-4" />
        <p className="text-gray-400">読み込み中...</p>
      </div>
    </div>
  );
}

function PlayerContent() {
  const searchParams = useSearchParams();
  const deviceId = searchParams.get("device_id");

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentUrl, setCurrentUrl] = useState<string>("");
  const [isOnline, setIsOnline] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync playlist from server
  const syncPlaylist = useCallback(async () => {
    if (!deviceId) return;

    try {
      const newPlaylist = await api.getPlaylist(deviceId);
      setPlaylist(newPlaylist);
      await savePlaylist(newPlaylist);

      // Cache media files
      await cachePlaylistMedia(newPlaylist.items);

      setIsOnline(true);
      setError(null);
    } catch (err) {
      console.error("Failed to sync playlist", err);
      setIsOnline(false);

      // Try to load from cache
      const cached = await getPlaylist();
      if (cached) {
        setPlaylist(cached);
      } else {
        setError("プレイリストの取得に失敗しました");
      }
    }
  }, [deviceId]);

  // Sync playback logs
  const syncLogs = useCallback(async () => {
    if (!deviceId) return;

    try {
      const unsyncedLogs = await getUnsyncedLogs();
      if (unsyncedLogs.length === 0) return;

      const logs: PlaybackLogCreate[] = unsyncedLogs.map((log) => ({
        device_id: log.device_id,
        media_id: log.media_id,
        campaign_id: log.campaign_id,
        played_at: log.played_at,
      }));

      await api.submitPlaybackLogs(logs);

      const ids = unsyncedLogs
        .filter((log) => log.id !== undefined)
        .map((log) => log.id as number);
      await markLogsSynced(ids);
    } catch (err) {
      console.error("Failed to sync logs", err);
    }
  }, [deviceId]);

  // Send heartbeat
  const sendHeartbeat = useCallback(async () => {
    if (!deviceId) return;

    try {
      await api.heartbeat(deviceId);
    } catch (err) {
      console.error("Failed to send heartbeat", err);
    }
  }, [deviceId]);

  // Log playback
  const logPlayback = useCallback(
    async (item: PlaylistItem) => {
      if (!deviceId) return;

      await savePlaybackLog({
        device_id: deviceId,
        media_id: item.media_id,
        campaign_id: item.campaign_id,
        played_at: new Date().toISOString(),
      });
    },
    [deviceId]
  );

  // Play next item
  const playNext = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;

    setCurrentIndex((prev) => (prev + 1) % playlist.items.length);
  }, [playlist]);

  // Migrate existing device to IndexedDB (for devices registered before this feature)
  const migrateDeviceIdentity = useCallback(async () => {
    if (!deviceId) return;

    try {
      const existingIdentity = await getDeviceIdentity();
      // Only migrate if no identity exists or if the device ID doesn't match
      if (!existingIdentity || existingIdentity.deviceId !== deviceId) {
        // Fetch device info from server
        try {
          const device = await api.getDevicePublic(deviceId);
          await saveDeviceIdentity({
            deviceId: device.id,
            deviceCode: device.device_code,
            areaId: device.area_id,
            registeredAt: device.registered_at,
          });
          console.log("Device identity migrated to IndexedDB");
        } catch (err) {
          console.error("Failed to migrate device identity", err);
        }
      }
    } catch (err) {
      console.error("Failed to check device identity", err);
    }
  }, [deviceId]);

  // Initialize
  useEffect(() => {
    if (!deviceId) {
      setError("device_id パラメータが必要です");
      return;
    }

    // Migrate device identity if needed
    migrateDeviceIdentity();

    // Initial sync
    syncPlaylist();

    // Set up intervals
    const playlistInterval = setInterval(syncPlaylist, SYNC_INTERVAL);
    const logInterval = setInterval(syncLogs, LOG_SYNC_INTERVAL);
    const heartbeatInterval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Online/offline detection
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(playlistInterval);
      clearInterval(logInterval);
      clearInterval(heartbeatInterval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [deviceId, syncPlaylist, syncLogs, sendHeartbeat, migrateDeviceIdentity]);

  // Handle current item changes
  useEffect(() => {
    if (!playlist || playlist.items.length === 0) return;

    const currentItem = playlist.items[currentIndex];
    if (!currentItem) return;

    // Log playback
    logPlayback(currentItem);

    // Get media URL (from cache or original)
    const loadMedia = async () => {
      const url = await getMediaUrl(currentItem.url);
      setCurrentUrl(url);
    };
    loadMedia();

    // Clear previous timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set timer for images
    if (currentItem.type === "image") {
      timerRef.current = setTimeout(playNext, currentItem.duration_seconds * 1000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [playlist, currentIndex, logPlayback, playNext]);

  // Handle video ended
  const handleVideoEnded = () => {
    playNext();
  };

  if (error) {
    return (
      <div className="fixed inset-0 bg-dark-950 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">!</span>
          </div>
          <p className="text-xl text-white mb-2">エラー</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!playlist || playlist.items.length === 0) {
    return (
      <div className="fixed inset-0 bg-dark-950 flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner h-12 w-12 mx-auto mb-4" />
          <p className="text-white">コンテンツを読み込み中...</p>
          {!isOnline && (
            <p className="text-neon-gold mt-2">オフラインモード</p>
          )}
        </div>
      </div>
    );
  }

  const currentItem = playlist.items[currentIndex];

  return (
    <div className="fixed inset-0 bg-dark-950">
      {/* Status indicator */}
      {!isOnline && (
        <div className="absolute top-4 right-4 z-10 px-4 py-2 bg-neon-gold/20 text-neon-gold text-sm rounded-full border border-neon-gold/30 backdrop-blur-sm">
          オフライン
        </div>
      )}

      {/* Media display */}
      {currentItem?.type === "image" ? (
        <img
          key={currentItem.media_id}
          src={currentUrl || currentItem.url}
          alt=""
          className="w-full h-full object-contain"
        />
      ) : (
        <video
          ref={videoRef}
          key={currentItem.media_id}
          src={currentUrl || currentItem.url}
          autoPlay
          muted
          playsInline
          onEnded={handleVideoEnded}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <PlayerContent />
    </Suspense>
  );
}
