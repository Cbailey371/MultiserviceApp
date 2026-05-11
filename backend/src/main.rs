use axum::{
    Router,
    routing::{get, post, put, delete, patch},
    http::Method,
    middleware,
};
use sea_orm::Database;
use std::sync::Arc;
use tower_http::cors::{CorsLayer, Any};
use tower_http::trace::TraceLayer;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

mod config;
mod auth;
mod models;
mod handlers;
mod services;
mod errors;
mod cron;

pub use errors::AppError;
use crate::services::pdf_generator::PdfGenerator;
use crate::services::email_service::EmailService;
use crate::services::storage_service::StorageService;

/// Application state shared across all handlers
#[derive(Clone)]
pub struct AppState {
    pub db: sea_orm::DatabaseConnection,
    pub config: config::AppConfig,
    pub pdf: Arc<PdfGenerator>,
    pub email: Option<Arc<EmailService>>,
    pub storage: Arc<StorageService>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env()
            .unwrap_or_else(|_| "multiservice_backend=debug,tower_http=debug".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Load configuration
    let config = config::AppConfig::from_env()?;
    tracing::info!("🚀 Starting MultiService Pro API v{}", env!("CARGO_PKG_VERSION"));
    tracing::info!("📦 Environment: {}", config.app_env);

    // Connect to database
    let db = Database::connect(&config.database_url).await?;
    tracing::info!("✅ Database connected successfully");

    // Initialize Services
    let storage = Arc::new(StorageService::new(&config.storage_path));
    storage.init().await?;

    let pdf = Arc::new(PdfGenerator::new());
    
    let email = if let (Some(host), Some(port), Some(user), Some(pass), Some(from)) = (
        &config.smtp_host, config.smtp_port, &config.smtp_user, &config.smtp_password, &config.smtp_from
    ) {
        tracing::info!("✉️ Email service initialized from Env (SMTP: {})", host);
        Some(Arc::new(EmailService::new(host, port, user, pass, from)))
    } else {
        tracing::info!("✉️ Email service initialized (Waiting for DB configuration)");
        Some(Arc::new(EmailService::new_empty()))
    };

    // Build shared state
    let state = Arc::new(AppState {
        db,
        config: config.clone(),
        pdf,
        email,
        storage,
    });

    // Initialize Scheduler
    cron::init_scheduler(Arc::clone(&state)).await?;

    // CORS configuration
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE, Method::PATCH])
        .allow_headers(Any);

    // Static file serving for uploads
    let uploads_service = tower_http::services::ServeDir::new(&config.storage_path);

    // Build routes
    let app = Router::new()
        .nest("/api", 
            Router::new()
                .route("/health", get(handlers::health::health_check))
                .route("/auth/login", post(handlers::auth::login))
                .route("/auth/register", post(handlers::auth::register))
                .merge(protected_routes())
                .nest_service("/uploads", uploads_service)
        )
        .layer(TraceLayer::new_for_http())
        .layer(cors)
        .layer(axum::extract::DefaultBodyLimit::max(10 * 1024 * 1024)) // Limit 10MB
        .with_state(state);

    let addr = format!("{}:{}", config.app_host, config.app_port);
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    tracing::info!("🌐 Server listening on http://{}", addr);

    axum::serve(listener, app).await?;

    Ok(())
}

