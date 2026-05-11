use axum::extract::{Path, State, Json};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;
use rust_decimal::Decimal;
use rust_decimal::prelude::ToPrimitive;
use sea_orm::{ActiveModelTrait, EntityTrait, Set, TransactionTrait, QueryOrder, QueryFilter, ColumnTrait, PaginatorTrait};
use crate::{errors::AppError, AppState, auth::jwt::Claims};
use crate::models::quotations::{Entity as Quotation, ActiveModel as QuotationActive};
use crate::models::quotation_items::{Entity as QuotationItem, ActiveModel as ItemActive};
use crate::models::settings::{Entity as Settings};
use crate::services::pdf_generator::BrandingInfo;

#[derive(Debug, Deserialize)]
pub struct QuotationItemRequest {
    pub catalog_item_id: Option<Uuid>,
    pub description: String,
    pub quantity: Decimal,
    pub unit: String,
    pub unit_price: Decimal,
    pub cost_price: Decimal,
    pub discount_percent: Decimal,
    pub scope: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateQuotationRequest {
    pub client_id: Uuid,
    pub location_id: Option<Uuid>,
    pub status: Option<String>,
    pub notes: Option<String>,
    pub items: Vec<QuotationItemRequest>,
}

pub async fn list_quotations(State(state): State<Arc<AppState>>) -> Result<Json<Value>, AppError> {
    let quotes = Quotation::find()
        .order_by_desc(crate::models::quotations::Column::CreatedAt)
        .all(&state.db)
        .await?;
    
    Ok(Json(json!({ "data": quotes, "total": quotes.len() })))
}

pub async fn create_quotation(
    State(state): State<Arc<AppState>>,
    claims: Claims,
    Json(payload): Json<CreateQuotationRequest>,
) -> Result<Json<Value>, AppError> {
    let txn = state.db.begin().await?;

    // Convert string claims.sub to Uuid
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Internal("Invalid user ID in token".into()))?;

    let quote_count = Quotation::find().count(&txn).await?;
    let quote_number = format!("COT-{:05}", quote_count + 1);

    let quote_id = Uuid::new_v4();
    let mut subtotal = Decimal::from(0);

    // 1. Calculate totals first
    for item_req in payload.items.iter() {
        let line_total = item_req.quantity * item_req.unit_price * (Decimal::from(1) - (item_req.discount_percent / Decimal::from(100)));
        subtotal += line_total;
    }

    let tax_rate = Decimal::from_f64_retain(0.07).unwrap();
    let tax_amount = subtotal * tax_rate;
    let total = subtotal + tax_amount;

    // 2. Insert quotation FIRST (parent record)
    let quotation = QuotationActive {
        id: Set(quote_id),
        quote_number: Set(quote_number),
        client_id: Set(payload.client_id),
        location_id: Set(payload.location_id),
        created_by: Set(user_id),
        status: Set("draft".to_string()),
        created_at: Set(chrono::Utc::now().naive_utc()),
        notes: Set(payload.notes),
        subtotal: Set(subtotal),
        tax_amount: Set(tax_amount),
        discount_amount: Set(Decimal::from(0)),
        total: Set(total),
        ..Default::default()
    };
    let result = quotation.insert(&txn).await?;

    // 3. Insert items AFTER parent exists
    for (index, item_req) in payload.items.iter().enumerate() {
        let line_total = item_req.quantity * item_req.unit_price * (Decimal::from(1) - (item_req.discount_percent / Decimal::from(100)));

        let item = ItemActive {
            id: Set(Uuid::new_v4()),
            quotation_id: Set(quote_id),
            catalog_item_id: Set(item_req.catalog_item_id),
            sort_order: Set(index as i32),
            description: Set(item_req.description.clone()),
            quantity: Set(item_req.quantity),
            unit: Set(item_req.unit.clone()),
            unit_price: Set(item_req.unit_price),
            cost_price: Set(item_req.cost_price),
            discount_percent: Set(item_req.discount_percent),
            line_total: Set(line_total),
            scope: Set(item_req.scope.clone()),
        };
        item.insert(&txn).await?;
    }

