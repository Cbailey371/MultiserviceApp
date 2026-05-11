use sea_orm_migration::prelude::*;
use super::m20260429_000001_create_users::Users;
use super::m20260429_000002_create_clients::Clients;

pub struct Migration;
impl MigrationName for Migration { fn name(&self) -> &str { "m20260429_000005_create_quotations" } }

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(Quotations::Table).if_not_exists()
                .col(ColumnDef::new(Quotations::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Quotations::QuoteNumber).string_len(20).not_null().unique_key())
                .col(ColumnDef::new(Quotations::ClientId).uuid().not_null())
                .col(ColumnDef::new(Quotations::LocationId).uuid().null())
                .col(ColumnDef::new(Quotations::CreatedBy).uuid().not_null())
                .col(ColumnDef::new(Quotations::Status).string_len(20).not_null().default("draft"))
                .col(ColumnDef::new(Quotations::ValidUntil).date().null())
                .col(ColumnDef::new(Quotations::Subtotal).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Quotations::TaxAmount).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Quotations::DiscountAmount).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Quotations::Total).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Quotations::Notes).text().null())
                .col(ColumnDef::new(Quotations::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .col(ColumnDef::new(Quotations::ApprovedAt).timestamp().null())
                .foreign_key(ForeignKey::create().from(Quotations::Table, Quotations::ClientId).to(Clients::Table, Clients::Id))
                .foreign_key(ForeignKey::create().from(Quotations::Table, Quotations::CreatedBy).to(Users::Table, Users::Id))
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create().table(QuotationItems::Table).if_not_exists()
                .col(ColumnDef::new(QuotationItems::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(QuotationItems::QuotationId).uuid().not_null())
                .col(ColumnDef::new(QuotationItems::CatalogItemId).uuid().null())
                .col(ColumnDef::new(QuotationItems::SortOrder).integer().not_null().default(0))
                .col(ColumnDef::new(QuotationItems::Description).text().not_null())
                .col(ColumnDef::new(QuotationItems::Quantity).decimal_len(10, 2).not_null())
                .col(ColumnDef::new(QuotationItems::Unit).string_len(20).not_null().default("unidad"))
                .col(ColumnDef::new(QuotationItems::UnitPrice).decimal_len(12, 2).not_null())
                .col(ColumnDef::new(QuotationItems::CostPrice).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(QuotationItems::DiscountPercent).decimal_len(5, 2).not_null().default(0))
                .col(ColumnDef::new(QuotationItems::LineTotal).decimal_len(12, 2).not_null())
                .foreign_key(ForeignKey::create()
                    .from(QuotationItems::Table, QuotationItems::QuotationId)
                    .to(Quotations::Table, Quotations::Id)
                    .on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        manager.get_connection().execute_unprepared("CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;").await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(QuotationItems::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Quotations::Table).to_owned()).await?;
        manager.get_connection().execute_unprepared("DROP SEQUENCE IF EXISTS quote_number_seq;").await?;
        Ok(())
    }
}

#[derive(Iden)]
pub enum Quotations {
    Table, Id, QuoteNumber, ClientId, LocationId, CreatedBy, Status,
    ValidUntil, Subtotal, TaxAmount, DiscountAmount, Total, Notes, CreatedAt, ApprovedAt,
}

#[derive(Iden)]
pub enum QuotationItems {
    Table, Id, QuotationId, CatalogItemId, SortOrder, Description,
    Quantity, Unit, UnitPrice, CostPrice, DiscountPercent, LineTotal,
}
