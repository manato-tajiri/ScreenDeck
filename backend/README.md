# ScreenDeck Backend

FastAPIを使用したScreenDeckのバックエンドAPI

## 技術スタック

- **フレームワーク**: FastAPI
- **言語**: Python 3.11+
- **ORM**: SQLAlchemy 2.0
- **マイグレーション**: Alembic
- **認証**: JWT (python-jose)
- **パスワード**: bcrypt
- **バリデーション**: Pydantic v2

## ディレクトリ構成

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py           # FastAPIアプリケーション
│   ├── config.py         # 設定管理
│   ├── database.py       # DB接続
│   ├── dependencies.py   # 認証依存関係
│   ├── security.py       # JWT・パスワード処理
│   ├── models/           # SQLAlchemyモデル
│   │   ├── user.py       # ユーザー
│   │   ├── store.py      # 店舗
│   │   ├── area.py       # エリア
│   │   ├── device.py     # 端末
│   │   ├── campaign.py   # キャンペーン
│   │   ├── media.py      # メディア
│   │   └── playback_log.py # 再生ログ
│   ├── schemas/          # Pydanticスキーマ
│   │   ├── user.py
│   │   ├── store.py
│   │   ├── area.py
│   │   ├── device.py
│   │   ├── campaign.py
│   │   ├── media.py
│   │   ├── playlist.py
│   │   └── playback_log.py
│   ├── routers/          # APIルーター
│   │   ├── auth.py       # 認証
│   │   ├── stores.py     # 店舗管理
│   │   ├── areas.py      # エリア管理
│   │   ├── devices.py    # 端末管理
│   │   ├── campaigns.py  # キャンペーン管理
│   │   ├── media.py      # メディア管理
│   │   ├── player.py     # プレイヤーAPI
│   │   └── reports.py    # レポート
│   └── utils/
│       └── storage.py    # ストレージ抽象化
├── alembic/              # マイグレーション
│   ├── env.py
│   └── versions/
│       └── 001_initial.py
├── alembic.ini
├── requirements.txt
└── Dockerfile
```

## セットアップ

### 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 環境変数

```bash
# データベース
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/screendeck

# 認証
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24時間

# Cookie
COOKIE_SECURE=false      # 本番環境ではtrue
COOKIE_SAMESITE=lax      # 本番環境ではnone (クロスオリジン時)

# CORS
CORS_ORIGINS=["http://localhost:3000"]
FRONTEND_URL=http://localhost:3000

# ストレージ
USE_LOCAL_STORAGE=true   # ローカル開発ではtrue
LOCAL_STORAGE_PATH=/app/media
MEDIA_BASE_URL=http://localhost:8000/media

# GCS (本番環境)
GCS_BUCKET_NAME=screendeck-media
GCS_PROJECT_ID=your-project-id
GOOGLE_APPLICATION_CREDENTIALS=/path/to/credentials.json
```

### マイグレーション

```bash
# 初回マイグレーション実行
alembic upgrade head

# 新規マイグレーション作成
alembic revision --autogenerate -m "description"
```

### 開発サーバー起動

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## APIドキュメント

開発サーバー起動後、以下でアクセス可能：

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## データモデル

### ER図

```
users ─────────┐
               │
stores ────────┼─── areas ─── devices ─── playback_logs
               │      │           │
               │      └───────────┤
               │                  │
campaigns ─────┼─── campaign_areas ───┘
               │
media ─────────┘
```

### テーブル

| テーブル | 説明 |
|---------|------|
| `users` | ユーザー（admin/staff） |
| `stores` | 店舗 |
| `areas` | エリア（店舗内の区画） |
| `devices` | 端末（サイネージデバイス） |
| `campaigns` | キャンペーン |
| `campaign_areas` | キャンペーンとエリアの紐付け |
| `media` | メディアファイル（画像・動画） |
| `playback_logs` | 再生ログ |

## API エンドポイント

### 認証 (`/api/v1/auth`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | `/login` | ログイン | - |
| POST | `/logout` | ログアウト | - |
| GET | `/me` | 現在のユーザー取得 | 必須 |
| POST | `/users` | ユーザー作成 | admin |

### 店舗 (`/api/v1/stores`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/` | 店舗一覧 | admin |
| POST | `/` | 店舗作成 | admin |
| GET | `/{id}` | 店舗詳細 | admin |
| PUT | `/{id}` | 店舗更新 | admin |
| DELETE | `/{id}` | 店舗削除 | admin |

