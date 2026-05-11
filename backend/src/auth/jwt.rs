use chrono::{Duration, Utc};
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// User role enum matching the database
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Technician,
    Client,
}

impl std::fmt::Display for UserRole {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            UserRole::Admin => write!(f, "admin"),
            UserRole::Technician => write!(f, "technician"),
            UserRole::Client => write!(f, "client"),
        }
    }
}

impl UserRole {
    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "admin" => UserRole::Admin,
            "technician" => UserRole::Technician,
            "client" => UserRole::Client,
            _ => UserRole::Client,
        }
    }
}

/// JWT claims structure
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Claims {
    pub sub: String,       // User ID
    pub email: String,     // User email
    pub role: UserRole,    // User role
    pub name: String,      // Full name
    pub exp: usize,        // Expiration time
    pub iat: usize,        // Issued at
}

/// Create a new JWT token
pub fn create_token(
    user_id: Uuid,
    email: &str,
    role: &str,
    name: &str,
    secret: &str,
    expiration_hours: u64,
) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let exp = now + Duration::hours(expiration_hours as i64);

    let claims = Claims {
        sub: user_id.to_string(),
        email: email.to_string(),
        role: UserRole::from_str(role),
        name: name.to_string(),
        exp: exp.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
}

/// Validate and decode a JWT token
pub fn validate_token(token: &str, secret: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let token_data = decode::<Claims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &Validation::default(),
    )?;

    Ok(token_data.claims)
}

// Axum extractor implementation
use axum::{
    async_trait,
    extract::{FromRequestParts, FromRef},
    http::{request::Parts, StatusCode},
};
use std::sync::Arc;
use crate::AppState;

#[async_trait]
impl<S> FromRequestParts<S> for Claims
where
    S: Send + Sync,
    Arc<AppState>: FromRef<S>,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let app_state = Arc::<AppState>::from_ref(state);
        
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .ok_or((StatusCode::UNAUTHORIZED, "Missing authorization header".to_string()))?;

        if !auth_header.starts_with("Bearer ") {
            return Err((StatusCode::UNAUTHORIZED, "Invalid authorization header".to_string()));
        }

        let token = &auth_header[7..];
        let claims = validate_token(token, &app_state.config.jwt_secret)
            .map_err(|_| (StatusCode::UNAUTHORIZED, "Invalid token".to_string()))?;

        Ok(claims)
    }
}
