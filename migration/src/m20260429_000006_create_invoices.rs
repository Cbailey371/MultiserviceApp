use sea_orm_migration::prelude::*;
use super::m20260429_000001_create_users::Users;
use super::m20260429_000002_create_clients::Clients;

pub struct Migration;
impl MigrationName for Migration { fn name(&self) -> &str { "m20260429_000006_create_invoices" } }

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(Invoices::Table).if_not_exists()
                .col(ColumnDef::new(Invoices::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Invoices::InvoiceNumber).string_len(20).not_null().unique_key())
                .col(ColumnDef::new(Invoices::QuotationId).uuid().null())
                .col(ColumnDef::new(Invoices::ClientId).uuid().not_null())
                .col(ColumnDef::new(Invoices::CreatedBy).uuid().not_null())
                .col(ColumnDef::new(Invoices::InvoiceType).string_len(10).not_null().default("cash"))
                .col(ColumnDef::new(Invoices::Status).string_len(20).not_null().default("draft"))
                .col(ColumnDef::new(Invoices::IssueDate).date().not_null())
                .col(ColumnDef::new(Invoices::DueDate).date().null())
                .col(ColumnDef::new(Invoices::Subtotal).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Invoices::TaxRate).decimal_len(5, 4).not_null().default(0.07))
                .col(ColumnDef::new(Invoices::TaxAmount).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Invoices::DiscountAmount).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Invoices::Total).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Invoices::AmountPaid).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Invoices::BalanceDue).decimal_len(12, 2).not_null().default(0))
                .col(ColumnDef::new(Invoices::Notes).text().null())
                .col(ColumnDef::new(Invoices::PdfPath).string_len(500).null())
                .col(ColumnDef::new(Invoices::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(Invoices::Table, Invoices::ClientId).to(Clients::Table, Clients::Id))
                .foreign_key(ForeignKey::create().from(Invoices::Table, Invoices::CreatedBy).to(Users::Table, Users::Id))
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create().table(InvoiceItems::Table).if_not_exists()
                .col(ColumnDef::new(InvoiceItems::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(InvoiceItems::InvoiceId).uuid().not_null())
                .col(ColumnDef::new(InvoiceItems::CatalogItemId).uuid().null())
                .col(ColumnDef::new(InvoiceItems::SortOrder).integer().not_null().default(0))
                .col(ColumnDef::new(InvoiceItems::Description).text().not_null())
                .col(ColumnDef::new(InvoiceItems::Quantity).decimal_len(10, 2).not_null())
                .col(ColumnDef::new(InvoiceItems::Unit).string_len(20).not_null())
                .col(ColumnDef::new(InvoiceItems::UnitPrice).decimal_len(12, 2).not_null())
                .col(ColumnDef::new(InvoiceItems::LineTotal).decimal_len(12, 2).not_null())
                .foreign_key(ForeignKey::create()
                    .from(InvoiceItems::Table, InvoiceItems::InvoiceId)
                    .to(Invoices::Table, Invoices::Id).on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create().table(Payments::Table).if_not_exists()
                .col(ColumnDef::new(Payments::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Payments::InvoiceId).uuid().not_null())
                .col(ColumnDef::new(Payments::RegisteredBy).uuid().not_null())
                .col(ColumnDef::new(Payments::Amount).decimal_len(12, 2).not_null())
                .col(ColumnDef::new(Payments::PaymentMethod).string_len(20).not_null())
                .col(ColumnDef::new(Payments::ReferenceNumber).string_len(100).null())
                .col(ColumnDef::new(Payments::PaymentDate).date().not_null())
                .col(ColumnDef::new(Payments::Notes).text().null())
                .col(ColumnDef::new(Payments::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(Payments::Table, Payments::InvoiceId).to(Invoices::Table, Invoices::Id))
                .to_owned(),
        ).await?;

        manager.get_connection().execute_unprepared("CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;").await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Payments::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(InvoiceItems::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Invoices::Table).to_owned()).await?;
        manager.get_connection().execute_unprepared("DROP SEQUENCE IF EXISTS invoice_number_seq;").await?;
        Ok(())
    }
}

#[derive(Iden)]
pub enum Invoices {
    Table, Id, InvoiceNumber, QuotationId, ClientId, CreatedBy, InvoiceType,
    Status, IssueDate, DueDate, Subtotal, TaxRate, TaxAmount, DiscountAmount,
    Total, AmountPaid, BalanceDue, Notes, PdfPath, CreatedAt,
}
#[derive(Iden)]
pub enum InvoiceItems { Table, Id, InvoiceId, CatalogItemId, SortOrder, Description, Quantity, Unit, UnitPrice, LineTotal }
#[derive(Iden)]
pub enum Payments { Table, Id, InvoiceId, RegisteredBy, Amount, PaymentMethod, ReferenceNumber, PaymentDate, Notes, CreatedAt }