### エリア (`/api/v1/stores/{store_id}/areas`, `/api/v1/areas`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/stores/{store_id}/areas` | エリア一覧 | admin |
| POST | `/stores/{store_id}/areas` | エリア作成 | admin |
| GET | `/areas/{id}` | エリア詳細 | admin |
| GET | `/areas/{id}/public` | エリア公開情報 | - |
| PUT | `/areas/{id}` | エリア更新 | admin |
| DELETE | `/areas/{id}` | エリア削除 | admin |
| GET | `/areas/{id}/qrcode` | QRコード生成 | admin |

### 端末 (`/api/v1/devices`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/` | 端末一覧 | admin/staff |
| POST | `/register` | 端末登録 | admin/staff |
| POST | `/register/qr` | QRコード登録 | - |
| GET | `/{id}` | 端末詳細 | admin/staff |
| PUT | `/{id}` | 端末更新 | admin/staff |
| PUT | `/{id}/area` | エリア変更 | admin/staff |
| DELETE | `/{id}` | 端末削除 | admin |

### キャンペーン (`/api/v1/campaigns`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/` | キャンペーン一覧 | admin |
| POST | `/` | キャンペーン作成 | admin |
| GET | `/{id}` | キャンペーン詳細 | admin |
| PUT | `/{id}` | キャンペーン更新 | admin |
| DELETE | `/{id}` | キャンペーン削除 | admin |
| GET | `/{id}/areas` | 配信エリア取得 | admin |
| PUT | `/{id}/areas` | 配信エリア設定 | admin |

### メディア (`/api/v1/campaigns/{campaign_id}/media`, `/api/v1/media`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/campaigns/{campaign_id}/media` | メディア一覧 | admin |
| POST | `/campaigns/{campaign_id}/media` | メディアアップロード | admin |
| GET | `/media/{id}` | メディア詳細 | admin |
| PUT | `/media/{id}` | メディア更新 | admin |
| DELETE | `/media/{id}` | メディア削除 | admin |

**対応フォーマット:**
- 画像: JPEG, PNG, GIF, WebP
- 動画: MP4, WebM, QuickTime
- 最大サイズ: 100MB

### プレイヤー (`/api/v1/player`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/playlist?device_id={id}` | プレイリスト取得 | - |
| POST | `/logs` | 再生ログ送信 | - |
| POST | `/heartbeat?device_id={id}` | ハートビート | - |

### レポート (`/api/v1/reports`)

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/campaigns` | キャンペーン別集計 | admin |
| GET | `/stores` | 店舗別集計 | admin |
| GET | `/devices` | 端末別集計 | admin |
| GET | `/summary` | サマリー | admin |

## 認証フロー

1. `POST /api/v1/auth/login` でメールアドレス・パスワードを送信
2. 認証成功時、httpOnlyクッキーでJWTトークンを設定
3. 以降のリクエストでクッキーまたはAuthorizationヘッダーでトークンを送信
4. `POST /api/v1/auth/logout` でクッキーをクリア

## ストレージ

### ローカルストレージ（開発環境）

```python
USE_LOCAL_STORAGE=true
LOCAL_STORAGE_PATH=/app/media
MEDIA_BASE_URL=http://localhost:8000/media
```

ファイルは `/media/{path}` で静的配信されます。

### Google Cloud Storage（本番環境）

```python
USE_LOCAL_STORAGE=false
GCS_BUCKET_NAME=your-bucket
GCS_PROJECT_ID=your-project
GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

署名付きURL（7日間有効）を生成して配信します。

## プレイリスト生成ロジック

1. 端末のエリアIDを取得
2. エリアに紐づくアクティブなキャンペーンを取得
   - `is_active = true`
   - `start_date <= today <= end_date`
3. 各キャンペーンのメディアを取得
4. キャンペーンの重み（weight）に基づいてシャッフル
5. プレイリストを返却

## テスト

```bash
# テスト実行
pytest

# カバレッジ付き
pytest --cov=app
```

## Docker

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## ライセンス

Proprietary - All rights reserved
