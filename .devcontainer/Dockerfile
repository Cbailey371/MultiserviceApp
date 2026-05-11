FROM rust:1.82-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    postgresql-client \
    curl \
    git \
    sudo \
    fonts-dejavu \
    fontconfig \
    && rm -rf /var/lib/apt/lists/*

# Create vscode user
RUN groupadd --gid 1000 vscode \
    && useradd --uid 1000 --gid 1000 -m vscode \
    && echo "vscode ALL=(ALL) NOPASSWD:ALL" >> /etc/sudoers

# Install Rust tools
RUN rustup component add clippy rustfmt
RUN cargo install sea-orm-cli cargo-watch

# Set working directory
WORKDIR /workspace

USER vscode
