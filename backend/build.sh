#!/usr/bin/env bash
# Render build script for Surya Restaurant Backend
set -o errexit

pip install --upgrade pip
pip install -r requirements.txt

echo "Build complete!"
