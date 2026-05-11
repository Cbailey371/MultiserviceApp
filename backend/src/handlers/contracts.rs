use axum::{extract::{Path, State}, Json};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use chrono::{NaiveDate, Utc};
use rust_decimal::Decimal;

use crate::{errors::AppError, AppState};
use crate::models::contracts::{Entity as Contract, ActiveModel as ContractActive};
use crate::models::contract_schedules::{Entity as Schedule, ActiveModel as ScheduleActive};
use crate::models::clients::Entity as Client;

#[derive(Debug, Deserialize)]
pub struct CreateContractRequest {
    pub client_id: Uuid,
    pub specialty: String,
    pub frequency: String,
    pub start_date: String,
    pub end_date: String,
    pub monthly_price: Decimal,
    pub visits_per_period: i32,
    pub scope_of_work: Option<String>,
    pub notes: Option<String>,
    pub generate_schedules: Option<bool>,
}

#[derive(Debug, Serialize)]
pub struct ContractList {
    pub id: Uuid,
    pub contract_number: String,
    pub client_name: String,
    pub specialty: String,
    pub frequency: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub monthly_price: Decimal,
    pub status: String,
}

/// GET /api/contracts
pub async fn list_contracts(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, AppError> {
    let contracts = Contract::find()
        .find_also_related(Client)
        .order_by_desc(crate::models::contracts::Column::CreatedAt)
        .all(&state.db)
        .await?;

    let result: Vec<Value> = contracts.into_iter().map(|(c, client)| {
        json!({
            "id": c.id,
            "contract_number": c.contract_number,
            "client_id": c.client_id,
            "client_name": client.map(|cl| cl.company_name.unwrap_or(cl.contact_name)).unwrap_or_else(|| "Desconocido".to_string()),
            "specialty": c.specialty,
            "frequency": c.frequency,
            "start_date": c.start_date,
            "end_date": c.end_date,
            "monthly_price": c.monthly_price,
            "visits_per_period": c.visits_per_period,
            "status": c.status,
            "created_at": c.created_at,
        })
    }).collect();

    Ok(Json(json!({ "data": result, "total": result.len() })))
}

/// POST /api/contracts
pub async fn create_contract(
    State(state): State<Arc<AppState>>,
    Json(payload): Json<CreateContractRequest>,
) -> Result<Json<Value>, AppError> {
    let txn = state.db.begin().await?;

    let start_date = NaiveDate::parse_from_str(&payload.start_date, "%Y-%m-%d")
        .map_err(|_| AppError::Validation("Fecha de inicio inválida".into()))?;
    let end_date = NaiveDate::parse_from_str(&payload.end_date, "%Y-%m-%d")
        .map_err(|_| AppError::Validation("Fecha de fin inválida".into()))?;

    // Number generation
    let count = Contract::find().count(&txn).await?;
    let contract_number = format!("CTR-{:05}", count + 1);

    let contract_id = Uuid::new_v4();

    let contract = ContractActive {
        id: Set(contract_id),
        contract_number: Set(contract_number),
        client_id: Set(payload.client_id),
        specialty: Set(payload.specialty),
        frequency: Set(payload.frequency),
        start_date: Set(start_date),
        end_date: Set(end_date),
        monthly_price: Set(payload.monthly_price),
        visits_per_period: Set(payload.visits_per_period),
        status: Set("active".to_string()),
        scope_of_work: Set(payload.scope_of_work),
        notes: Set(payload.notes),
        created_at: Set(Utc::now().naive_utc()),
    };

    let result = contract.insert(&txn).await?;

    // Optionally generate schedules
    if payload.generate_schedules.unwrap_or(false) {
        // Logic to generate schedules based on frequency
        // For now, let's just add one at the start date as placeholder
        let schedule = ScheduleActive {
            id: Set(Uuid::new_v4()),
            contract_id: Set(contract_id),
            scheduled_date: Set(start_date),
            status: Set("pending".to_string()),
            ..Default::default()
        };
        schedule.insert(&txn).await?;
    }

    txn.commit().await?;

    Ok(Json(json!(result)))
}

/// GET /api/contracts/:id
pub async fn get_contract(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    let contract = Contract::find_by_id(id)
        .find_also_related(Client)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Contrato no encontrado".into()))?;

    let (c, client) = contract;
    
    let schedules = Schedule::find()
        .filter(crate::models::contract_schedules::Column::ContractId.eq(id))
        .all(&state.db)
        .await?;

    Ok(Json(json!({
        "contract": c,
        "client": client,
        "schedules": schedules
    })))
}

/// PATCH /api/contracts/:id
pub async fn update_contract(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
    Json(payload): Json<Value>,
) -> Result<Json<Value>, AppError> {
    let contract = Contract::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Contrato no encontrado".into()))?;

    let mut active_model: ContractActive = contract.into();

    if let Some(client_id) = payload.get("client_id").and_then(|v| v.as_str()) {
        if let Ok(uid) = Uuid::parse_str(client_id) {
            active_model.client_id = Set(uid);
        }
    }
    if let Some(specialty) = payload.get("specialty").and_then(|v| v.as_str()) {
        active_model.specialty = Set(specialty.to_string());
    }
    if let Some(frequency) = payload.get("frequency").and_then(|v| v.as_str()) {
        active_model.frequency = Set(frequency.to_string());
    }
    if let Some(start_date) = payload.get("start_date").and_then(|v| v.as_str()) {
        if let Ok(date) = NaiveDate::parse_from_str(start_date, "%Y-%m-%d") {
            active_model.start_date = Set(date);
        }
    }
    if let Some(end_date) = payload.get("end_date").and_then(|v| v.as_str()) {
        if let Ok(date) = NaiveDate::parse_from_str(end_date, "%Y-%m-%d") {
            active_model.end_date = Set(date);
        }
    }
    if let Some(monthly_price) = payload.get("monthly_price") {
        if let Some(price) = monthly_price.as_f64() {
            active_model.monthly_price = Set(Decimal::from_f64_retain(price).unwrap_or_default());
        } else if let Some(price_str) = monthly_price.as_str() {
            if let Ok(price) = price_str.parse::<Decimal>() {
                active_model.monthly_price = Set(price);
            }
        }
    }
    if let Some(visits) = payload.get("visits_per_period").and_then(|v| v.as_i64()) {
        active_model.visits_per_period = Set(visits as i32);
    }
    if let Some(scope) = payload.get("scope_of_work") {
        active_model.scope_of_work = Set(scope.as_str().map(|s| s.to_string()));
    }
    if let Some(status) = payload.get("status").and_then(|v| v.as_str()) {
        active_model.status = Set(status.to_string());
    }
    if let Some(notes) = payload.get("notes") {
        active_model.notes = Set(notes.as_str().map(|s| s.to_string()));
    }

    let result = active_model.update(&state.db).await?;
    Ok(Json(json!(result)))
}

/// DELETE /api/contracts/:id
pub async fn delete_contract(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    let result = Contract::delete_by_id(id).exec(&state.db).await?;

    if result.rows_affected == 0 {
        return Err(AppError::NotFound("Contrato no encontrado".into()));
    }

    Ok(Json(json!({ "success": true })))
}

/// GET /api/contracts/:id/schedules
pub async fn list_schedules(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    let schedules = Schedule::find()
        .filter(crate::models::contract_schedules::Column::ContractId.eq(id))
        .order_by_asc(crate::models::contract_schedules::Column::ScheduledDate)
        .all(&state.db)
        .await?;

    Ok(Json(json!({ "data": schedules })))
}
