use axum::Json;
use serde_json::{json, Value};

/// Health check endpoint
pub async fn health_check() -> Json<Value> {
    Json(json!({
        "status": "ok",
        "service": "MultiService Pro API",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}
