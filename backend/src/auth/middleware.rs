use axum::{
    extract::Request,
    http::{header, StatusCode},
    middleware::Next,
    response::Response,
};

use super::jwt;
use crate::AppState;
use std::sync::Arc;

/// Middleware that requires a valid JWT token
pub async fn require_auth(
    request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = request
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok());

    let token = match auth_header {
        Some(h) if h.starts_with("Bearer ") => &h[7..],
        _ => return Err(StatusCode::UNAUTHORIZED),
    };

    // Get state from request extensions
    let state = request
        .extensions()
        .get::<Arc<AppState>>()
        .cloned();

    let secret = match &state {
        Some(s) => s.config.jwt_secret.clone(),
        None => {
            // Fallback to env var
            std::env::var("JWT_SECRET").unwrap_or_default()
        }
    };

    match jwt::validate_token(token, &secret) {
        Ok(claims) => {
            // Store claims in request extensions for handlers to use
            let mut request = request;
            request.extensions_mut().insert(claims);
            Ok(next.run(request).await)
        }
        Err(_) => Err(StatusCode::UNAUTHORIZED),
    }
}

/// Extract claims from request extensions
pub fn extract_claims(extensions: &axum::http::Extensions) -> Option<jwt::Claims> {
    extensions.get::<jwt::Claims>().cloned()
}
