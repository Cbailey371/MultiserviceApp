use axum::{extract::{State, Multipart}, Json};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use std::collections::HashMap;

use crate::errors::AppError;
use crate::AppState;

use sea_orm::{EntityTrait, ActiveModelTrait, Set, QueryFilter, ColumnTrait};
use crate::models::settings::{Entity as Settings, Column, ActiveModel};

#[derive(Debug, Deserialize)]
pub struct UpdateSettingsRequest {
    pub settings: HashMap<String, String>,
}

#[derive(Debug, Serialize)]
pub struct SettingItem {
    pub key: String,
    pub value: Option<String>,
}

/// GET /api/settings
pub async fn get_settings(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, AppError> {
    let settings = Settings::find().all(&state.db).await?;
    
    let mut result_map = HashMap::new();
    for s in settings {
        result_map.insert(s.key, s.value);
    }

    Ok(Json(json!({
        "data": result_map
    })))
}

/// PUT /api/settings
pub async fn update_settings(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<UpdateSettingsRequest>,
) -> Result<Json<Value>, AppError> {
    
    for (key, value) in payload.settings {
        let existing = Settings::find()
            .filter(Column::Key.eq(&key))
            .one(&state.db)
            .await?;

        if let Some(mut db_setting) = existing {
            let mut active: ActiveModel = db_setting.into();
            active.value = Set(Some(value));
            active.updated_at = Set(chrono::Utc::now().naive_utc());
            active.update(&state.db).await?;
        } else {
            let new_setting = ActiveModel {
                id: Set(Uuid::new_v4()),
                key: Set(key),
                value: Set(Some(value)),
                description: Set(None),
                updated_at: Set(chrono::Utc::now().naive_utc()),
                ..Default::default()
            };
            new_setting.insert(&state.db).await?;
        }
    }

    Ok(Json(json!({
        "message": "Configuraciones actualizadas correctamente"
    })))
}
pub async fn upload_logo(
    State(state): State<Arc<AppState>>,
    mut multipart: Multipart,
) -> Result<Json<Value>, AppError> {
    let mut filename = String::new();
    let mut data = Vec::new();

    while let Some(field) = multipart.next_field().await.map_err(|e| AppError::Internal(e.to_string()))? {
        let name = field.name().unwrap_or_default().to_string();
        if name == "file" {
            let original_filename = field.file_name().unwrap_or("logo.png").to_string();
            let extension = std::path::Path::new(&original_filename)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("png");
            
            filename = format!("company_logo.{}", extension);
            data = field.bytes().await.map_err(|e| AppError::Internal(e.to_string()))?.to_vec();
        }
    }

    if data.is_empty() {
        return Err(AppError::Validation("No se proporcionó ninguna imagen".into()));
    }

    // Guardar el archivo usando el StorageService
    // Guardamos en un subdirectorio "branding"
    let relative_path = format!("branding/{}", filename);
    state.storage.save_file(&relative_path, &data).await?;

    // Actualizar la configuración 'company_logo' con la URL relativa
    // Usamos el prefijo /api/uploads/
    let logo_url = format!("/api/uploads/{}", relative_path);
    
    let existing = Settings::find()
        .filter(Column::Key.eq("company_logo"))
        .one(&state.db)
        .await?;

    if let Some(db_setting) = existing {
        let mut active: ActiveModel = db_setting.into();
        active.value = Set(Some(logo_url.clone()));
        active.updated_at = Set(chrono::Utc::now().naive_utc());
        active.update(&state.db).await?;
    } else {
        let new_setting = ActiveModel {
            id: Set(Uuid::new_v4()),
            key: Set("company_logo".to_string()),
            value: Set(Some(logo_url.clone())),
            updated_at: Set(chrono::Utc::now().naive_utc()),
            ..Default::default()
        };
        new_setting.insert(&state.db).await?;
    }

    Ok(Json(json!({
        "message": "Logo cargado correctamente",
        "url": logo_url
    })))
}

#[derive(Debug, Deserialize)]
pub struct TestEmailRequest {
    pub smtp_settings: HashMap<String, String>,
    pub test_email: String,
}

pub async fn test_email(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<TestEmailRequest>,
) -> Result<Json<Value>, AppError> {
    let email_service = state.email.as_ref()
        .ok_or(AppError::Internal("Servicio de correo no inicializado".into()))?;

    email_service.send_test_email(&payload.test_email, &payload.smtp_settings).await?;

    Ok(Json(json!({
        "message": format!("Correo de prueba enviado correctamente a {}", payload.test_email)
    })))
}
