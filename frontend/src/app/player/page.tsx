"use client";

import { useEffect, useState, useRef, useCallback } from "react";
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
} from "@/lib/storage";
import type { Playlist, PlaylistItem, PlaybackLogCreate } from "@/types";

const SYNC_INTERVAL = 15 * 60 * 1000; // 15 minutes
const LOG_SYNC_INTERVAL = 60 * 1000; // 1 minute
const HEARTBEAT_INTERVAL = 5 * 60 * 1000; // 5 minutes

export default function PlayerPage() {
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

  // Initialize
  useEffect(() => {
    if (!deviceId) {
      setError("device_id パラメータが必要です");
      return;
    }

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
  }, [deviceId, syncPlaylist, syncLogs, sendHeartbeat]);

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
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <p className="text-xl mb-4">エラー</p>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!playlist || playlist.items.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>コンテンツを読み込み中...</p>
          {!isOnline && (
            <p className="text-yellow-500 mt-2">オフラインモード</p>
          )}
        </div>
      </div>
    );
  }

  const currentItem = playlist.items[currentIndex];

  return (
    <div className="fixed inset-0 bg-black">
      {/* Status indicator */}
      {!isOnline && (
        <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-yellow-500 text-black text-sm rounded">
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
