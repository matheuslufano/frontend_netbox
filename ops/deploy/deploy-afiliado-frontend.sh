#!/usr/bin/env bash

set -Eeuo pipefail

APP_ROOT="/home/netbox/afiliado-frontend"
RELEASES_DIR="/home/netbox/afiliado-frontend-releases"
CURRENT_LINK="/home/netbox/afiliado-frontend-current"
REPO_URL="https://github.com/matheuslufano/frontend_netbox.git"
CONTAINER_NAME="afiliado-frontend"

export XDG_RUNTIME_DIR="/run/user/$(id -u)"
export DOCKER_HOST="unix://$XDG_RUNTIME_DIR/docker.sock"

remote_sha="$(git ls-remote "$REPO_URL" refs/heads/main | awk '{print $1}')"
release="$RELEASES_DIR/$remote_sha"
image="afiliado-frontend:$remote_sha"

mkdir -p "$RELEASES_DIR"
rm -rf "$release"
git clone --depth 1 --branch main "$REPO_URL" "$release"

cp "$APP_ROOT/Dockerfile" "$release/Dockerfile"
cp "$APP_ROOT/.env" "$release/.env"
sed -i '1s/^\xEF\xBB\xBF//' "$release/.env"
sed -i 's/\r$//' "$release/.env"

env_value() {
  awk -v wanted="$1" '
    index($0, wanted "=") == 1 {
      value = substr($0, length(wanted) + 2)
      gsub(/\r$/, "", value)
      if (value ~ /^".*"$/ || value ~ /^\047.*\047$/) {
        value = substr(value, 2, length(value) - 2)
      }
      print value
      exit
    }
  ' "$release/.env"
}

BACKEND_URL="$(env_value BACKEND_URL)"
NEXT_PUBLIC_API_URL="$(env_value NEXT_PUBLIC_API_URL)"
NEXT_PUBLIC_LANDING_PAGE_URL="$(env_value NEXT_PUBLIC_LANDING_PAGE_URL)"

docker build \
  --build-arg "BACKEND_URL=${BACKEND_URL:-http://72.62.8.85:3001}" \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-/api-backend}" \
  --build-arg "NEXT_PUBLIC_LANDING_PAGE_URL=${NEXT_PUBLIC_LANDING_PAGE_URL:-}" \
  -t "$image" \
  "$release"

previous_image="$(docker inspect "$CONTAINER_NAME" --format '{{.Config.Image}}' 2>/dev/null || true)"

rollback() {
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
  docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true
  if [ -n "$previous_image" ]; then
    docker run -d \
      --name "$CONTAINER_NAME" \
      --restart unless-stopped \
      --env-file "$APP_ROOT/.env" \
      -p 127.0.0.1:3000:3000 \
      -p 127.0.0.1:3002:3000 \
      "$previous_image"
  fi
  exit 1
}

docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker run -d \
  --name "$CONTAINER_NAME" \
  --restart unless-stopped \
  --env-file "$release/.env" \
  -p 127.0.0.1:3000:3000 \
  -p 127.0.0.1:3002:3000 \
  "$image" || rollback

healthy=false
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/ >/dev/null 2>&1; then
    healthy=true
    break
  fi
  sleep 2
done

if [ "$healthy" != true ]; then
  docker logs --tail 100 "$CONTAINER_NAME" 2>&1 || true
  rollback
fi

ln -sfn "$release" "$CURRENT_LINK"

mapfile -t old_releases < <(ls -1dt "$RELEASES_DIR"/* 2>/dev/null | tail -n +6)
if [ "${#old_releases[@]}" -gt 0 ]; then
  rm -rf -- "${old_releases[@]}"
fi

echo "Deploy do frontend $remote_sha concluido com sucesso."
