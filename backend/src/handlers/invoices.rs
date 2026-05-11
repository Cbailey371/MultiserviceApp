use axum::{extract::{Path, State}, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use sea_orm::*;
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;

use crate::auth::jwt::Claims;
use crate::errors::AppError;
use crate::AppState;
use crate::models::invoices::{Entity as Invoice, ActiveModel as InvoiceActive};
use crate::models::invoice_items::ActiveModel as InvoiceItemActive;
use crate::models::payments::{
    Entity as Payment,
    ActiveModel as PaymentActive,
};

#[derive(Debug, Deserialize)]
pub struct CreateInvoiceRequest {
    pub client_id: Uuid,
    pub quotation_id: Option<Uuid>,
    pub invoice_type: Option<String>,
    pub due_date: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<InvoiceItemInput>,
}

#[derive(Debug, Deserialize)]
pub struct InvoiceItemInput {
    pub catalog_item_id: Option<Uuid>,
    pub description: String,
    pub quantity: Decimal,
    pub unit: String,
    pub unit_price: Decimal,
    pub scope: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterPaymentRequest {
    pub amount: Decimal,
    pub payment_method: String,
    pub reference_number: Option<String>,
    pub payment_date: String,
    pub notes: Option<String>,
}

/// GET /api/invoices
pub async fn list_invoices(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
) -> Result<Json<Value>, AppError> {
    let invoices = Invoice::find()
        .order_by_desc(crate::models::invoices::Column::CreatedAt)
        .all(&state.db)
        .await?;

    Ok(Json(json!({ "data": invoices, "total": invoices.len() })))
}

/// POST /api/invoices
pub async fn create_invoice(
    State(state): State<Arc<AppState>>,
    claims: Claims,
    Json(payload): Json<CreateInvoiceRequest>,
) -> Result<Json<Value>, AppError> {
    let txn = state.db.begin().await?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Internal("Invalid user ID".into()))?;

    // Generate invoice number
    let inv_count = Invoice::find().count(&txn).await?;
    let invoice_number = format!("FAC-{:05}", inv_count + 1);

    let invoice_id = Uuid::new_v4();
    let mut subtotal = Decimal::from(0);

    // Calculate totals
    for item in payload.items.iter() {
        subtotal += item.quantity * item.unit_price;
    }

    let tax_rate = Decimal::from_f64_retain(0.07).unwrap();
    let tax_amount = subtotal * tax_rate;
    let total = subtotal + tax_amount;

    let issue_date = chrono::Utc::now().date_naive();
    let due_date = payload.due_date.as_ref().and_then(|d| {
        chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d").ok()
    });

    let inv_type = payload.invoice_type.unwrap_or_else(|| "cash".into());

    // Insert invoice first
    let invoice = InvoiceActive {
        id: Set(invoice_id),
        invoice_number: Set(invoice_number),
        quotation_id: Set(payload.quotation_id),
        client_id: Set(payload.client_id),
        created_by: Set(user_id),
        invoice_type: Set(inv_type),
        status: Set("draft".to_string()),
        issue_date: Set(issue_date),
        due_date: Set(due_date),
        subtotal: Set(subtotal),
        tax_rate: Set(tax_rate),
        tax_amount: Set(tax_amount),
        discount_amount: Set(Decimal::from(0)),
        total: Set(total),
        amount_paid: Set(Decimal::from(0)),
        balance_due: Set(total),
        notes: Set(payload.notes),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };
    let result = invoice.insert(&txn).await?;

    // Insert items
    for (idx, item) in payload.items.iter().enumerate() {
        let line_total = item.quantity * item.unit_price;
        let inv_item = InvoiceItemActive {
            id: Set(Uuid::new_v4()),
            invoice_id: Set(invoice_id),
            catalog_item_id: Set(item.catalog_item_id),
            sort_order: Set(idx as i32),
            description: Set(item.description.clone()),
            quantity: Set(item.quantity),
            unit: Set(item.unit.clone()),
            unit_price: Set(item.unit_price),
            line_total: Set(line_total),
            scope: Set(item.scope.clone()),
        };
        inv_item.insert(&txn).await?;
    }

    // If from quotation, mark it as invoiced
    if let Some(q_id) = payload.quotation_id {
        use crate::models::quotations::ActiveModel as QuotationActive;
        let mut q_update = QuotationActive {
            id: Set(q_id),
            ..Default::default()
        };
        q_update.status = Set("invoiced".to_string());
        q_update.update(&txn).await?;
    }

    txn.commit().await?;

    Ok(Json(json!({ "data": result, "message": "Invoice created successfully" })))
}

/// GET /api/invoices/:id
pub async fn get_invoice(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    let invoice = Invoice::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(AppError::NotFound("Invoice not found".into()))?;

    let items = crate::models::invoice_items::Entity::find()
        .filter(crate::models::invoice_items::Column::InvoiceId.eq(id))
        .order_by_asc(crate::models::invoice_items::Column::SortOrder)
        .all(&state.db)
        .await?;

    let payments = Payment::find()
        .filter(crate::models::payments::Column::InvoiceId.eq(id))
        .order_by_desc(crate::models::payments::Column::PaymentDate)
        .all(&state.db)
        .await?;

    Ok(Json(json!({
        "data": invoice,
        "items": items,
        "payments": payments,
    })))
}

/// POST /api/invoices/:id/payments
pub async fn register_payment(
    State(state): State<Arc<AppState>>,
    claims: Claims,
    Path(id): Path<Uuid>,
    Json(payload): Json<RegisterPaymentRequest>,
) -> Result<Json<Value>, AppError> {
    let txn = state.db.begin().await?;

    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Internal("Invalid user ID".into()))?;

    // Get current invoice
    let invoice = Invoice::find_by_id(id)
        .one(&txn)
        .await?
        .ok_or(AppError::NotFound("Invoice not found".into()))?;

    if invoice.balance_due <= Decimal::from(0) {
        return Err(AppError::Validation("Invoice is already fully paid".into()));
    }

    if payload.amount > invoice.balance_due {
        return Err(AppError::Validation("Payment exceeds balance due".into()));
    }

    let payment_date = chrono::NaiveDate::parse_from_str(&payload.payment_date, "%Y-%m-%d")
        .map_err(|_| AppError::Validation("Invalid date format, use YYYY-MM-DD".into()))?;

    // Insert payment
    let payment = PaymentActive {
        id: Set(Uuid::new_v4()),
        invoice_id: Set(id),
        registered_by: Set(user_id),
        amount: Set(payload.amount),
        payment_method: Set(payload.payment_method),
        reference_number: Set(payload.reference_number),
        payment_date: Set(payment_date),
        notes: Set(payload.notes),
        created_at: Set(chrono::Utc::now().naive_utc()),
    };
    payment.insert(&txn).await?;

    // Update invoice balances
    let new_paid = invoice.amount_paid + payload.amount;
    let new_balance = invoice.total - new_paid;
    let new_status = if new_balance <= Decimal::from(0) {
        "paid"
    } else {
        "partial"
    };

    let mut inv_update = crate::models::invoices::ActiveModel {
        id: Set(id),
        ..Default::default()
    };
    inv_update.amount_paid = Set(new_paid);
    inv_update.balance_due = Set(new_balance);
    inv_update.status = Set(new_status.to_string());
    inv_update.update(&txn).await?;

    txn.commit().await?;

    Ok(Json(json!({
        "message": "Payment registered successfully",
        "amount_paid": new_paid,
        "balance_due": new_balance,
        "status": new_status,
    })))
}

