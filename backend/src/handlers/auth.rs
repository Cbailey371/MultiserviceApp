use axum::{extract::State, Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;

use crate::auth::jwt;
use crate::errors::AppError;
use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: String,
    pub phone: Option<String>,
    pub role: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Debug, Serialize)]
pub struct UserInfo {
    pub id: String,
    pub email: String,
    pub full_name: String,
    pub role: String,
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    use crate::models::users::{Entity as Users, Column};

    // Find user by email
    let user = Users::find()
        .filter(Column::Email.eq(&payload.email))
        .one(&state.db)
        .await?
        .ok_or(AppError::Unauthorized)?;

    // Verify password
    let parsed_hash = argon2::PasswordHash::new(&user.password_hash)
        .map_err(|_| AppError::Internal("Password hash error".into()))?;

    argon2::PasswordVerifier::verify_password(
        &argon2::Argon2::default(),
        payload.password.as_bytes(),
        &parsed_hash,
    )
    .map_err(|_| AppError::Unauthorized)?;

    // Check active status
    if !user.is_active {
        return Err(AppError::Forbidden("Account is deactivated".into()));
    }

    // Generate JWT
    let token = jwt::create_token(
        user.id,
        &user.email,
        &user.role,
        &user.full_name,
        &state.config.jwt_secret,
        state.config.jwt_expiration_hours,
    )
    .map_err(|e| AppError::Internal(format!("Token creation failed: {}", e)))?;

    Ok(Json(json!({
        "token": token,
        "user": {
            "id": user.id.to_string(),
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role,
        }
    })))
}

/// POST /api/auth/register
pub async fn register(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<RegisterRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ActiveModelTrait, Set};
    use crate::models::users::{Entity as Users, Column, ActiveModel};

    // Check if email already exists
    let existing = Users::find()
        .filter(Column::Email.eq(&payload.email))
        .one(&state.db)
        .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email already registered".into()));
    }

    // Hash password
    let salt = argon2::password_hash::SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
    let password_hash = argon2::PasswordHasher::hash_password(
        &argon2::Argon2::default(),
        payload.password.as_bytes(),
        &salt,
    )
    .map_err(|e| AppError::Internal(format!("Password hashing failed: {}", e)))?
    .to_string();

    let user_id = Uuid::new_v4();
    let role = payload.role.unwrap_or_else(|| "technician".into());

    // Create user
    let new_user = ActiveModel {
        id: Set(user_id),
        email: Set(payload.email.clone()),
        password_hash: Set(password_hash),
        role: Set(role.clone()),
        full_name: Set(payload.full_name.clone()),
        phone: Set(payload.phone.clone()),
        is_active: Set(true),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    new_user.insert(&state.db).await?;

    // Generate JWT
    let token = jwt::create_token(
        user_id,
        &payload.email,
        &role,
        &payload.full_name,
        &state.config.jwt_secret,
        state.config.jwt_expiration_hours,
    )
    .map_err(|e| AppError::Internal(format!("Token creation failed: {}", e)))?;

    Ok(Json(json!({
        "token": token,
        "user": {
            "id": user_id.to_string(),
            "email": payload.email,
            "full_name": payload.full_name,
            "role": role,
        }
    })))
}
