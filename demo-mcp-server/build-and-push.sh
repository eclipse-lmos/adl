#!/bin/bash
# SPDX-FileCopyrightText: 2026 Deutsche Telekom AG and others
#
# SPDX-License-Identifier: Apache-2.0

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
DOCKERFILE="$PROJECT_DIR/Dockerfile"
REGISTRY="${REGISTRY:-ghcr.io/eclipse-lmos}"
IMAGE_NAME="${IMAGE_NAME:-demo-mcp}"
TAG="${TAG:-latest}"
SKIP_PUSH=false
DRY_RUN=false

usage() {
    cat <<EOF
Usage: $(basename "$0") [options]

Build and push the demo MCP server image.

Options:
  --tag TAG         Docker tag to use (default: latest)
  --registry VALUE  Registry/repository prefix (default: ghcr.io/eclipse-lmos)
  --image-name NAME Image name (default: demo-mcp)
  --skip-push       Build the image but do not push it
  --dry-run         Print the commands without executing them
  -h, --help        Show this help message

Environment overrides:
  REGISTRY, IMAGE_NAME, TAG
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --tag)
            TAG="$2"
            shift 2
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --image-name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        --skip-push)
            SKIP_PUSH=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

IMAGE_REF="${REGISTRY}/${IMAGE_NAME}:${TAG}"
BUILD_CMD=(docker build -f "$DOCKERFILE" -t "$IMAGE_REF" "$PROJECT_DIR")
PUSH_CMD=(docker push "$IMAGE_REF")

run_cmd() {
    local -a cmd=("$@")
    printf '>>'
    printf ' %q' "${cmd[@]}"
    printf '\n'

    if [[ "$DRY_RUN" == true ]]; then
        return 0
    fi

    "${cmd[@]}"
}

echo "Building demo-mcp-server image: $IMAGE_REF"
run_cmd "${BUILD_CMD[@]}"

if [[ "$SKIP_PUSH" == true ]]; then
    echo "Skipping push for $IMAGE_REF"
    exit 0
fi

echo "Pushing demo-mcp-server image: $IMAGE_REF"
run_cmd "${PUSH_CMD[@]}"

echo "Done: $IMAGE_REF"

