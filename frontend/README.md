# ScreenDeck Frontend

Next.js 14を使用したScreenDeckのフロントエンドアプリケーション

## 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **スタイリング**: Tailwind CSS
- **状態管理**: Zustand
- **HTTPクライアント**: Axios
- **オフラインストレージ**: IndexedDB (idb)
- **チャート**: Recharts
- **アイコン**: Lucide React
- **QRコード**: qrcode.react

## ディレクトリ構成

```
frontend/
├── src/
│   ├── app/                    # App Router (ページ)
│   │   ├── (public)/           # 公開ページ
│   │   │   ├── login/          # ログイン
│   │   │   ├── register/       # ユーザー登録
│   │   │   └── player/         # プレイヤー画面
│   │   ├── admin/              # 管理者ページ
│   │   │   ├── dashboard/      # ダッシュボード
│   │   │   ├── stores/         # 店舗管理
│   │   │   ├── areas/          # エリア管理
│   │   │   ├── devices/        # 端末管理
│   │   │   ├── campaigns/      # キャンペーン管理
│   │   │   └── reports/        # レポート
│   │   ├── staff/              # スタッフページ
│   │   │   ├── devices/        # 端末管理（限定）
│   │   │   └── register/       # 端末登録
│   │   ├── api/                # API Routes
│   │   │   └── auth/           # 認証プロキシ
│   │   ├── layout.tsx          # ルートレイアウト
│   │   └── globals.css         # グローバルスタイル
│   ├── components/             # UIコンポーネント
│   │   ├── AdminLayout.tsx     # 管理者レイアウト
│   │   └── StaffLayout.tsx     # スタッフレイアウト
│   ├── lib/                    # ユーティリティ
│   │   ├── api.ts              # APIクライアント
│   │   ├── store.ts            # Zustand ストア
│   │   └── storage.ts          # IndexedDB操作
│   ├── types/                  # TypeScript型定義
│   │   └── index.ts
│   └── middleware.ts           # Next.js Middleware
├── public/
│   └── sw.js                   # Service Worker
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
└── Dockerfile
```

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 環境変数

```bash
# クライアントサイド
NEXT_PUBLIC_API_URL=http://localhost:8000

# サーバーサイド (Docker内)
API_URL=http://backend:8000

# JWT検証
JWT_SECRET_KEY=dev-secret-key-change-in-production
```

### 開発サーバー起動

```bash
npm run dev
```

### ビルド

```bash
npm run build
npm run start
```

## ページ構成

### 公開ページ（認証不要）

| パス | 説明 |
|------|------|
| `/login` | ログイン画面 |
| `/register` | ユーザー登録画面 |
| `/player` | プレイヤー画面（デバイス用） |

### 管理者ページ（admin権限）

| パス | 説明 |
|------|------|
| `/admin/dashboard` | ダッシュボード（KPI、統計） |
| `/admin/stores` | 店舗管理 |
| `/admin/stores/[id]/areas` | エリア管理 |
| `/admin/devices` | 端末管理・監視 |
| `/admin/campaigns` | キャンペーン管理 |
| `/admin/campaigns/[id]` | キャンペーン詳細・メディア管理 |
| `/admin/reports` | レポート・分析 |

### スタッフページ（staff権限）

| パス | 説明 |
|------|------|
| `/staff/devices` | 端末管理（所属店舗のみ） |
| `/staff/register` | 端末登録 |

## コンポーネント

### レイアウト

- **AdminLayout**: 管理者用サイドバー・ヘッダー
- **StaffLayout**: スタッフ用シンプルレイアウト

### 共通UI

- Tailwind CSSによるユーティリティベースのスタイリング
- Lucide Reactアイコン
- Rechartsによるグラフ表示
- qrcode.reactによるQRコード生成

## 状態管理

### Zustand ストア

```typescript
// lib/store.ts

// 認証ストア
interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

// プレイヤーストア
interface PlayerStore {
  deviceId: string | null;
  playlist: Playlist | null;
  currentIndex: number;
  setDeviceId: (id: string) => void;
  setPlaylist: (playlist: Playlist) => void;
  nextItem: () => void;
}
```

### IndexedDB（オフライン対応）