fn protected_routes() -> Router<Arc<AppState>> {
    Router::new()
        // Users
        .route("/users", get(handlers::users::list_users))
        .route("/users", post(handlers::users::create_user))
        .route("/users/:id", get(handlers::users::get_user))
        .route("/users/:id", put(handlers::users::update_user))

        // Clients
        .route("/clients", get(handlers::clients::list_clients))
        .route("/clients", post(handlers::clients::create_client))
        .route("/clients/:id", get(handlers::clients::get_client))
        .route("/clients/:id", put(handlers::clients::update_client))
        .route("/clients/:id", delete(handlers::clients::delete_client))
        .route("/clients/:id/locations", get(handlers::clients::list_locations))
        .route("/clients/:id/locations", post(handlers::clients::create_location))

        // Assets
        .route("/assets", get(handlers::assets::list_assets))
        .route("/assets", post(handlers::assets::create_asset))
        .route("/assets/:id", get(handlers::assets::get_asset))
        .route("/assets/:id", put(handlers::assets::update_asset))
        .route("/assets/:id/history", get(handlers::assets::get_history))

        // Catalog
        .route("/catalog", get(handlers::catalog::list_items))
        .route("/catalog", post(handlers::catalog::create_item))
        .route("/catalog/:id", put(handlers::catalog::update_item))

        // Settings
        .route("/settings", get(handlers::settings::get_settings))
        .route("/settings", put(handlers::settings::update_settings))
        .route("/settings/logo", post(handlers::settings::upload_logo))
        .route("/settings/test-email", post(handlers::settings::test_email))

        // Reports
        .route("/reports/financial", get(handlers::reports::get_financial_report))
        .route("/reports/operational", get(handlers::reports::get_operational_report))
        .route("/reports/clients", get(handlers::reports::get_clients_report))
        .route("/reports/export/clients", get(handlers::reports::export_clients))
        .route("/reports/export/invoices", get(handlers::reports::export_invoices))
        .route("/reports/export/quotations", get(handlers::reports::export_quotations))
        .route("/reports/export/contracts", get(handlers::reports::export_contracts))
        .route("/reports/export/catalog", get(handlers::reports::export_catalog))
        .route("/reports/export/work-orders", get(handlers::reports::export_work_orders))

        // Quotations
        .route("/quotations", get(handlers::quotations::list_quotations))
        .route("/quotations", post(handlers::quotations::create_quotation))
        .route("/quotations/:id", get(handlers::quotations::get_quotation))
        .route("/quotations/:id", put(handlers::quotations::update_quotation))
        .route("/quotations/:id/items", post(handlers::quotations::add_item))
        .route("/quotations/:id/items/:item_id", put(handlers::quotations::update_item))
        .route("/quotations/:id/items/:item_id", delete(handlers::quotations::remove_item))
        .route("/quotations/:id/approve", post(handlers::quotations::approve))
        .route("/quotations/:id/reject", post(handlers::quotations::reject))
        .route("/quotations/:id/status", put(handlers::quotations::update_status))
        .route("/quotations/:id/convert", post(handlers::quotations::convert_to_invoice))
        .route("/quotations/:id/pdf", get(handlers::quotations::download_pdf))
        .route("/quotations/:id/send-email", post(handlers::quotations::send_email))

        // Invoices
        .route("/invoices", get(handlers::invoices::list_invoices))
        .route("/invoices", post(handlers::invoices::create_invoice))
        .route("/invoices/:id", get(handlers::invoices::get_invoice))
        .route("/invoices/:id/payments", post(handlers::invoices::register_payment))
        .route("/invoices/:id/pdf", get(handlers::invoices::download_pdf))
        .route("/invoices/:id/send-email", post(handlers::invoices::send_email))

        // Contracts
        .route("/contracts", get(handlers::contracts::list_contracts))
        .route("/contracts", post(handlers::contracts::create_contract))
        .route("/contracts/:id", get(handlers::contracts::get_contract))
        .route("/contracts/:id", patch(handlers::contracts::update_contract))
        .route("/contracts/:id", delete(handlers::contracts::delete_contract))
        .route("/contracts/:id/schedules", get(handlers::contracts::list_schedules))

        // Work Orders
        .route("/work-orders", get(handlers::work_orders::list_work_orders))
        .route("/work-orders", post(handlers::work_orders::create_work_order))
        .route("/work-orders/:id", get(handlers::work_orders::get_work_order))
        .route("/work-orders/:id", put(handlers::work_orders::update_work_order))
        .route("/work-orders/:id/complete", post(handlers::work_orders::complete))
        
        // Calendar
        .route("/calendar/events", get(handlers::calendar::list_events))

        // Work Orders Extras
        .route("/work-orders/:id/photos", post(handlers::work_orders::upload_photo))
        .route("/work-orders/:id/sign", post(handlers::work_orders::client_signature))


        // Dashboard
        .route("/dashboard/kpis", get(handlers::dashboard::get_kpis))

        // Apply auth middleware to all protected routes
        .layer(middleware::from_fn(auth::middleware::require_auth))
}
