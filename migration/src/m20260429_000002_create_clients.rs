use sea_orm_migration::prelude::*;
use super::m20260429_000001_create_users::Users;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str { "m20260429_000002_create_clients" }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Clients table
        manager.create_table(
            Table::create().table(Clients::Table).if_not_exists()
                .col(ColumnDef::new(Clients::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Clients::UserId).uuid().null())
                .col(ColumnDef::new(Clients::ClientType).string_len(20).not_null().default("residential"))
                .col(ColumnDef::new(Clients::CompanyName).string_len(255).null())
                .col(ColumnDef::new(Clients::TaxId).string_len(50).null())
                .col(ColumnDef::new(Clients::ContactName).string_len(255).not_null())
                .col(ColumnDef::new(Clients::Email).string_len(255).null())
                .col(ColumnDef::new(Clients::Phone).string_len(20).not_null())
                .col(ColumnDef::new(Clients::PhoneAlt).string_len(20).null())
                .col(ColumnDef::new(Clients::Notes).text().null())
                .col(ColumnDef::new(Clients::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(Clients::Table, Clients::UserId).to(Users::Table, Users::Id))
                .to_owned(),
        ).await?;

        // Client Locations table
        manager.create_table(
            Table::create().table(ClientLocations::Table).if_not_exists()
                .col(ColumnDef::new(ClientLocations::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(ClientLocations::ClientId).uuid().not_null())
                .col(ColumnDef::new(ClientLocations::Label).string_len(255).not_null())
                .col(ColumnDef::new(ClientLocations::Address).text().not_null())
                .col(ColumnDef::new(ClientLocations::City).string_len(100).null())
                .col(ColumnDef::new(ClientLocations::Province).string_len(100).null())
                .col(ColumnDef::new(ClientLocations::Latitude).double().null())
                .col(ColumnDef::new(ClientLocations::Longitude).double().null())
                .col(ColumnDef::new(ClientLocations::IsPrimary).boolean().not_null().default(false))
                .foreign_key(ForeignKey::create()
                    .from(ClientLocations::Table, ClientLocations::ClientId)
                    .to(Clients::Table, Clients::Id)
                    .on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(ClientLocations::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Clients::Table).to_owned()).await
    }
}

#[derive(Iden)]
pub enum Clients {
    Table, Id, UserId, ClientType, CompanyName, TaxId,
    ContactName, Email, Phone, PhoneAlt, Notes, CreatedAt,
}

#[derive(Iden)]
pub enum ClientLocations {
    Table, Id, ClientId, Label, Address, City, Province,
    Latitude, Longitude, IsPrimary,
}
