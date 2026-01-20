.PHONY: help local stop logs restart clean db-migrate db-seed

# Default target
help:
	@echo "ScreenDeck - デジタルサイネージ広告配信システム"
	@echo ""
	@echo "使用方法:"
	@echo "  make local      - ローカル環境で起動 (localhost)"
	@echo "  make stop       - すべてのサービスを停止"
	@echo "  make restart    - サービスを再起動"
	@echo "  make logs       - ログを表示"
	@echo "  make clean      - コンテナとボリュームを削除"
	@echo ""
	@echo "データベース:"
	@echo "  make db-migrate - マイグレーションを実行"
	@echo "  make db-seed    - 初期データ（管理者ユーザー）を作成"

# ============================================
# ローカル環境 (localhost)
# ============================================
local: stop
	@echo "🚀 ローカル環境で起動中..."
	docker compose up -d
	@echo ""
	@echo "✅ 起動完了"
	@echo ""
	@echo "📍 アクセスURL:"
	@echo "   フロントエンド: http://localhost:3000"
	@echo "   バックエンドAPI: http://localhost:8000"
	@echo "   API ドキュメント: http://localhost:8000/docs"
	@echo ""
	@echo "🔑 ログイン情報:"
	@echo "   Email: admin@example.com"
	@echo "   Password: admin123"

# ============================================
# 共通コマンド
# ============================================
stop:
	@echo "🛑 サービスを停止中..."
	@docker compose down 2>/dev/null || true

restart:
	@echo "🔄 サービスを再起動中..."
	docker compose restart

logs:
	docker compose logs -f

logs-backend:
	docker compose logs -f backend

logs-frontend:
	docker compose logs -f frontend

clean: stop
	@echo "🧹 クリーンアップ中..."
	docker compose down -v
	docker system prune -f
	@echo "✅ クリーンアップ完了"

# ============================================
# データベース
# ============================================
db-migrate:
	@echo "📦 マイグレーションを実行中..."
	docker compose exec backend alembic upgrade head
	@echo "✅ マイグレーション完了"

db-seed:
	@echo "🌱 初期データを作成中..."
	docker compose exec backend python -m scripts.create_admin
	@echo "✅ 初期データ作成完了"

# ============================================
# 開発用
# ============================================
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec db psql -U postgres -d screendeck
