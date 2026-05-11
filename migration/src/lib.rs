use sea_orm_migration::prelude::*;

mod m20260429_000001_create_users;
mod m20260429_000002_create_clients;
mod m20260429_000003_create_assets;
mod m20260429_000004_create_catalog;
mod m20260429_000005_create_quotations;
mod m20260429_000006_create_invoices;
mod m20260429_000007_create_contracts;
mod m20260429_000008_create_work_orders;
mod m20260429_000009_create_audit_log;
mod m20260429_000010_create_settings;
mod m20260505_000001_add_scope_to_quotation_items;
mod m20260510_000001_add_dv_to_clients;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20260429_000001_create_users::Migration),
            Box::new(m20260429_000002_create_clients::Migration),
            Box::new(m20260429_000003_create_assets::Migration),
            Box::new(m20260429_000004_create_catalog::Migration),
            Box::new(m20260429_000005_create_quotations::Migration),
            Box::new(m20260429_000006_create_invoices::Migration),
            Box::new(m20260429_000007_create_contracts::Migration),
            Box::new(m20260429_000008_create_work_orders::Migration),
            Box::new(m20260429_000009_create_audit_log::Migration),
            Box::new(m20260429_000010_create_settings::Migration),
            Box::new(m20260505_000001_add_scope_to_quotation_items::Migration),
            Box::new(m20260510_000001_add_dv_to_clients::Migration),
        ]
    }
}
