use std::sync::Arc;
use tokio_cron_scheduler::{Job, JobScheduler};
use crate::AppState;
use crate::models::invoices::{Entity as Invoice, Column as InvCol};
use crate::models::clients::Entity as Client;
use sea_orm::{EntityTrait, QueryFilter, ColumnTrait};
use chrono::Local;
use rust_decimal::prelude::ToPrimitive;

pub async fn init_scheduler(state: Arc<AppState>) -> anyhow::Result<()> {
    let sched = JobScheduler::new().await?;

    // Tarea: Revisar facturas vencidas cada día a las 8:00 AM
    // Cron format: sec min hour day_of_month month day_of_week year
    let state_clone = Arc::clone(&state);
    let job = Job::new_async("0 0 8 * * *", move |_uuid, _l| {
        let state = Arc::clone(&state_clone);
        Box::pin(async move {
            tracing::info!("⏰ Running overdue invoices check...");
            if let Err(e) = check_overdue_invoices(state).await {
                tracing::error!("❌ Error in overdue invoices check: {}", e);
            }
        })
    })?;

    sched.add(job).await?;
    sched.start().await?;

    tracing::info!("📅 Scheduler initialized and started");
    Ok(())
}

async fn check_overdue_invoices(state: Arc<AppState>) -> Result<(), crate::errors::AppError> {
    // Buscar facturas con balance > 0 y que estén pendientes/enviadas
    let overdue_invoices = Invoice::find()
        .filter(InvCol::BalanceDue.gt(0))
        .filter(InvCol::Status.eq("sent")) // Solo facturas enviadas pero no cobradas
        .all(&state.db)
        .await?;

    for invoice in overdue_invoices {
        // Por simplicidad, enviamos recordatorio si tiene más de 3 días de creada y sigue pendiente
        // En un sistema real compararíamos con 'due_date'
        let created_at = invoice.created_at;
        let now = Local::now().naive_local();
        let days = (now - created_at).num_days();

        if days >= 3 {
            if let Some(email_service) = &state.email {
                let client = Client::find_by_id(invoice.client_id).one(&state.db).await?
                    .ok_or(crate::errors::AppError::NotFound("Client not found".into()))?;

                if let Some(client_email) = client.email {
                    tracing::info!("📧 Sending reminder for invoice {} to {}", invoice.invoice_number, client_email);
                    
                    // Fetch settings for SMTP
                    use crate::models::settings::Entity as Settings;
                    let settings = Settings::find().all(&state.db).await?;
                    let mut smtp_settings = std::collections::HashMap::new();
                    for s in settings {
                        smtp_settings.insert(s.key, s.value.unwrap_or_default());
                    }

                    if let Err(e) = email_service.send_reminder(
                        &client_email, 
                        &invoice.invoice_number, 
                        invoice.balance_due.to_f64().unwrap_or(0.0),
                        &smtp_settings
                    ).await {
                        tracing::error!("❌ Error sending reminder: {}", e);
                    }
                }
            }
        }
    }

    Ok(())
}