/// GET /api/invoices/:id/pdf
pub async fn download_pdf(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<(axum::http::HeaderMap, Vec<u8>), AppError> {
    use crate::models::invoice_items::Entity as InvoiceItem;
    use crate::models::clients::Entity as Client;
    use crate::models::settings::{Entity as Settings};
    use crate::services::pdf_generator::BrandingInfo;

    let invoice = Invoice::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Invoice not found".into()))?;

    let client = Client::find_by_id(invoice.client_id).one(&state.db).await?
        .ok_or(AppError::NotFound("Client not found".into()))?;

    let items = InvoiceItem::find()
        .filter(crate::models::invoice_items::Column::InvoiceId.eq(id))
        .all(&state.db)
        .await?;

    let pdf_items: Vec<(String, f64, f64)> = items.into_iter()
        .map(|i| {
            let desc = if let Some(s) = i.scope {
                if !s.is_empty() { format!("{}\nAlcances: {}", i.description, s) }
                else { i.description }
            } else { i.description };
            (desc, i.quantity.to_f64().unwrap_or(0.0), i.unit_price.to_f64().unwrap_or(0.0))
        })
        .collect();

    // Fetch branding info from settings
    let settings = Settings::find().all(&state.db).await?;
    let mut settings_map = std::collections::HashMap::new();
    for s in settings {
        settings_map.insert(s.key, s.value);
    }

    let logo_url = settings_map.get("company_logo")
        .or_else(|| settings_map.get("logo_url"))
        .cloned()
        .flatten();
    let logo_path = logo_url.and_then(|url| {
        if url.starts_with("/api/uploads/") {
            let rel = &url["/api/uploads/".len()..];
            let p = std::path::Path::new(&state.config.storage_path).join(rel);
            Some(p.to_string_lossy().to_string())
        } else {
            None
        }
    });

    let branding = BrandingInfo {
        company_name: settings_map.get("company_name").cloned().flatten().unwrap_or_else(|| "MultiService Pro".into()),
        company_legal_name: settings_map.get("legal_name").cloned().flatten(),
        company_tax_id: settings_map.get("tax_id").cloned().flatten(),
        company_address: settings_map.get("address").cloned().flatten(),
        company_phone: settings_map.get("phone").cloned().flatten(),
        company_email: settings_map.get("email").cloned().flatten(),
        logo_path,
    };

    let pdf_data = state.pdf.generate_invoice_pdf(
        &branding,
        "Factura no fiscal",
        &invoice.invoice_number,
        &(client.company_name.unwrap_or(client.contact_name)),
        &pdf_items,
        invoice.subtotal.to_f64().unwrap_or(0.0),
        invoice.tax_amount.to_f64().unwrap_or(0.0),
        invoice.total.to_f64().unwrap_or(0.0),
    ).await?;



    // Save to storage for audit
    let filename = format!("invoices/{}.pdf", invoice.invoice_number);
    let _ = state.storage.save_file(&filename, &pdf_data).await;

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(
        axum::http::header::CONTENT_TYPE,
        axum::http::header::HeaderValue::from_static("application/pdf"),
    );
    headers.insert(
        axum::http::header::CONTENT_DISPOSITION,
        axum::http::header::HeaderValue::from_str(&format!("attachment; filename=\"{}.pdf\"", invoice.invoice_number)).unwrap(),
    );

    Ok((headers, pdf_data))
}

/// POST /api/invoices/:id/send-email
pub async fn send_email(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use crate::models::clients::Entity as Client;
    use crate::models::settings::{Entity as Settings};
    use crate::services::pdf_generator::BrandingInfo;

    let email_service = state.email.as_ref()
        .ok_or(AppError::Internal("Email service not configured. Check SMTP settings in .env".into()))?;

    let invoice = Invoice::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Invoice not found".into()))?;

    let client = Client::find_by_id(invoice.client_id).one(&state.db).await?
        .ok_or(AppError::NotFound("Client not found".into()))?;

    let client_email = client.email.ok_or(AppError::Validation("Client has no email address".into()))?;

    // Generate PDF data (internal call logic)
    let items = crate::models::invoice_items::Entity::find()
        .filter(crate::models::invoice_items::Column::InvoiceId.eq(id))
        .all(&state.db)
        .await?;

    let pdf_items: Vec<(String, f64, f64)> = items.into_iter()
        .map(|i| {
            let desc = if let Some(s) = i.scope {
                if !s.is_empty() { format!("{}\nAlcances: {}", i.description, s) }
                else { i.description }
            } else { i.description };
            (desc, i.quantity.to_f64().unwrap_or(0.0), i.unit_price.to_f64().unwrap_or(0.0))
        })
        .collect();

    // Fetch branding info from settings
    let settings = Settings::find().all(&state.db).await?;
    let mut settings_map = std::collections::HashMap::new(); let mut smtp_settings = std::collections::HashMap::new();
    for s in settings {
        let val = s.value.clone().unwrap_or_default(); settings_map.insert(s.key.clone(), s.value); smtp_settings.insert(s.key, val);
    }

    let logo_url = settings_map.get("company_logo")
        .or_else(|| settings_map.get("logo_url"))
        .cloned()
        .flatten();
    let logo_path = logo_url.and_then(|url| {
        if url.starts_with("/api/uploads/") {
            let rel = &url["/api/uploads/".len()..];
            let p = std::path::Path::new(&state.config.storage_path).join(rel);
            Some(p.to_string_lossy().to_string())
        } else {
            None
        }
    });

    let branding = BrandingInfo {
        company_name: settings_map.get("company_name").cloned().flatten().unwrap_or_else(|| "MultiService Pro".into()),
        company_legal_name: settings_map.get("legal_name").cloned().flatten(),
        company_tax_id: settings_map.get("tax_id").cloned().flatten(),
        company_address: settings_map.get("address").cloned().flatten(),
        company_phone: settings_map.get("phone").cloned().flatten(),
        company_email: settings_map.get("email").cloned().flatten(),
        logo_path,
    };

    let pdf_data = state.pdf.generate_invoice_pdf(
        &branding,
        "Factura no fiscal",
        &invoice.invoice_number,
        &(client.company_name.unwrap_or(client.contact_name)),
        &pdf_items,
        invoice.subtotal.to_f64().unwrap_or(0.0),
        invoice.tax_amount.to_f64().unwrap_or(0.0),
        invoice.total.to_f64().unwrap_or(0.0),
    ).await?;



    // Save to storage for audit
    let filename = format!("invoices/{}.pdf", invoice.invoice_number);
    let _ = state.storage.save_file(&filename, &pdf_data).await;

    email_service.send_invoice(&client_email, &invoice.invoice_number, pdf_data, &smtp_settings).await?;

    Ok(Json(json!({ "message": format!("Invoice sent to {}", client_email) })))
}
