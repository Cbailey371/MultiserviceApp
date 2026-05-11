use axum::{extract::{Path, State}, Json};
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use crate::{errors::AppError, AppState};

pub async fn list_users(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    use sea_orm::EntityTrait;
    use crate::models::users::Entity as Users;
    let users = Users::find().all(&state.db).await?;
    Ok(Json(json!({ "data": users, "total": users.len() })))
}

pub async fn get_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::EntityTrait;
    use crate::models::users::Entity as Users;
    let user = Users::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("User not found".into()))?;
    Ok(Json(json!({ "data": user })))
}

pub async fn update_user(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ActiveModelTrait, Set, IntoActiveModel};
    use crate::models::users::Entity as Users;

    let user = Users::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("User not found".into()))?;

    let mut active: crate::models::users::ActiveModel = user.into_active_model();

    if let Some(name) = payload.get("full_name").and_then(|v| v.as_str()) {
        active.full_name = Set(name.to_string());
    }
    if let Some(phone) = payload.get("phone").and_then(|v| v.as_str()) {
        active.phone = Set(Some(phone.to_string()));
    }
    if let Some(active_status) = payload.get("is_active").and_then(|v| v.as_bool()) {
        active.is_active = Set(active_status);
    }
    
    if let Some(role) = payload.get("role").and_then(|v| v.as_str()) {
        active.role = Set(role.to_string());
    }
    
    // Si se envía una nueva contraseña y no está vacía, la encriptamos y la guardamos.
    if let Some(password) = payload.get("password").and_then(|v| v.as_str()) {
        if !password.trim().is_empty() {
            let salt = argon2::password_hash::SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
            let password_hash = argon2::PasswordHasher::hash_password(
                &argon2::Argon2::default(),
                password.as_bytes(),
                &salt,
            )
            .map_err(|e| AppError::Internal(format!("Error cifrando contraseña: {}", e)))?
            .to_string();
            
            active.password_hash = Set(password_hash);
        }
    }

    let updated = active.update(&state.db).await?;
    Ok(Json(json!({ "data": updated, "message": "User updated" })))
}

#[derive(serde::Deserialize)]
pub struct CreateUserRequest {
    pub email: String,
    pub password: Option<String>,
    pub full_name: String,
    pub phone: Option<String>,
    pub role: String,
}

pub async fn create_user(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter, ActiveModelTrait, Set};
    use crate::models::users::{Entity as Users, Column, ActiveModel};

    // Check if email already exists
    let existing = Users::find()
        .filter(Column::Email.eq(&payload.email))
        .one(&state.db)
        .await?;

    if existing.is_some() {
        return Err(AppError::Conflict("Email ya registrado".into()));
    }

    let password = payload.password.unwrap_or_else(|| "temporal123".to_string());

    // Hash password
    let salt = argon2::password_hash::SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
    let password_hash = argon2::PasswordHasher::hash_password(
        &argon2::Argon2::default(),
        password.as_bytes(),
        &salt,
    )
    .map_err(|e| AppError::Internal(format!("Error cifrando contraseña: {}", e)))?
    .to_string();

    let user_id = Uuid::new_v4();

    // Create user
    let new_user = ActiveModel {
        id: Set(user_id),
        email: Set(payload.email.clone()),
        password_hash: Set(password_hash),
        role: Set(payload.role.clone()),
        full_name: Set(payload.full_name.clone()),
        phone: Set(payload.phone.clone()),
        is_active: Set(true),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    new_user.insert(&state.db).await?;

    Ok(Json(json!({
        "message": "Usuario creado correctamente",
        "data": {
            "id": user_id.to_string(),
            "email": payload.email,
            "full_name": payload.full_name,
            "role": payload.role,
        }
    })))
}
