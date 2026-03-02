#!/bin/bash
# https://github.com/PlasmaPower/musig-nano
# Produces a musig_nano.wasm.b64 file
docker run --rm -i ubuntu:focal > musig_nano.wasm.b64 <<EOF
bash >&2 <<BUILD
set -e
apt-get update
apt-get install -y curl git gcc wabt=1.0.13-1build1
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s - -q -y -t wasm32-wasi --default-toolchain 1.49.0
source ~/.cargo/env
cd /root
git clone https://github.com/PlasmaPower/musig-nano.git
cd musig-nano
git checkout 7ab8c8d0dcc604cab72f0d28e6ec5ca19851b156
cargo build --target wasm32-wasi --release --features wasm
wasm-strip target/wasm32-wasi/release/musig_nano.wasm
BUILD
cat /root/musig-nano/target/wasm32-wasi/release/musig_nano.wasm | base64
EOF
