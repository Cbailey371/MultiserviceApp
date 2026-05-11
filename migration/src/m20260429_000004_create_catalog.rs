use sea_orm_migration::prelude::*;

pub struct Migration;
impl MigrationName for Migration { fn name(&self) -> &str { "m20260429_000004_create_catalog" } }

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(CatalogItems::Table).if_not_exists()
                .col(ColumnDef::new(CatalogItems::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(CatalogItems::ItemType).string_len(20).not_null())
                .col(ColumnDef::new(CatalogItems::Name).string_len(255).not_null())
                .col(ColumnDef::new(CatalogItems::Description).text().null())
                .col(ColumnDef::new(CatalogItems::Specialty).string_len(30).not_null().default("general"))
                .col(ColumnDef::new(CatalogItems::UnitPrice).decimal_len(12, 2).not_null())
                .col(ColumnDef::new(CatalogItems::CostPrice).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(CatalogItems::Unit).string_len(20).not_null().default("unidad"))
                .col(ColumnDef::new(CatalogItems::IsActive).boolean().not_null().default(true))
                .col(ColumnDef::new(CatalogItems::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .to_owned(),
        ).await
    }
    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(CatalogItems::Table).to_owned()).await
    }
}

#[derive(Iden)]
pub enum CatalogItems {
    Table, Id, ItemType, Name, Description, Specialty,
    UnitPrice, CostPrice, Unit, IsActive, CreatedAt,
}
