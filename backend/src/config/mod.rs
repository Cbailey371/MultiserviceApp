use serde::Deserialize;

#[derive(Clone, Debug, Deserialize)]
pub struct AppConfig {
    pub app_name: String,
    pub app_env: String,
    pub app_port: u16,
    pub app_host: String,
    pub app_tenancy: String,
    pub database_url: String,
    pub jwt_secret: String,
    pub jwt_expiration_hours: u64,
    pub storage_type: String,
    pub storage_path: String,
    pub tax_rate: f64,
    pub tax_name: String,
    pub currency: String,
    pub smtp_host: Option<String>,
    pub smtp_port: Option<u16>,
    pub smtp_user: Option<String>,
    pub smtp_password: Option<String>,
    pub smtp_from: Option<String>,
}

impl AppConfig {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenvy::dotenv().ok();

        Ok(Self {
            app_name: std::env::var("APP_NAME").unwrap_or_else(|_| "MultiServicePro".into()),
            app_env: std::env::var("APP_ENV").unwrap_or_else(|_| "development".into()),
            app_port: std::env::var("APP_PORT")
                .unwrap_or_else(|_| "3001".into())
                .parse()?,
            app_host: std::env::var("APP_HOST").unwrap_or_else(|_| "0.0.0.0".into()),
            app_tenancy: std::env::var("APP_TENANCY").unwrap_or_else(|_| "LOCAL".into()),
            database_url: std::env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set"),
            jwt_secret: std::env::var("JWT_SECRET")
                .expect("JWT_SECRET must be set"),
            jwt_expiration_hours: std::env::var("JWT_EXPIRATION_HOURS")
                .unwrap_or_else(|_| "24".into())
                .parse()?,
            storage_type: std::env::var("STORAGE_TYPE").unwrap_or_else(|_| "LOCAL".into()),
            storage_path: {
                let p = std::env::var("STORAGE_PATH").unwrap_or_else(|_| "./data/uploads".into());
                // Try to make it absolute relative to current dir
                std::path::Path::new(&p).canonicalize()
                    .map(|cp| cp.to_string_lossy().to_string())
                    .unwrap_or(p)
            },
            tax_rate: std::env::var("TAX_RATE")
                .unwrap_or_else(|_| "0.07".into())
                .parse()?,
            tax_name: std::env::var("TAX_NAME").unwrap_or_else(|_| "ITBMS".into()),
            currency: std::env::var("CURRENCY").unwrap_or_else(|_| "USD".into()),
            smtp_host: std::env::var("SMTP_HOST").ok(),
            smtp_port: std::env::var("SMTP_PORT").ok().and_then(|p| p.parse().ok()),
            smtp_user: std::env::var("SMTP_USER").ok().filter(|s| !s.is_empty()),
            smtp_password: std::env::var("SMTP_PASSWORD").ok().filter(|s| !s.is_empty()),
            smtp_from: std::env::var("SMTP_FROM").ok(),
        })
    }
}
