#!/bin/sh
# Entrypoint script for Attractor container

# Ensure logs and checkpoints directories exist
mkdir -p /app/logs /app/checkpoints /app/data/artifacts /app/data/state

echo "Starting Attractor server..."

# Execute the main command
exec "$@"
