use sea_orm_migration::prelude::*;
use super::m20260429_000002_create_clients::{Clients, ClientLocations};

pub struct Migration;
impl MigrationName for Migration {
    fn name(&self) -> &str { "m20260429_000003_create_assets" }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(Assets::Table).if_not_exists()
                .col(ColumnDef::new(Assets::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Assets::ClientId).uuid().not_null())
                .col(ColumnDef::new(Assets::LocationId).uuid().null())
                .col(ColumnDef::new(Assets::Specialty).string_len(30).not_null())
                .col(ColumnDef::new(Assets::AssetType).string_len(50).null())
                .col(ColumnDef::new(Assets::Brand).string_len(100).null())
                .col(ColumnDef::new(Assets::ModelName).string_len(100).null())
                .col(ColumnDef::new(Assets::SerialNumber).string_len(100).null())
                .col(ColumnDef::new(Assets::CapacityBtu).integer().null())
                .col(ColumnDef::new(Assets::CapacityElectrical).string_len(50).null())
                .col(ColumnDef::new(Assets::InstallationDate).date().null())
                .col(ColumnDef::new(Assets::WarrantyExpiry).date().null())
                .col(ColumnDef::new(Assets::Status).string_len(20).not_null().default("active"))
                .col(ColumnDef::new(Assets::CustomFields).json_binary().null())
                .col(ColumnDef::new(Assets::Notes).text().null())
                .col(ColumnDef::new(Assets::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(Assets::Table, Assets::ClientId).to(Clients::Table, Clients::Id).on_delete(ForeignKeyAction::Cascade))
                .foreign_key(ForeignKey::create().from(Assets::Table, Assets::LocationId).to(ClientLocations::Table, ClientLocations::Id))
                .to_owned(),
        ).await?;

        // Asset History
        manager.create_table(
            Table::create().table(AssetHistory::Table).if_not_exists()
                .col(ColumnDef::new(AssetHistory::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(AssetHistory::AssetId).uuid().not_null())
                .col(ColumnDef::new(AssetHistory::WorkOrderId).uuid().null())
                .col(ColumnDef::new(AssetHistory::EventType).string_len(30).not_null())
                .col(ColumnDef::new(AssetHistory::Description).text().null())
                .col(ColumnDef::new(AssetHistory::EventDate).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(AssetHistory::Table, AssetHistory::AssetId).to(Assets::Table, Assets::Id).on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        // Index for fast client lookup
        manager.create_index(
            Index::create().name("idx_assets_client").table(Assets::Table).col(Assets::ClientId).to_owned()
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(AssetHistory::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Assets::Table).to_owned()).await
    }
}

#[derive(Iden)]
pub enum Assets {
    Table, Id, ClientId, LocationId, Specialty, AssetType, Brand,
    ModelName, SerialNumber, CapacityBtu, CapacityElectrical,
    InstallationDate, WarrantyExpiry, Status, CustomFields, Notes, CreatedAt,
}

#[derive(Iden)]
pub enum AssetHistory {
    Table, Id, AssetId, WorkOrderId, EventType, Description, EventDate,
}
