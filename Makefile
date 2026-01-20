.PHONY: help local ngrok stop logs restart clean db-migrate db-seed ngrok-start ngrok-stop

# Default target
help:
	@echo "ScreenDeck - デジタルサイネージ広告配信システム"
	@echo ""
	@echo "使用方法:"
	@echo "  make local      - ローカル環境で起動 (localhost)"
	@echo "  make ngrok      - ngrok経由で公開して起動"
	@echo "  make stop       - すべてのサービスを停止"
	@echo "  make restart    - サービスを再起動"
	@echo "  make logs       - ログを表示"
	@echo "  make clean      - コンテナとボリュームを削除"
	@echo ""
	@echo "データベース:"
	@echo "  make db-migrate - マイグレーションを実行"
	@echo "  make db-seed    - 初期データ（管理者ユーザー）を作成"
	@echo ""
	@echo "ngrok制御:"
	@echo "  make ngrok-start - ngrokのみを起動"
	@echo "  make ngrok-stop  - ngrokを停止"
	@echo "  make ngrok-urls  - ngrokのURLを表示"

# ============================================
# ローカル環境 (localhost)
# ============================================
local: stop
	@echo "🚀 ローカル環境で起動中..."
	@sed -i '' 's|CORS_ORIGINS:.*|CORS_ORIGINS: '\''["http://localhost:3000"]'\''|' docker-compose.yml
	@sed -i '' 's|FRONTEND_URL:.*|FRONTEND_URL: http://localhost:3000|' docker-compose.yml
	@sed -i '' 's|NEXT_PUBLIC_API_URL:.*|NEXT_PUBLIC_API_URL: http://localhost:8000|' docker-compose.yml
	@sed -i '' 's|COOKIE_SECURE:.*|COOKIE_SECURE: "false"|' docker-compose.yml
	@sed -i '' 's|COOKIE_SAMESITE:.*|COOKIE_SAMESITE: "lax"|' docker-compose.yml
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
# ngrok公開環境
# ============================================
ngrok: stop ngrok-stop
	@echo "🌐 ngrok経由で公開起動中..."
	@if [ ! -f ngrok.yml ]; then \
		echo "❌ ngrok.yml が見つかりません。authtoken を設定してください。"; \
		echo "   参考: https://dashboard.ngrok.com/get-started/your-authtoken"; \
		exit 1; \
	fi
	@ngrok start --all --config ngrok.yml --log=stdout > /tmp/ngrok_screendeck.log 2>&1 &
	@echo "⏳ ngrok起動を待機中..."
	@for i in 1 2 3 4 5 6 7 8 9 10; do \
		sleep 1; \
		if curl -s http://localhost:4040/api/tunnels | grep -q "public_url"; then \
			break; \
		fi; \
		echo "   待機中... ($$i/10)"; \
	done
	@BACKEND_URL=$$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; d=json.load(sys.stdin); urls=[t['public_url'] for t in d.get('tunnels',[]) if t['name']=='backend']; print(urls[0] if urls else '')"); \
	FRONTEND_URL=$$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; d=json.load(sys.stdin); urls=[t['public_url'] for t in d.get('tunnels',[]) if t['name']=='frontend']; print(urls[0] if urls else '')"); \
	if [ -z "$$BACKEND_URL" ] || [ -z "$$FRONTEND_URL" ]; then \
		echo "❌ ngrokの起動に失敗しました。ログを確認してください:"; \
		echo "   cat /tmp/ngrok_screendeck.log"; \
		exit 1; \
	fi; \
	echo "📡 ngrok URLs:"; \
	echo "   Backend: $$BACKEND_URL"; \
	echo "   Frontend: $$FRONTEND_URL"; \
	sed -i '' "s|CORS_ORIGINS:.*|CORS_ORIGINS: '[\"http://localhost:3000\", \"$$FRONTEND_URL\"]'|" docker-compose.yml; \
	sed -i '' "s|FRONTEND_URL:.*|FRONTEND_URL: $$FRONTEND_URL|" docker-compose.yml; \
	sed -i '' "s|NEXT_PUBLIC_API_URL:.*|NEXT_PUBLIC_API_URL: $$BACKEND_URL|" docker-compose.yml; \
	sed -i '' 's|COOKIE_SECURE:.*|COOKIE_SECURE: "true"|' docker-compose.yml; \
	sed -i '' 's|COOKIE_SAMESITE:.*|COOKIE_SAMESITE: "none"|' docker-compose.yml; \
	docker compose up -d; \
	echo ""; \
	echo "✅ 起動完了"; \
	echo ""; \
	echo "📍 公開URL:"; \
	echo "   フロントエンド: $$FRONTEND_URL"; \
	echo "   バックエンドAPI: $$BACKEND_URL"; \
	echo "   API ドキュメント: $$BACKEND_URL/docs"; \
	echo ""; \
	echo "📱 タブレットからアクセス:"; \
	echo "   $$FRONTEND_URL/admin"; \
	echo ""; \
	echo "🔑 ログイン情報:"; \
	echo "   Email: admin@example.com"; \
	echo "   Password: admin123"

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

clean: stop ngrok-stop
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
# ngrok制御
# ============================================
ngrok-start:
	@echo "🌐 ngrokを起動中..."
	@if [ ! -f ngrok.yml ]; then \
		echo "❌ ngrok.yml が見つかりません"; \
		exit 1; \
	fi
	@ngrok start --all --config ngrok.yml --log=stdout > /tmp/ngrok_screendeck.log 2>&1 &
	@sleep 3
	@make ngrok-urls

ngrok-stop:
	@echo "🛑 ngrokを停止中..."
	@pkill -f "ngrok start" 2>/dev/null || true

ngrok-urls:
	@echo "📡 ngrok URLs:"
	@curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); [print(f'   {t[\"name\"]}: {t[\"public_url\"]}') for t in d.get('tunnels',[])]" 2>/dev/null || echo "   ngrokが起動していません"

# ============================================
# 開発用
# ============================================
shell-backend:
	docker compose exec backend bash

shell-frontend:
	docker compose exec frontend sh

shell-db:
	docker compose exec db psql -U postgres -d screendeck
