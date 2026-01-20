# ScreenDeck - デジタルサイネージ広告配信システム

パチンコ店舗向けデジタルサイネージの広告配信・管理システム

## 概要

ScreenDeckは、複数店舗・複数エリアのデジタルサイネージ端末に対して、キャンペーン広告を効率的に配信・管理するためのシステムです。

### 主な機能

- **店舗・エリア管理**: 複数店舗の階層的な管理
- **端末管理**: QRコードによる簡単な端末登録、オンライン状態監視
- **キャンペーン管理**: 期間・重み付けによる柔軟な広告配信
- **メディア管理**: 画像・動画のアップロードと管理
- **プレイヤー**: オフライン対応のPWAプレイヤー
- **レポート**: 再生回数等の分析レポート

## 技術スタック

| レイヤー | 技術 |
|---------|------|
| バックエンド | FastAPI (Python 3.11+) |
| フロントエンド | Next.js 14 (TypeScript, App Router) |
| データベース | PostgreSQL 15 |
| ORM | SQLAlchemy 2.0 + Alembic |
| ストレージ | ローカル / Google Cloud Storage |
| 認証 | JWT (httpOnlyクッキー) |
| コンテナ | Docker Compose |

## ディレクトリ構成

```
ScreenDeck/
├── backend/           # FastAPI バックエンド
│   ├── app/
│   │   ├── models/    # データベースモデル
│   │   ├── routers/   # APIエンドポイント
│   │   ├── schemas/   # Pydanticスキーマ
│   │   └── utils/     # ユーティリティ
│   └── alembic/       # マイグレーション
├── frontend/          # Next.js フロントエンド
│   └── src/
│       ├── app/       # ページ (App Router)
│       ├── components/# UIコンポーネント
│       ├── lib/       # API・ストア・ストレージ
│       └── types/     # TypeScript型定義
├── media/             # アップロードメディア (ローカル)
├── docker-compose.yml
└── Makefile
```

## クイックスタート

### 必要条件

- Docker & Docker Compose
- Make (オプション)

### 起動方法

```bash
# リポジトリをクローン
git clone <repository-url>
cd ScreenDeck

# 開発環境を起動
make local
# または
docker compose up -d

# 初期データを投入 (管理者ユーザー作成)
make db-seed
```

### アクセス

| サービス | URL |
|---------|-----|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:8000 |
| APIドキュメント | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |

### 初期ログイン

```
メールアドレス: admin@example.com
パスワード: admin123
```

## Makeコマンド

```bash
make local          # 開発環境を起動
make stop           # コンテナを停止
make restart        # コンテナを再起動
make logs           # 全サービスのログを表示
make logs-backend   # バックエンドのログを表示
make logs-frontend  # フロントエンドのログを表示
make clean          # コンテナとボリュームを削除
make db-migrate     # マイグレーションを実行
make db-seed        # 初期データを投入
make shell-backend  # バックエンドのシェルに入る
make shell-frontend # フロントエンドのシェルに入る
make shell-db       # PostgreSQLのCLIに入る
```

## 環境変数

### バックエンド

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `DATABASE_URL` | PostgreSQL接続URL | `postgresql://postgres:postgres@db:5432/screendeck` |
| `SECRET_KEY` | JWT署名用シークレットキー | - |
| `CORS_ORIGINS` | CORSを許可するオリジン | `["http://localhost:3000"]` |
| `USE_LOCAL_STORAGE` | ローカルストレージを使用 | `true` |
| `LOCAL_STORAGE_PATH` | メディア保存パス | `/app/media` |
| `MEDIA_BASE_URL` | メディアのベースURL | `http://localhost:8000/media` |
| `GCS_BUCKET_NAME` | GCSバケット名 | - |
| `GCS_PROJECT_ID` | GCPプロジェクトID | - |

### フロントエンド

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| `NEXT_PUBLIC_API_URL` | バックエンドAPIのURL | `http://localhost:8000` |
| `API_URL` | サーバーサイド用API URL | `http://backend:8000` |
| `JWT_SECRET_KEY` | JWT検証用シークレットキー | - |

## システムアーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                      ローカル開発環境                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Frontend   │    │   Backend    │    │  PostgreSQL  │  │
│  │   Next.js    │◄──►│   FastAPI    │◄──►│     :5432    │  │
│  │    :3000     │    │    :8000     │    │              │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                              │
│         │                   ▼                              │
│         │            ┌──────────────┐                      │
│         │            │ Local Media  │                      │
│         │            │   Storage    │                      │
│         │            └──────────────┘                      │
│         │                                                  │
├─────────────────────────────────────────────────────────────┤
│                      店舗デバイス                            │
│  ┌──────────────┐                                          │
│  │   Player     │───────────────────────────────────────────┘
│  │   (PWA)      │  - プレイリスト同期 (15分間隔)
│  │              │  - オフラインキャッシュ対応
│  └──────────────┘  - 再生ログ送信
└─────────────────────────────────────────────────────────────┘
```

## ユーザーロール

| ロール | 権限 |
|--------|------|
| **admin** | 全機能へのアクセス（店舗・エリア・キャンペーン・レポート管理） |
| **staff** | 所属店舗の端末管理のみ |

## プレイヤー画面

端末でコンテンツを再生するには、以下のURLにアクセスします：

```
http://localhost:3000/player?device_id={デバイスID}
```

### 機能

- 15分間隔でプレイリストを自動同期
- IndexedDBによるオフラインキャッシュ
- 再生ログの自動送信
- オンライン/オフライン状態表示

## API概要

### 認証

- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト
- `GET /api/v1/auth/me` - 現在のユーザー取得

### 店舗・エリア

- `GET/POST /api/v1/stores` - 店舗一覧・作成
- `GET/POST /api/v1/stores/{id}/areas` - エリア一覧・作成
- `GET /api/v1/areas/{id}/qrcode` - QRコード生成

### 端末

- `GET /api/v1/devices` - 端末一覧
- `POST /api/v1/devices/register` - 端末登録
- `POST /api/v1/devices/register/qr` - QRコード経由で端末登録（認証不要）

### キャンペーン・メディア

- `GET/POST /api/v1/campaigns` - キャンペーン一覧・作成
- `PUT /api/v1/campaigns/{id}/areas` - 配信エリア設定
- `POST /api/v1/campaigns/{id}/media` - メディアアップロード

### プレイヤー（端末用）

- `GET /api/v1/player/playlist?device_id={id}` - プレイリスト取得
- `POST /api/v1/player/logs` - 再生ログ送信
- `POST /api/v1/player/heartbeat?device_id={id}` - ハートビート

### レポート

- `GET /api/v1/reports/campaigns` - キャンペーン別集計
- `GET /api/v1/reports/stores` - 店舗別集計
- `GET /api/v1/reports/devices` - 端末別集計

## 開発

### バックエンド

```bash
cd backend

# 依存関係インストール
pip install -r requirements.txt

# 開発サーバー起動
uvicorn app.main:app --reload

# マイグレーション作成
alembic revision --autogenerate -m "description"

# マイグレーション実行
alembic upgrade head
```

### フロントエンド

```bash
cd frontend

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

## 本番環境へのデプロイ

本番環境では以下の設定を推奨します：

1. **環境変数の変更**
   - `SECRET_KEY`: 安全なランダム文字列に変更
   - `COOKIE_SECURE`: `true` に設定（HTTPS必須）
   - `USE_LOCAL_STORAGE`: `false` に設定（GCS使用）

2. **GCS設定**
   - `GCS_BUCKET_NAME`: バケット名
   - `GCS_PROJECT_ID`: GCPプロジェクトID
   - `GOOGLE_APPLICATION_CREDENTIALS`: サービスアカウントキーのパス

3. **CORS設定**
   - `CORS_ORIGINS`: 本番ドメインのみを許可

## ライセンス

Proprietary - All rights reserved
