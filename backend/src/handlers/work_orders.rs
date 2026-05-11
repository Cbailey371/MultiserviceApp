use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use sea_orm::*;

use crate::auth::jwt::Claims;
use crate::errors::AppError;
use crate::AppState;
use crate::models::work_orders::{Entity as WorkOrder, ActiveModel as WorkOrderActive};

#[derive(Debug, Deserialize)]
pub struct CreateWorkOrderRequest {
    pub client_id: Uuid,
    pub location_id: Option<Uuid>,
    pub assigned_to: Uuid,
    pub quotation_id: Option<Uuid>,
    pub work_type: String,
    pub specialty: String,
    pub priority: Option<String>,
    pub scheduled_date: String,
    pub scheduled_time_start: Option<String>,
    pub scheduled_time_end: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateWorkOrderRequest {
    pub status: Option<String>,
    pub assigned_to: Option<Uuid>,
    pub priority: Option<String>,
    pub scheduled_date: Option<String>,
    pub technician_notes: Option<String>,
    pub description: Option<String>,
}

/// GET /api/work-orders
pub async fn list_work_orders(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
) -> Result<Json<Value>, AppError> {
    let orders = WorkOrder::find()
        .order_by_desc(crate::models::work_orders::Column::ScheduledDate)
        .all(&state.db)
        .await?;

    Ok(Json(json!({ "data": orders, "total": orders.len() })))
}

/// POST /api/work-orders
pub async fn create_work_order(
    State(state): State<Arc<AppState>>,
    claims: Claims,
    Json(payload): Json<CreateWorkOrderRequest>,
) -> Result<Json<Value>, AppError> {
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Internal("Invalid user ID".into()))?;

    let wo_count = WorkOrder::find().count(&state.db).await?;
    let wo_number = format!("OT-{:05}", wo_count + 1);

    let scheduled_date = chrono::NaiveDate::parse_from_str(&payload.scheduled_date, "%Y-%m-%d")
        .map_err(|_| AppError::Validation("Invalid date format, use YYYY-MM-DD".into()))?;

    let time_start = payload.scheduled_time_start.as_ref().and_then(|t| {
        chrono::NaiveTime::parse_from_str(t, "%H:%M").ok()
    });
    let time_end = payload.scheduled_time_end.as_ref().and_then(|t| {
        chrono::NaiveTime::parse_from_str(t, "%H:%M").ok()
    });

    let wo = WorkOrderActive {
        id: Set(Uuid::new_v4()),
        wo_number: Set(wo_number),
        client_id: Set(payload.client_id),
        location_id: Set(payload.location_id),
        assigned_to: Set(payload.assigned_to),
        created_by: Set(user_id),
        contract_schedule_id: Set(None),
        quotation_id: Set(payload.quotation_id),
        work_type: Set(payload.work_type),
        specialty: Set(payload.specialty),
        priority: Set(payload.priority.unwrap_or_else(|| "medium".into())),
        status: Set("pending".to_string()),
        scheduled_date: Set(scheduled_date),
        scheduled_time_start: Set(time_start),
        scheduled_time_end: Set(time_end),
        started_at: Set(None),
        completed_at: Set(None),
        description: Set(payload.description),
        technician_notes: Set(None),
        client_signature: Set(None),
        report_pdf_path: Set(None),
        created_at: Set(chrono::Utc::now().naive_utc()),
    };

    let result = wo.insert(&state.db).await?;

    Ok(Json(json!({ "data": result, "message": "Work order created successfully" })))
}

/// GET /api/work-orders/:id
pub async fn get_work_order(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    let wo = WorkOrder::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound("Work order not found".into()))?;

    Ok(Json(json!({ "data": wo })))
}

/// PUT /api/work-orders/:id
pub async fn update_work_order(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateWorkOrderRequest>,
) -> Result<Json<Value>, AppError> {
    let existing = WorkOrder::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound("Work order not found".into()))?;

    let mut update = WorkOrderActive {
        id: Set(id),
        ..Default::default()
    };

    if let Some(status) = &payload.status {
        update.status = Set(status.clone());
        // Auto-set started_at on first "in_progress"
        if status == "in_progress" && existing.started_at.is_none() {
            update.started_at = Set(Some(chrono::Utc::now().naive_utc()));
        }
    }

    if let Some(assigned) = payload.assigned_to {
        update.assigned_to = Set(assigned);
    }
    if let Some(priority) = &payload.priority {
        update.priority = Set(priority.clone());
    }
    if let Some(date) = &payload.scheduled_date {
        if let Ok(d) = chrono::NaiveDate::parse_from_str(date, "%Y-%m-%d") {
            update.scheduled_date = Set(d);
        }
    }
    if let Some(notes) = &payload.technician_notes {
        update.technician_notes = Set(Some(notes.clone()));
    }
    if let Some(desc) = &payload.description {
        update.description = Set(Some(desc.clone()));
    }

    let result = update.update(&state.db).await?;

    Ok(Json(json!({ "data": result, "message": "Work order updated" })))
}

/// POST /api/work-orders/:id/complete
pub async fn complete(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    let _existing = WorkOrder::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound("Work order not found".into()))?;

    let mut update = WorkOrderActive {
        id: Set(id),
        ..Default::default()
    };
    update.status = Set("completed".to_string());
    update.completed_at = Set(Some(chrono::Utc::now().naive_utc()));

    let result = update.update(&state.db).await?;

    Ok(Json(json!({ "data": result, "message": "Work order completed" })))
}

/// POST /api/work-orders/:id/photos (stub — requires file storage)
pub async fn upload_photo(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(json!({ "message": "Photo upload coming in Phase 4" })))
}

/// POST /api/work-orders/:id/sign (stub — requires signature pad)
pub async fn client_signature(
    State(_state): State<Arc<AppState>>,
    Path(_id): Path<Uuid>,
    Json(_payload): Json<Value>,
) -> Result<Json<Value>, AppError> {
    Ok(Json(json!({ "message": "Digital signature coming in Phase 4" })))
}
