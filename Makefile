PROJECT_NAME = ft_transcendance
BACKEND_PACKS = @nestjs/passport \
                @nestjs/jwt \
                passport \
                passport-local \
                passport-jwt \
                passport-google-oauth20 \
                bcrypt \
                @nestjs/config \
                @nestjs/platform-express \
                multer \
				@nestjs/websockets \
                @nestjs/platform-socket.io \
                socket.io \
				@types/passport-google-oauth20 \
				browser-image-compression \
				resend

CERT_DIR = nginx/certs
CLOUDFLARED = ./cloudflared
TUNNEL_NAME = transcendance

all: host-deps up

up: cloudflared
	@bash scripts/createCertSSL.sh
	@echo "Starting project..."
	@docker compose up || (echo "\n[!] Error: Failed to start. Try running 'make install-deps' to ensure all packages are installed." && exit 1)

down:
	@docker compose down

build:
	@docker compose build

host-deps:
	@echo "Installing host node_modules..."
	@npm install

install-deps:
	@echo "Installing dependencies... (This might take a while)"
	@docker compose run --rm backend npm install $(BACKEND_PACKS) || (echo "\n[!] Error: Installation failed. If it's a 'no space' error, run 'make clean-docker' first." && exit 1)
	@docker compose run --rm backend npx prisma generate
	@docker compose run --rm backend npx prisma migrate deploy

clean-docker:
	@echo "Cleaning Docker cache, unused items..."
	@docker system prune -a --volumes -f
	@echo "\n[+] Cleanup finished. You should have more disk space now."

fclean: down
	-@docker system prune -a --volumes -f
	-@find . -name "node_modules" -type d -prune -exec rm -rf '{}' +
	-@rm -f $(CERT_DIR)/fullchain.crt $(CERT_DIR)/privkey.key

defclean:
	@docker compose down -v --remove-orphans
	@$(MAKE) fclean

cloudflared:
	@bash scripts/cloudflared.sh || (echo "\n[!] Error: Failed to set up cloudflared. Check your internet connection." && exit 1)

tunnel: cloudflared
	@$(CLOUDFLARED) tunnel run $(TUNNEL_NAME)

jwt-secrets:
	@bash scripts/generateJwtSecrets.sh

jwt-secrets-force:
	@bash scripts/generateJwtSecrets.sh -f

re: fclean install-deps host-deps up

help:
	@echo "Available commands:"
	@echo "  make              - Start the project. If it fails, run 'make install-deps'"
	@echo "  make install-deps - Install backend dependencies if missing"
	@echo "  make host-deps    - Install node_modules on your machine (editor autocomplete/types)"
	@echo "  make clean-docker - Clean cache and unused Docker items if running out of space"
	@echo "  make fclean       - Deep clean (Docker + local node_modules)"
	@echo "  make re           - Reset completely"
	@echo "  make tunnel       - Run the Cloudflare tunnel (needs ~/.cloudflared/config.yml set up)"
	@echo "  make jwt-secrets       - Generate .env (from .env.example if missing) and fill in JWT secrets"
	@echo "  make jwt-secrets-force - Force-regenerate your own JWT secrets (logs you out of your own instance)"

.PHONY: all up down build install-deps host-deps clean-docker fclean defclean re help cloudflared tunnel jwt-secrets jwt-secrets-force