# --- Stage 1: Build ---
FROM rust:1.77-slim-bookworm as builder

# Install build dependencies
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# Build the application
# Note: In a real CI environment, we would use cargo-chef for better caching
RUN cargo build --release

# --- Stage 2: Runtime ---
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy binary from builder
COPY --from=builder /app/target/release/multiservice-backend /usr/local/bin/multiservice-backend

# Copy static assets (logos, etc) if they exist in a known path
# COPY ./assets /app/assets

# Expose the API port
EXPOSE 3001

# Run the app
CMD ["multiservice-backend"]
