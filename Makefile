PROJECT_NAME = ft_transcendence
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
				browser-image-compression \
				--save-dev @types/passport-google-oauth20 \
				passport-google-oauth20

all: up

up:
	@echo "Starting project..."
	@docker compose up || (echo "\n[!] Error: Failed to start. Try running 'make install-deps' to ensure all packages are installed." && exit 1)

down:
	@docker compose down

build:
	@docker compose build

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
	@docker system prune -a --volumes -f
	@find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

re: fclean install-deps up

help:
	@echo "Available commands:"
	@echo "  make              - Start the project. If it fails, run 'make install-deps'"
	@echo "  make install-deps - Install backend dependencies if missing"
	@echo "  make clean-docker - Clean cache and unused Docker items if running out of space"
	@echo "  make fclean       - Deep clean (Docker + local node_modules)"
	@echo "  make re           - Reset completely"

.PHONY: all up down build install-deps clean-docker fclean re help