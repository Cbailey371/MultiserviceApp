use axum::{extract::State, Json};
use serde_json::{json, Value};
use std::sync::Arc;

use crate::errors::AppError;
use crate::AppState;

use sea_orm::{ConnectionTrait, Statement, DatabaseBackend};

/// GET /api/reports/financial
pub async fn get_financial_report(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, AppError> {
    // Totales globales
    let totals_query = Statement::from_string(
        DatabaseBackend::Postgres,
        r#"
        SELECT 
            COALESCE((SELECT SUM(total_amount) FROM invoices), 0) as total_invoiced,
            COALESCE((SELECT SUM(amount) FROM payments), 0) as total_paid
        "#,
    );

    let totals_res = state.db.query_one(totals_query).await?;
    
    let mut total_invoiced = 0.0;
    let mut total_paid = 0.0;

    if let Some(res) = totals_res {
        total_invoiced = res.try_get::<f64>("", "total_invoiced").unwrap_or(0.0);
        total_paid = res.try_get::<f64>("", "total_paid").unwrap_or(0.0);
    }
    
    let total_pending = total_invoiced - total_paid;

    // Tendencia de ingresos (últimos 6 meses por ejemplo)
    let trend_query = Statement::from_string(
        DatabaseBackend::Postgres,
        r#"
        SELECT 
            to_char(issue_date, 'YYYY-MM') as month,
            SUM(total_amount) as amount
        FROM invoices
        GROUP BY to_char(issue_date, 'YYYY-MM')
        ORDER BY month ASC
        LIMIT 12
        "#,
    );

    let trend_res = state.db.query_all(trend_query).await?;
    let mut trend = Vec::new();
    
    for row in trend_res {
        let month: String = row.try_get("", "month").unwrap_or_default();
        let amount: f64 = row.try_get("", "amount").unwrap_or(0.0);
        trend.push(json!({ "month": month, "amount": amount }));
    }

    Ok(Json(json!({
        "totals": {
            "total_invoiced": total_invoiced,
            "total_paid": total_paid,
            "total_pending": total_pending
        },
        "trend": trend
    })))
}

/// GET /api/reports/operational
pub async fn get_operational_report(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, AppError> {
    
    // Work orders status
    let wo_query = Statement::from_string(
        DatabaseBackend::Postgres,
        r#"
        SELECT status, COUNT(*) as count 
        FROM work_orders 
        GROUP BY status
        "#,
    );

    let wo_res = state.db.query_all(wo_query).await?;
    let mut wo_stats = Vec::new();

    for row in wo_res {
        let status: String = row.try_get("", "status").unwrap_or_default();
        let count: i64 = row.try_get("", "count").unwrap_or(0);
        wo_stats.push(json!({ "name": status, "value": count }));
    }

    // Contracts active vs inactive
    let contract_query = Statement::from_string(
        DatabaseBackend::Postgres,
        r#"
        SELECT is_active, COUNT(*) as count 
        FROM contracts 
        GROUP BY is_active
        "#,
    );

    let contract_res = state.db.query_all(contract_query).await?;
    let mut active_contracts = 0;
    let mut inactive_contracts = 0;

    for row in contract_res {
        let is_active: bool = row.try_get("", "is_active").unwrap_or(false);
        let count: i64 = row.try_get("", "count").unwrap_or(0);
        if is_active {
            active_contracts += count;
        } else {
            inactive_contracts += count;
        }
    }

    Ok(Json(json!({
        "work_orders": wo_stats,
        "contracts": [
            { "name": "Activos", "value": active_contracts },
            { "name": "Inactivos", "value": inactive_contracts }
        ]
    })))
}

/// GET /api/reports/clients
pub async fn get_clients_report(
    State(state): State<Arc<AppState>>,
) -> Result<Json<Value>, AppError> {
    
    // Top 5 clients by invoiced amount
    let top_query = Statement::from_string(
        DatabaseBackend::Postgres,
        r#"
        SELECT 
            c.company_name,
            SUM(i.total_amount) as total_invoiced
        FROM invoices i
        JOIN clients c ON i.client_id = c.id
        GROUP BY c.id, c.company_name
        ORDER BY total_invoiced DESC
        LIMIT 5
        "#,
    );

    let top_res = state.db.query_all(top_query).await?;
    let mut top_clients = Vec::new();

    for row in top_res {
        let name: String = row.try_get("", "company_name").unwrap_or_default();
        let amount: f64 = row.try_get("", "total_invoiced").unwrap_or(0.0);
        top_clients.push(json!({ "name": name, "amount": amount }));
    }

    Ok(Json(json!({
        "top_clients": top_clients
    })))
}

// --- Excel Exports ---

use rust_xlsxwriter::*;
use axum::http::header::{CONTENT_TYPE, CONTENT_DISPOSITION};
use axum::http::HeaderMap;
use sea_orm::EntityTrait;

/// Helper to generate Excel response
fn excel_response(mut workbook: Workbook, filename: &str) -> Result<(HeaderMap, Vec<u8>), AppError> {
    let buf = workbook.save_to_buffer().map_err(|e| AppError::Internal(format!("Error generando Excel: {}", e)))?;
    
    let mut headers = HeaderMap::new();
    headers.insert(CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet".parse().unwrap());
    headers.insert(CONTENT_DISPOSITION, format!("attachment; filename=\"{}.xlsx\"", filename).parse().unwrap());
    
    Ok((headers, buf))
}

/// GET /api/reports/export/clients
pub async fn export_clients(State(state): State<Arc<AppState>>) -> Result<(HeaderMap, Vec<u8>), AppError> {
    use crate::models::clients::Entity as Client;
    let clients = Client::find().all(&state.db).await?;
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let header_format = Format::new().set_bold().set_background_color(Color::RGB(0xCCCCCC));
    
    let headers = ["ID", "Nombre Comercial", "Nombre Contacto", "Email", "Teléfono", "RUC"];
    for (col, text) in headers.iter().enumerate() {
        worksheet.write_with_format(0, col as u16, *text, &header_format).unwrap();
    }
    
    for (row, c) in clients.iter().enumerate() {
        let r = (row + 1) as u32;
        worksheet.write(r, 0, c.id.to_string()).unwrap();
        worksheet.write(r, 1, c.company_name.as_deref().unwrap_or("")).unwrap();
        worksheet.write(r, 2, &c.contact_name).unwrap();
        worksheet.write(r, 3, c.email.as_deref().unwrap_or("")).unwrap();
        worksheet.write(r, 4, &c.phone).unwrap();
        worksheet.write(r, 5, c.tax_id.as_deref().unwrap_or("")).unwrap();
    }
    
    excel_response(workbook, "reporte_clientes")
}

/// GET /api/reports/export/invoices
pub async fn export_invoices(State(state): State<Arc<AppState>>) -> Result<(HeaderMap, Vec<u8>), AppError> {
    use crate::models::invoices::Entity as Invoice;
    let invoices = Invoice::find().all(&state.db).await?;
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let headers = ["Número", "ID Cliente", "Fecha", "Subtotal", "Impuesto", "Total", "Estado"];
    for (col, text) in headers.iter().enumerate() {
        worksheet.write(0, col as u16, *text).unwrap();
    }
    
    for (row, i) in invoices.iter().enumerate() {
        let r = (row + 1) as u32;
        worksheet.write(r, 0, &i.invoice_number).unwrap();
        worksheet.write(r, 1, i.client_id.to_string()).unwrap();
        worksheet.write(r, 2, i.issue_date.to_string()).unwrap();
        worksheet.write(r, 3, i.subtotal.to_string()).unwrap();
        worksheet.write(r, 4, i.tax_amount.to_string()).unwrap();
        worksheet.write(r, 5, i.total.to_string()).unwrap();
        worksheet.write(r, 6, &i.status).unwrap();
    }
    
    excel_response(workbook, "reporte_facturas")
}

/// GET /api/reports/export/quotations
pub async fn export_quotations(State(state): State<Arc<AppState>>) -> Result<(HeaderMap, Vec<u8>), AppError> {
    use crate::models::quotations::Entity as Quotation;
    let quotations = Quotation::find().all(&state.db).await?;
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let headers = ["Número", "ID Cliente", "Estado", "Total", "Válido Hasta", "Creado En"];
    for (col, text) in headers.iter().enumerate() {
        worksheet.write(0, col as u16, *text).unwrap();
    }
    
    for (row, q) in quotations.iter().enumerate() {
        let r = (row + 1) as u32;
        worksheet.write(r, 0, &q.quote_number).unwrap();
        worksheet.write(r, 1, q.client_id.to_string()).unwrap();
        worksheet.write(r, 2, &q.status).unwrap();
        worksheet.write(r, 3, q.total.to_string()).unwrap();
        worksheet.write(r, 4, q.valid_until.map(|d| d.to_string()).unwrap_or_default()).unwrap();
        worksheet.write(r, 5, q.created_at.to_string()).unwrap();
    }
    
    excel_response(workbook, "reporte_cotizaciones")
}

/// GET /api/reports/export/contracts
pub async fn export_contracts(State(state): State<Arc<AppState>>) -> Result<(HeaderMap, Vec<u8>), AppError> {
    use crate::models::contracts::Entity as Contract;
    let contracts = Contract::find().all(&state.db).await?;
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let headers = ["Número", "ID Cliente", "Especialidad", "Frecuencia", "Inicio", "Fin", "Estado"];
    for (col, text) in headers.iter().enumerate() {
        worksheet.write(0, col as u16, *text).unwrap();
    }
    
    for (row, c) in contracts.iter().enumerate() {
        let r = (row + 1) as u32;
        worksheet.write(r, 0, &c.contract_number).unwrap();
        worksheet.write(r, 1, c.client_id.to_string()).unwrap();
        worksheet.write(r, 2, &c.specialty).unwrap();
        worksheet.write(r, 3, &c.frequency).unwrap();
        worksheet.write(r, 4, c.start_date.to_string()).unwrap();
        worksheet.write(r, 5, c.end_date.to_string()).unwrap();
        worksheet.write(r, 6, &c.status).unwrap();
    }
    
    excel_response(workbook, "reporte_contratos")
}

/// GET /api/reports/export/catalog
pub async fn export_catalog(State(state): State<Arc<AppState>>) -> Result<(HeaderMap, Vec<u8>), AppError> {
    use crate::models::catalog::Entity as Catalog;
    let items = Catalog::find().all(&state.db).await?;
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let headers = ["Nombre", "Tipo", "Especialidad", "Unidad", "Precio", "Costo", "Activo"];
    for (col, text) in headers.iter().enumerate() {
        worksheet.write(0, col as u16, *text).unwrap();
    }
    
    for (row, i) in items.iter().enumerate() {
        let r = (row + 1) as u32;
        worksheet.write(r, 0, &i.name).unwrap();
        worksheet.write(r, 1, &i.item_type).unwrap();
        worksheet.write(r, 2, &i.specialty).unwrap();
        worksheet.write(r, 3, &i.unit).unwrap();
        worksheet.write(r, 4, i.unit_price.to_string()).unwrap();
        worksheet.write(r, 5, i.cost_price.to_string()).unwrap();
        worksheet.write(r, 6, i.is_active).unwrap();
    }
    
    excel_response(workbook, "reporte_inventario_catalogo")
}

/// GET /api/reports/export/work-orders
pub async fn export_work_orders(State(state): State<Arc<AppState>>) -> Result<(HeaderMap, Vec<u8>), AppError> {
    use crate::models::work_orders::Entity as WO;
    let orders = WO::find().all(&state.db).await?;
    
    let mut workbook = Workbook::new();
    let worksheet = workbook.add_worksheet();
    
    let headers = ["OT Numero", "ID Cliente", "Tipo", "Especialidad", "Estado", "Prioridad", "Fecha Programada"];
    for (col, text) in headers.iter().enumerate() {
        worksheet.write(0, col as u16, *text).unwrap();
    }
    
    for (row, o) in orders.iter().enumerate() {
        let r = (row + 1) as u32;
        worksheet.write(r, 0, &o.wo_number).unwrap();
        worksheet.write(r, 1, o.client_id.to_string()).unwrap();
        worksheet.write(r, 2, &o.work_type).unwrap();
        worksheet.write(r, 3, &o.specialty).unwrap();
        worksheet.write(r, 4, &o.status).unwrap();
        worksheet.write(r, 5, &o.priority).unwrap();
        worksheet.write(r, 6, o.scheduled_date.to_string()).unwrap();
    }
    
    excel_response(workbook, "reporte_ordenes_trabajo")
}
