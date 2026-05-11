use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use rust_decimal::Decimal;
use crate::{errors::AppError, AppState};

#[derive(Debug, Deserialize)]
pub struct CreateCatalogItemRequest {
    pub item_type: String,
    pub name: String,
    pub description: Option<String>,
    pub specialty: String,
    pub unit_price: Decimal,
    pub cost_price: Decimal,
    pub unit: String,
}

pub async fn list_items(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    use sea_orm::EntityTrait;
    use crate::models::catalog::Entity as Catalog;
    let items = Catalog::find().all(&state.db).await?;
    Ok(Json(json!({ "data": items, "total": items.len() })))
}

pub async fn create_item(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateCatalogItemRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{ActiveModelTrait, Set};
    use crate::models::catalog::ActiveModel;

    let item = ActiveModel {
        id: Set(Uuid::new_v4()),
        item_type: Set(payload.item_type),
        name: Set(payload.name),
        description: Set(payload.description),
        specialty: Set(payload.specialty),
        unit_price: Set(payload.unit_price),
        cost_price: Set(payload.cost_price),
        unit: Set(payload.unit),
        is_active: Set(true),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };

    let result = item.insert(&state.db).await?;
    Ok(Json(json!({ "data": result, "message": "Item added to catalog" })))
}

pub async fn update_item(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::{EntityTrait, ActiveModelTrait, Set, IntoActiveModel};
    use crate::models::catalog::Entity as Catalog;

    let item = Catalog::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Catalog item not found".into()))?;

    let mut active = item.into_active_model();

    if let Some(v) = payload.get("name").and_then(|v| v.as_str()) {
        active.name = Set(v.to_string());
    }
    if let Some(v) = payload.get("unit_price").and_then(|v| v.as_f64()) {
        active.unit_price = Set(Decimal::from_f64_retain(v).unwrap_or(active.unit_price.unwrap()));
    }

    let updated = active.update(&state.db).await?;
    Ok(Json(json!({ "data": updated })))
}
