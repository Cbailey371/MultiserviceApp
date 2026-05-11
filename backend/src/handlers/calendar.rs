use axum::{extract::State, Json};
use serde_json::{json, Value};
use std::sync::Arc;
use sea_orm::*;
use crate::{errors::AppError, AppState, models};

pub async fn list_events(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    let db = &state.db;

    let mut events = Vec::new();

    // 0. Test Event
    events.push(json!({
        "id": "test-1",
        "title": "Evento de Prueba",
        "start_date": "2026-05-01",
        "type": "test",
        "category": "test",
        "status": "active",
        "description": "Si ves esto, el endpoint funciona correctamente.",
        "specialty": "other",
        "color": "#FF00FF",
    }));

    // 1. Fetch Active Work Orders (Exclude completed/cancelled - case insensitive)
    let work_orders = models::work_orders::Entity::find()
        .filter(
            Condition::all()
                .add(models::work_orders::Column::Status.ne("completed"))
                .add(models::work_orders::Column::Status.ne("Completed"))
                .add(models::work_orders::Column::Status.ne("cancelled"))
                .add(models::work_orders::Column::Status.ne("Cancelled"))
        )
        .all(db)
        .await?;

    for wo in work_orders {
        let client = models::clients::Entity::find_by_id(wo.client_id).one(db).await?;
        let client_name = client.map(|c| c.company_name.unwrap_or(c.contact_name)).unwrap_or_else(|| "Cliente Desconocido".to_string());
        
        events.push(json!({
            "id": format!("wo-{}", wo.id),
            "title": format!("{}: {}", wo.wo_number, client_name),
            "start_date": wo.scheduled_date.to_string(),
            "type": "work_order",
            "category": wo.work_type,
            "status": wo.status,
            "description": wo.description.clone().unwrap_or_default(),
            "specialty": wo.specialty,
            "color": get_color_for_specialty(&wo.specialty),
        }));
    }

    // 2. Fetch Contract Schedules
    let contract_schedules = models::contract_schedules::Entity::find()
        .filter(models::contract_schedules::Column::WorkOrderId.is_null())
        .all(db)
        .await?;

    for schedule in contract_schedules {
        let contract = models::contracts::Entity::find_by_id(schedule.contract_id).one(db).await?;
        if let Some(contract) = contract {
            let client = models::clients::Entity::find_by_id(contract.client_id).one(db).await?;
            let client_name = client.map(|c| c.company_name.unwrap_or(c.contact_name)).unwrap_or_else(|| "Cliente Desconocido".to_string());

            events.push(json!({
                "id": format!("maint-{}", schedule.id),
                "title": format!("Mantenimiento: {}", client_name),
                "start_date": schedule.scheduled_date.to_string(),
                "type": "maintenance",
                "category": "preventive",
                "status": schedule.status,
                "description": format!("Visita programada por contrato {}", contract.contract_number),
                "specialty": contract.specialty,
                "color": get_color_for_specialty(&contract.specialty),
            }));
        }
    }

    Ok(Json(json!({ "data": events })))
}

fn get_color_for_specialty(specialty: &str) -> &'static str {
    match specialty.to_lowercase().as_str() {
        "hvac" => "#3B82F6",       // Blue
        "electrical" => "#F59E0B", // Amber
        "plumbing" => "#10B981",   // Emerald
        "construction" => "#F97316",// Orange
        _ => "#6B7280",            // Gray
    }
}