```typescript
// lib/storage.ts

// プレイリスト保存・取得
savePlaylist(playlist: Playlist): Promise<void>
getPlaylist(): Promise<Playlist | undefined>

// 再生ログ
savePlaybackLog(log: PlaybackLogCreate): Promise<void>
getUnsyncedLogs(): Promise<PlaybackLog[]>
markLogsSynced(ids: number[]): Promise<void>

// メディアキャッシュ
cacheMedia(url: string, blob: Blob): Promise<void>
getCachedMedia(url: string): Promise<Blob | undefined>
cachePlaylistMedia(items: PlaylistItem[]): Promise<void>
```

## APIクライアント

### 概要

```typescript
// lib/api.ts
import { api } from '@/lib/api';

// 認証
await api.login({ email, password });
await api.logout();
await api.getMe();

// 店舗
await api.getStores();
await api.createStore(data);

// エリア
await api.getAreas(storeId);
await api.getAreaQRCode(areaId);

// 端末
await api.getDevices({ store_id, area_id });
await api.registerDevice(data);

// キャンペーン
await api.getCampaigns({ is_active });
await api.updateCampaignAreas(campaignId, areaIds);

// メディア
await api.uploadMedia(campaignId, file, durationSeconds);

// プレイヤー
await api.getPlaylist(deviceId);
await api.submitPlaybackLogs(logs);
await api.heartbeat(deviceId);

// レポート
await api.getCampaignReports({ start_date, end_date });
```

### 認証フロー

1. `/login` でログインフォーム送信
2. `POST /api/auth/login` (Next.js API Route) を呼び出し
3. バックエンドで認証後、httpOnlyクッキーを設定
4. クッキーはブラウザが自動的に送信
5. Middleware で保護されたルートへのアクセスを制御

## プレイヤー画面

### 機能

- **プレイリスト同期**: 15分間隔でサーバーから取得
- **オフラインキャッシュ**: IndexedDBにプレイリスト・メディアを保存
- **再生ログ**: 再生情報をローカルに記録し、定期的にサーバーへ送信
- **ハートビート**: 5分間隔でオンライン状態を報告

### 使用方法

```
http://localhost:3000/player?device_id={デバイスID}
```

### 状態表示

- ローディング中: スピナー表示
- オフライン: 黄色バッジ表示
- エラー: エラーメッセージ表示

## Middleware

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  // クッキーからJWTトークンを取得
  // トークン検証
  // 未認証ユーザーをログインページへリダイレクト
  // adminユーザーを/admin/dashboardへリダイレクト
  // staffユーザーを/staff/devicesへリダイレクト
}
```

### 保護されるパス

- `/admin/*` - admin権限必須
- `/staff/*` - staff権限必須

## 型定義

```typescript
// types/index.ts

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'staff';
  store_id?: string;
}

interface Store {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface Area {
  id: string;
  store_id: string;
  name: string;
  code: string;
  is_active: boolean;
}

interface Device {
  id: string;
  device_code: string;
  area_id: string;
  name?: string;
  status: 'online' | 'offline' | 'unknown';
  last_sync_at?: string;
}

interface Campaign {
  id: string;
  name: string;
  description?: string;
  weight: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface Media {
  id: string;
  campaign_id: string;
  type: 'image' | 'video';
  filename: string;
  gcs_url: string;
  duration_seconds: number;
  file_size: number;
  sort_order: number;
}

interface Playlist {
  version: string;
  items: PlaylistItem[];
  generated_at: string;
}

interface PlaylistItem {
  media_id: string;
  campaign_id: string;
  url: string;
  type: 'image' | 'video';
  duration_seconds: number;
  filename: string;
}
```

## スクリプト

```bash
npm run dev       # 開発サーバー
npm run build     # 本番ビルド
npm run start     # 本番サーバー
npm run lint      # ESLint実行
```

## Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

CMD ["npm", "start"]
```

## 開発のヒント

### 新しいページを追加

1. `src/app/` 以下にディレクトリを作成
2. `page.tsx` を作成
3. 必要に応じて `layout.tsx` を作成
4. 認証が必要な場合は `middleware.ts` を更新

### 新しいAPIエンドポイントを使用

1. `src/lib/api.ts` にメソッドを追加
2. `src/types/index.ts` に型を追加
3. コンポーネントから呼び出し

### オフライン対応を追加

1. `src/lib/storage.ts` にIndexedDB操作を追加
2. Service Worker（`public/sw.js`）を更新
3. コンポーネントでオンライン/オフライン状態を監視

## ライセンス

Proprietary - All rights reserved
