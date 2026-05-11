use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use crate::{errors::AppError, AppState};

#[derive(Debug, Deserialize)]
pub struct CreateAssetRequest {
    pub client_id: Uuid,
    pub location_id: Option<Uuid>,
    pub specialty: String,
    pub asset_type: Option<String>,
    pub brand: Option<String>,
    pub model: Option<String>,
    pub serial_number: Option<String>,
    pub capacity_btu: Option<i32>,
    pub capacity_electrical: Option<String>,
    pub installation_date: Option<String>,
    pub notes: Option<String>,
}

pub async fn list_assets(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    use sea_orm::EntityTrait;
    use crate::models::assets::Entity as Assets;
    let assets = Assets::find().all(&state.db).await?;
    Ok(Json(json!({ "data": assets, "total": assets.len() })))
}

pub async fn create_asset(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateAssetRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{ActiveModelTrait, Set};
    use crate::models::assets::ActiveModel;

    let asset = ActiveModel {
        id: Set(Uuid::new_v4()),
        client_id: Set(payload.client_id),
        location_id: Set(payload.location_id),
        specialty: Set(payload.specialty),
        asset_type: Set(payload.asset_type),
        brand: Set(payload.brand),
        model_name: Set(payload.model),
        serial_number: Set(payload.serial_number),
        capacity_btu: Set(payload.capacity_btu),
        capacity_electrical: Set(payload.capacity_electrical),
        installation_date: Set(None),
        warranty_expiry: Set(None),
        status: Set("active".to_string()),
        custom_fields: Set(None),
        notes: Set(payload.notes),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    let result = asset.insert(&state.db).await?;
    Ok(Json(json!({ "data": result, "message": "Asset created" })))
}

pub async fn get_asset(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::EntityTrait;
    use crate::models::assets::Entity as Assets;
    let asset = Assets::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Asset not found".into()))?;
    Ok(Json(json!({ "data": asset })))
}

pub async fn update_asset(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ActiveModelTrait, Set, IntoActiveModel};
    use crate::models::assets::Entity as Assets;

    let asset = Assets::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Asset not found".into()))?;

    let mut active = asset.into_active_model();

    if let Some(v) = payload.get("specialty").and_then(|v| v.as_str()) {
        active.specialty = Set(v.to_string());
    }
    if let Some(v) = payload.get("asset_type").and_then(|v| v.as_str()) {
        active.asset_type = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("brand").and_then(|v| v.as_str()) {
        active.brand = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("model").and_then(|v| v.as_str()) {
        active.model_name = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("serial_number").and_then(|v| v.as_str()) {
        active.serial_number = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("capacity_btu").and_then(|v| v.as_i64()) {
        active.capacity_btu = Set(Some(v as i32));
    }
    if let Some(v) = payload.get("notes").and_then(|v| v.as_str()) {
        active.notes = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("status").and_then(|v| v.as_str()) {
        active.status = Set(v.to_string());
    }

    let updated = active.update(&state.db).await?;
    Ok(Json(json!({ "data": updated, "message": "Asset updated" })))
}

pub async fn get_history(
    State(_state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    // TODO: Implement asset history
    Ok(Json(json!({ "data": [], "asset_id": id.to_string() })))
}
