#!/usr/bin/env bash
# Usage: ./generate-manifest.sh [output_file]
out="${1:-manifest.txt}"

find . \
  \( -path '*/.*' -o -path './hanzi-writer-data/*' \) -prune -o \
  -type f ! -path "./$out" -print0 \
  | sort -z \
  | xargs -0 sha256sum > "$out"

echo "Manifest written to $out"
