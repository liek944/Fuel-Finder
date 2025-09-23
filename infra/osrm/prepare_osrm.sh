#!/usr/bin/env bash
set -euo pipefail

# This script prepares OSRM data using the official Docker image.
# Usage:
#   ./prepare_osrm.sh <geofabrik-pbf-url>
# or place your .osm.pbf at infra/osrm/data/region.osm.pbf and run:
#   ./prepare_osrm.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/data"
mkdir -p "$DATA_DIR"

PBF_URL="${1:-}"
if [[ -n "$PBF_URL" ]]; then
  echo "Downloading OSM extract from: $PBF_URL"
  curl -L "$PBF_URL" -o "$DATA_DIR/region.osm.pbf"
fi

if [[ ! -f "$DATA_DIR/region.osm.pbf" ]]; then
  echo "ERROR: No PBF found at $DATA_DIR/region.osm.pbf and no URL provided."
  echo "Usage: $0 <geofabrik-pbf-url>  # or put your .osm.pbf as data/region.osm.pbf"
  exit 1
fi

echo "Running osrm-extract (car profile)..."
docker run --rm -t -v "$DATA_DIR":/data osrm/osrm-backend \
  osrm-extract -p /opt/car.lua /data/region.osm.pbf

echo "Running osrm-partition (MLD)..."
docker run --rm -t -v "$DATA_DIR":/data osrm/osrm-backend \
  osrm-partition /data/region.osrm

echo "Running osrm-customize (MLD)..."
docker run --rm -t -v "$DATA_DIR":/data osrm/osrm-backend \
  osrm-customize /data/region.osrm

echo "✅ OSRM data ready at $DATA_DIR"
echo "To start the stack:"
echo "  cd $SCRIPT_DIR && docker compose up -d"