    txn.commit().await?;

    Ok(Json(json!({ "data": result, "message": "Quotation created successfully" })))
}

pub async fn get_quotation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    let quote = Quotation::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;
    
    let items = QuotationItem::find()
        .filter(crate::models::quotation_items::Column::QuotationId.eq(id))
        .order_by_asc(crate::models::quotation_items::Column::SortOrder)
        .all(&state.db)
        .await?;

    Ok(Json(json!({ "data": quote, "items": items })))
}

pub async fn approve_quotation(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::IntoActiveModel;
    let quote = Quotation::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;
    
    let mut active = quote.into_active_model();
    active.status = Set("approved".to_string());
    active.approved_at = Set(Some(chrono::Utc::now().naive_utc()));
    
    let updated = active.update(&state.db).await?;
    Ok(Json(json!({ "data": updated, "message": "Quotation approved" })))
}

#[derive(Debug, Deserialize)]
pub struct StatusUpdateRequest {
    pub status: String,
}

pub async fn update_status(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
    Json(payload): Json<StatusUpdateRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::IntoActiveModel;
    
    let quote = Quotation::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;
    
    let mut active = quote.into_active_model();
    active.status = Set(payload.status);
    let updated = active.update(&state.db).await?;
    
    Ok(Json(json!({ "data": updated, "message": "Status updated successfully" })))
}


// Stubs for remaining edit routes
pub async fn update_quotation(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
    Json(payload): Json<CreateQuotationRequest>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::IntoActiveModel;
    let txn = state.db.begin().await?;

    let quote = Quotation::find_by_id(id).one(&txn).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;

    // Only allow editing if NOT invoiced
    if quote.status == "invoiced" {
        return Err(AppError::Validation("Cannot edit an invoiced quotation".into()));
    }

    // 1. Calculate new totals
    let mut subtotal = Decimal::from(0);
    for item_req in payload.items.iter() {
        let line_total = item_req.quantity * item_req.unit_price * (Decimal::from(1) - (item_req.discount_percent / Decimal::from(100)));
        subtotal += line_total;
    }

    // Use setting for tax rate if possible, or default to 0.07
    let tax_rate = Decimal::from_f64_retain(0.07).unwrap();
    let tax_amount = subtotal * tax_rate;
    let total = subtotal + tax_amount;

    // 2. Update parent quotation
    let mut active = quote.into_active_model();
    active.client_id = Set(payload.client_id);
    active.location_id = Set(payload.location_id);
    active.notes = Set(payload.notes);
    active.subtotal = Set(subtotal);
    active.tax_amount = Set(tax_amount);
    active.total = Set(total);
    
    if let Some(status) = payload.status {
        active.status = Set(status);
    }

    active.update(&txn).await?;

    // 3. Delete old items
    QuotationItem::delete_many()
        .filter(crate::models::quotation_items::Column::QuotationId.eq(id))
        .exec(&txn)
        .await?;

    // 4. Insert new items
    for (index, item_req) in payload.items.iter().enumerate() {
        let line_total = item_req.quantity * item_req.unit_price * (Decimal::from(1) - (item_req.discount_percent / Decimal::from(100)));

        let item = ItemActive {
            id: Set(Uuid::new_v4()),
            quotation_id: Set(id),
            catalog_item_id: Set(item_req.catalog_item_id),
            sort_order: Set(index as i32),
            description: Set(item_req.description.clone()),
            quantity: Set(item_req.quantity),
            unit: Set(item_req.unit.clone()),
            unit_price: Set(item_req.unit_price),
            cost_price: Set(item_req.cost_price),
            discount_percent: Set(item_req.discount_percent),
            line_total: Set(line_total),
            scope: Set(item_req.scope.clone()),
        };
        item.insert(&txn).await?;
    }

    txn.commit().await?;

    Ok(Json(json!({ "message": "Quotation updated successfully" })))
}

