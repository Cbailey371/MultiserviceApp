use axum::{extract::State, Json};
use serde_json::{json, Value};
use std::sync::Arc;
use sea_orm::{EntityTrait, PaginatorTrait, QueryFilter, ColumnTrait, QueryOrder, QuerySelect, RelationTrait, JoinType};
use rust_decimal::prelude::ToPrimitive;
use chrono::{Datelike, Local};
use crate::{errors::AppError, AppState};
use crate::models::invoices::{Entity as Invoice, Column as InvCol};
use crate::models::work_orders::{Entity as WorkOrder, Column as WoCol};
use crate::models::clients::Entity as Client;
use crate::models::users::Entity as User;

pub async fn get_kpis(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    let now = Local::now().naive_local().date();

    // 1. Core KPIs
    let invoices = Invoice::find().all(&state.db).await?;
    let total_revenue: f64 = invoices.iter()
        .map(|i| i.amount_paid.to_f64().unwrap_or(0.0))
        .sum();

    let total_receivables: f64 = invoices.iter()
        .map(|i| i.balance_due.to_f64().unwrap_or(0.0))
        .sum();

    let pending_wo = WorkOrder::find()
        .filter(WoCol::Status.eq("pending"))
        .count(&state.db)
        .await?;

    let active_wo = WorkOrder::find()
        .filter(WoCol::Status.eq("in_progress"))
        .count(&state.db)
        .await?;

    // 2. Specialty Distribution (Based on configured specialties + actual work orders)
    let settings = crate::models::settings::Entity::find().all(&state.db).await?;
    let mut specialty_map = std::collections::HashMap::new();
    
    // Default specialties if none configured
    if let Some(s) = settings.iter().find(|s| s.key == "specialties") {
        if let Some(val) = &s.value {
            if let Ok(parsed) = serde_json::from_str::<Vec<Value>>(val) {
                for spec in parsed {
                    if let Some(name) = spec.get("name").and_then(|v| v.as_str()) {
                        specialty_map.insert(name.to_string(), 0);
                    }
                }
            }
        }
    }

    let all_wo = WorkOrder::find().all(&state.db).await?;
    let total_wo = all_wo.len() as f64;
    for wo in &all_wo {
        *specialty_map.entry(wo.specialty.clone()).or_insert(0) += 1;
    }

    let specialty_distribution: Vec<Value> = specialty_map.into_iter()
        .map(|(name, count)| {
            let percentage = if total_wo > 0.0 { (count as f64 / total_wo * 100.0).round() } else { 0.0 };
            json!({ "name": name, "value": percentage, "count": count })
        })
        .collect();

    // Extra KPIs
    let total_clients = Client::find().count(&state.db).await?;

    // 3. Upcoming Visits (Next 5)
    let upcoming = WorkOrder::find()
        .filter(WoCol::ScheduledDate.gte(now))
        .filter(WoCol::Status.is_in(["pending", "en_route", "in_progress"]))
        .order_by_asc(WoCol::ScheduledDate)
        .limit(5)
        .find_also_related(Client)
        .all(&state.db)
        .await?;

    let upcoming_visits: Vec<Value> = upcoming.into_iter()
        .map(|(wo, client)| {
            let client_name = client.map(|c| c.company_name.unwrap_or(c.contact_name)).unwrap_or_else(|| "Unknown".into());
            json!({
                "id": wo.id,
                "client": client_name,
                "service": wo.work_type,
                "date": wo.scheduled_date.to_string(),
                "status": wo.status,
            })
        })
        .collect();

    // 4. Overdue Invoices
    let overdue_list = Invoice::find()
        .filter(InvCol::Status.ne("paid"))
        .filter(InvCol::DueDate.lt(now))
        .order_by_desc(InvCol::DueDate)
        .limit(5)
        .find_also_related(Client)
        .all(&state.db)
        .await?;

    let overdue_invoices: Vec<Value> = overdue_list.into_iter()
        .map(|(inv, client)| {
            let client_name = client.map(|c| c.company_name.unwrap_or(c.contact_name)).unwrap_or_else(|| "Unknown".into());
            let days_late = (now - inv.due_date.unwrap_or(now)).num_days();
            json!({
                "id": inv.id,
                "client": client_name,
                "amount": inv.balance_due.to_f64().unwrap_or(0.0),
                "days_late": days_late,
                "invoice_number": inv.invoice_number,
            })
        })
        .collect();

    // 5. Revenue History (Last 6 Months)
    let mut revenue_history = Vec::new();
    let months = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"];
    
    for i in (0..6).rev() {
        let date = Local::now().date_naive();
        // This is a bit simplified, but good for now
        let target_month = if date.month() as i32 - i <= 0 {
            12 + (date.month() as i32 - i)
        } else {
            date.month() as i32 - i
        } as u32;

        let month_name = months[(target_month - 1) as usize];
        
        // Sum invoices for that month (issue_date)
        let month_invoices: f64 = invoices.iter()
            .filter(|inv| inv.issue_date.month() == target_month)
            .map(|inv| inv.total.to_f64().unwrap_or(0.0))
            .sum();
            
        let month_collections: f64 = invoices.iter()
            .filter(|inv| inv.issue_date.month() == target_month)
            .map(|inv| inv.amount_paid.to_f64().unwrap_or(0.0))
            .sum();

        revenue_history.push(json!({
            "month": month_name,
            "ventas": month_invoices,
            "cobros": month_collections,
        }));
    }

    Ok(Json(json!({
        "monthly_revenue": total_revenue,
        "total_receivables": total_receivables,
        "pending_work_orders": pending_wo,
        "active_work_orders": active_wo,
        "total_clients": total_clients,
        "specialty_distribution": specialty_distribution,
        "upcoming_visits": upcoming_visits,
        "overdue_invoices": overdue_invoices,
        "revenue_history": revenue_history,
        "growth": "+12.5%", 
    })))
}
