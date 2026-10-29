#!/usr/bin/env bash
# Deterministic asset conversion: keep the full approved artwork, aspect and colors.
# Requires ImageMagick 7 for regeneration only; the app has no new dependency.
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source_path="$project_dir/assets/branding/hmkblogo001.png"
output_dir="$project_dir/assets/icons"
mkdir -p "$output_dir"

render() {
  local canvas_size="$1" artwork_size="$2" filename="$3"
  magick "$source_path" -filter Lanczos -resize "${artwork_size}x${artwork_size}" \
    -background '#212227' -gravity center -extent "${canvas_size}x${canvas_size}" \
    -alpha off -depth 8 -strip -define png:compression-level=9 \
    -define png:compression-filter=5 -define png:compression-strategy=1 \
    -define png:exclude-chunks=all "PNG24:$output_dir/$filename"
}

render 192 180 hmkb-icon-v2-192.png
render 512 480 hmkb-icon-v2-512.png
# Additional padding keeps the full kettlebell/hand inside the maskable safe circle.
render 512 448 hmkb-maskable-v2-512.png
render 180 168 hmkb-apple-touch-v2-180.png
render 32 30 hmkb-favicon-v2-32.png