pub async fn add_item(State(_): State<Arc<AppState>>, Path(_): Path<Uuid>, Json(_): Json<Value>) -> Result<Json<Value>, AppError> { Ok(Json(json!({"message":"TODO"}))) }
pub async fn update_item(State(_): State<Arc<AppState>>, Path((_qid, _iid)): Path<(Uuid, Uuid)>, Json(_): Json<Value>) -> Result<Json<Value>, AppError> { Ok(Json(json!({"message":"TODO"}))) }
pub async fn remove_item(State(_): State<Arc<AppState>>, Path((_qid, _iid)): Path<(Uuid, Uuid)>) -> Result<Json<Value>, AppError> { Ok(Json(json!({"message":"TODO"}))) }

/// POST /api/quotations/:id/approve
pub async fn approve(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::IntoActiveModel;

    let quote = Quotation::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;

    if quote.status != "draft" && quote.status != "sent" {
        return Err(AppError::Validation(format!("Cannot approve a {} quotation", quote.status)));
    }

    let mut active = quote.into_active_model();
    active.status = Set("approved".to_string());
    active.approved_at = Set(Some(chrono::Utc::now().naive_utc()));
    let updated = active.update(&state.db).await?;

    Ok(Json(json!({ "data": updated, "message": "Quotation approved" })))
}

/// POST /api/quotations/:id/reject
pub async fn reject(
    State(state): State<Arc<AppState>>,
    _claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use sea_orm::IntoActiveModel;

    let quote = Quotation::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;

    let mut active = quote.into_active_model();
    active.status = Set("rejected".to_string());
    let updated = active.update(&state.db).await?;

    Ok(Json(json!({ "data": updated, "message": "Quotation rejected" })))
}

/// POST /api/quotations/:id/convert — Convert approved quotation to invoice
pub async fn convert_to_invoice(
    State(state): State<Arc<AppState>>,
    claims: Claims,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use crate::models::invoices::{Entity as Invoice, ActiveModel as InvoiceActive};
    use crate::models::invoice_items::ActiveModel as InvoiceItemActive;
    

    let txn = state.db.begin().await?;
    let user_id = Uuid::parse_str(&claims.sub)
        .map_err(|_| AppError::Internal("Invalid user ID".into()))?;

    let quote = Quotation::find_by_id(id).one(&txn).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;

    if quote.status != "approved" {
        return Err(AppError::Validation("Only approved quotations can be converted to invoices".into()));
    }

    // Get quotation items
    let q_items = QuotationItem::find()
        .filter(crate::models::quotation_items::Column::QuotationId.eq(id))
        .order_by_asc(crate::models::quotation_items::Column::SortOrder)
        .all(&txn)
        .await?;

    // Generate invoice number
    let inv_count = Invoice::find().count(&txn).await?;
    let invoice_number = format!("FAC-{:05}", inv_count + 1);

    let invoice_id = Uuid::new_v4();
    let tax_rate = Decimal::from_f64_retain(0.07).unwrap();

    // Create invoice from quotation data
    let invoice = InvoiceActive {
        id: Set(invoice_id),
        invoice_number: Set(invoice_number.clone()),
        quotation_id: Set(Some(id)),
        client_id: Set(quote.client_id),
        created_by: Set(user_id),
        invoice_type: Set("credit".to_string()),
        status: Set("draft".to_string()),
        issue_date: Set(chrono::Utc::now().date_naive()),
        due_date: Set(None),
        subtotal: Set(quote.subtotal),
        tax_rate: Set(tax_rate),
        tax_amount: Set(quote.tax_amount),
        discount_amount: Set(quote.discount_amount),
        total: Set(quote.total),
        amount_paid: Set(Decimal::from(0)),
        balance_due: Set(quote.total),
        notes: Set(quote.notes.clone()),
        created_at: Set(chrono::Utc::now().naive_utc()),
        ..Default::default()
    };
    invoice.insert(&txn).await?;

    // Copy quotation items → invoice items
    for item in q_items.iter() {
        let inv_item = InvoiceItemActive {
            id: Set(Uuid::new_v4()),
            invoice_id: Set(invoice_id),
            catalog_item_id: Set(item.catalog_item_id),
            sort_order: Set(item.sort_order),
            description: Set(item.description.clone()),
            quantity: Set(item.quantity),
            unit: Set(item.unit.clone()),
            unit_price: Set(item.unit_price),
            line_total: Set(item.line_total),
            scope: Set(item.scope.clone()),
        };
        inv_item.insert(&txn).await?;
    }

    // Mark quotation as invoiced
    let mut q_update = QuotationActive {
        id: Set(id),
        ..Default::default()
    };
    q_update.status = Set("invoiced".to_string());
    q_update.update(&txn).await?;

    txn.commit().await?;

    Ok(Json(json!({
        "message": "Invoice created from quotation",
        "invoice_number": invoice_number,
        "invoice_id": invoice_id.to_string(),
    })))
}

