use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use crate::{errors::AppError, AppState};

#[derive(Debug, Deserialize)]
pub struct CreateClientRequest {
    pub client_type: String, // "business" | "residential"
    pub company_name: Option<String>,
    pub tax_id: Option<String>,
    pub tax_dv: Option<String>,
    pub contact_name: String,
    pub email: Option<String>,
    pub phone: String,
    pub phone_alt: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateLocationRequest {
    pub label: String,
    pub address: String,
    pub city: Option<String>,
    pub province: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub is_primary: Option<bool>,
}

pub async fn list_clients(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    use sea_orm::EntityTrait;
    use crate::models::clients::Entity as Clients;
    let clients = Clients::find().all(&state.db).await?;
    Ok(Json(json!({ "data": clients, "total": clients.len() })))
}

pub async fn create_client(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateClientRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{ActiveModelTrait, Set};
    use crate::models::clients::ActiveModel;

    let client_id = Uuid::new_v4();
    let new_client = ActiveModel {
        id: Set(client_id),
        client_type: Set(payload.client_type),
        company_name: Set(payload.company_name),
        tax_id: Set(payload.tax_id),
        tax_dv: Set(payload.tax_dv),
        contact_name: Set(payload.contact_name),
        email: Set(payload.email),
        phone: Set(payload.phone),
        phone_alt: Set(payload.phone_alt),
        notes: Set(payload.notes),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    let client = new_client.insert(&state.db).await?;
    Ok(Json(json!({ "data": client, "message": "Client created" })))
}

pub async fn get_client(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    use crate::models::clients::Entity as Clients;
    use crate::models::client_locations::{Entity as Locations, Column as LocColumn};
    use crate::models::assets::{Entity as Assets, Column as AssetColumn};

    let client = Clients::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Client not found".into()))?;

    let locations = Locations::find()
        .filter(LocColumn::ClientId.eq(id))
        .all(&state.db)
        .await?;

    let assets = Assets::find()
        .filter(AssetColumn::ClientId.eq(id))
        .all(&state.db)
        .await?;

    Ok(Json(json!({
        "data": client,
        "locations": locations,
        "assets": assets,
        "asset_count": assets.len(),
    })))
}

pub async fn update_client(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ActiveModelTrait, Set, IntoActiveModel};
    use crate::models::clients::Entity as Clients;

    let client = Clients::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Client not found".into()))?;

    let mut active = client.into_active_model();

    if let Some(v) = payload.get("contact_name").and_then(|v| v.as_str()) {
        active.contact_name = Set(v.to_string());
    }
    if let Some(v) = payload.get("phone").and_then(|v| v.as_str()) {
        active.phone = Set(v.to_string());
    }
    if let Some(v) = payload.get("email").and_then(|v| v.as_str()) {
        active.email = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("company_name").and_then(|v| v.as_str()) {
        active.company_name = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("tax_id").and_then(|v| v.as_str()) {
        active.tax_id = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("tax_dv").and_then(|v| v.as_str()) {
        active.tax_dv = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("client_type").and_then(|v| v.as_str()) {
        active.client_type = Set(v.to_string());
    }
    if let Some(v) = payload.get("phone_alt").and_then(|v| v.as_str()) {
        active.phone_alt = Set(Some(v.to_string()));
    }
    if let Some(v) = payload.get("notes").and_then(|v| v.as_str()) {
        active.notes = Set(Some(v.to_string()));
    }

    let updated = active.update(&state.db).await?;
    Ok(Json(json!({ "data": updated, "message": "Client updated" })))
}

pub async fn delete_client(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ModelTrait};
    use crate::models::clients::Entity as Clients;

    let client = Clients::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Client not found".into()))?;

    client.delete(&state.db).await?;
    Ok(Json(json!({ "message": "Client deleted" })))
}

pub async fn list_locations(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ColumnTrait, QueryFilter};
    use crate::models::client_locations::{Entity as Locations, Column};

    let locations = Locations::find()
        .filter(Column::ClientId.eq(id))
        .all(&state.db)
        .await?;

    Ok(Json(json!({ "data": locations })))
}

pub async fn create_location(
    State(state): State<Arc<AppState>>,
    Path(client_id): Path<Uuid>,
    Json(payload): Json<CreateLocationRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{ActiveModelTrait, Set};
    use crate::models::client_locations::ActiveModel;

    let location = ActiveModel {
        id: Set(Uuid::new_v4()),
        client_id: Set(client_id),
        label: Set(payload.label),
        address: Set(payload.address),
        city: Set(payload.city),
        province: Set(payload.province),
        latitude: Set(payload.latitude),
        longitude: Set(payload.longitude),
        is_primary: Set(payload.is_primary.unwrap_or(false)),
        ..Default::default()
    };

    let loc = location.insert(&state.db).await?;
    Ok(Json(json!({ "data": loc, "message": "Location created" })))
}