/// GET /api/quotations/:id/pdf
pub async fn download_pdf(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<(axum::http::HeaderMap, Vec<u8>), AppError> {
    use crate::models::clients::Entity as Client;

    let quote = Quotation::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;

    let client = Client::find_by_id(quote.client_id).one(&state.db).await?
        .ok_or(AppError::NotFound("Client not found".into()))?;

    let items = QuotationItem::find()
        .filter(crate::models::quotation_items::Column::QuotationId.eq(id))
        .order_by_asc(crate::models::quotation_items::Column::SortOrder)
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
    let logo_path = logo_url.and_then(|url: String| {
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
        "COTIZACIÓN",
        &quote.quote_number,
        &(client.company_name.unwrap_or(client.contact_name)),
        &pdf_items,
        quote.subtotal.to_f64().unwrap_or(0.0),
        quote.tax_amount.to_f64().unwrap_or(0.0),
        quote.total.to_f64().unwrap_or(0.0),
    ).await?;

    // Save to storage for audit
    let filename = format!("quotations/{}.pdf", quote.quote_number);
    let _ = state.storage.save_file(&filename, &pdf_data).await;

    let mut headers = axum::http::HeaderMap::new();
    headers.insert(axum::http::header::CONTENT_TYPE, axum::http::header::HeaderValue::from_static("application/pdf"));
    headers.insert(
        axum::http::header::CONTENT_DISPOSITION,
        axum::http::header::HeaderValue::from_str(&format!("attachment; filename=\"{}.pdf\"", quote.quote_number)).unwrap(),
    );

    Ok((headers, pdf_data))
}

/// POST /api/quotations/:id/send-email
pub async fn send_email(
    State(state): State<Arc<AppState>>,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, AppError> {
    use crate::models::clients::Entity as Client;
    use crate::models::settings::{Entity as Settings};
    use crate::services::pdf_generator::BrandingInfo;

    let email_service = state.email.as_ref()
        .ok_or(AppError::Internal("Email service not configured".into()))?;

    let quote = Quotation::find_by_id(id).one(&state.db).await?
        .ok_or(AppError::NotFound("Quotation not found".into()))?;

    let client = Client::find_by_id(quote.client_id).one(&state.db).await?
        .ok_or(AppError::NotFound("Client not found".into()))?;

    let client_email = client.email.ok_or(AppError::Validation("Client has no email address".into()))?;

    // Generate PDF (internal logic)
    let items = QuotationItem::find()
        .filter(crate::models::quotation_items::Column::QuotationId.eq(id))
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
        "COTIZACIÓN",
        &quote.quote_number,
        &(client.company_name.unwrap_or(client.contact_name)),
        &pdf_items,
        quote.subtotal.to_f64().unwrap_or(0.0),
        quote.tax_amount.to_f64().unwrap_or(0.0),
        quote.total.to_f64().unwrap_or(0.0),
    ).await?;

    // Save to storage for audit
    let filename = format!("quotations/{}.pdf", quote.quote_number);
    let _ = state.storage.save_file(&filename, &pdf_data).await;

    email_service.send_quotation(&client_email, &quote.quote_number, pdf_data, &smtp_settings).await?;

    Ok(Json(json!({ "message": format!("Quotation sent to {}", client_email) })))
}
