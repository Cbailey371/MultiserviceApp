use sea_orm_migration::prelude::*;
use super::m20260429_000001_create_users::Users;
use super::m20260429_000002_create_clients::Clients;

pub struct Migration;
impl MigrationName for Migration { fn name(&self) -> &str { "m20260429_000008_create_work_orders" } }

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(WorkOrders::Table).if_not_exists()
                .col(ColumnDef::new(WorkOrders::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(WorkOrders::WoNumber).string_len(20).not_null().unique_key())
                .col(ColumnDef::new(WorkOrders::ClientId).uuid().not_null())
                .col(ColumnDef::new(WorkOrders::LocationId).uuid().null())
                .col(ColumnDef::new(WorkOrders::AssignedTo).uuid().not_null())
                .col(ColumnDef::new(WorkOrders::CreatedBy).uuid().not_null())
                .col(ColumnDef::new(WorkOrders::ContractScheduleId).uuid().null())
                .col(ColumnDef::new(WorkOrders::QuotationId).uuid().null())
                .col(ColumnDef::new(WorkOrders::WorkType).string_len(30).not_null())
                .col(ColumnDef::new(WorkOrders::Specialty).string_len(30).not_null())
                .col(ColumnDef::new(WorkOrders::Priority).string_len(10).not_null().default("medium"))
                .col(ColumnDef::new(WorkOrders::Status).string_len(20).not_null().default("pending"))
                .col(ColumnDef::new(WorkOrders::ScheduledDate).date().not_null())
                .col(ColumnDef::new(WorkOrders::ScheduledTimeStart).time().null())
                .col(ColumnDef::new(WorkOrders::ScheduledTimeEnd).time().null())
                .col(ColumnDef::new(WorkOrders::StartedAt).timestamp().null())
                .col(ColumnDef::new(WorkOrders::CompletedAt).timestamp().null())
                .col(ColumnDef::new(WorkOrders::Description).text().null())
                .col(ColumnDef::new(WorkOrders::TechnicianNotes).text().null())
                .col(ColumnDef::new(WorkOrders::ClientSignature).text().null())
                .col(ColumnDef::new(WorkOrders::ReportPdfPath).string_len(500).null())
                .col(ColumnDef::new(WorkOrders::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(WorkOrders::Table, WorkOrders::ClientId).to(Clients::Table, Clients::Id))
                .foreign_key(ForeignKey::create().from(WorkOrders::Table, WorkOrders::AssignedTo).to(Users::Table, Users::Id))
                .foreign_key(ForeignKey::create().from(WorkOrders::Table, WorkOrders::CreatedBy).to(Users::Table, Users::Id))
                .to_owned(),
        ).await?;

        // Work Order Assets junction
        manager.create_table(
            Table::create().table(WorkOrderAssets::Table).if_not_exists()
                .col(ColumnDef::new(WorkOrderAssets::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(WorkOrderAssets::WorkOrderId).uuid().not_null())
                .col(ColumnDef::new(WorkOrderAssets::AssetId).uuid().not_null())
                .col(ColumnDef::new(WorkOrderAssets::Findings).text().null())
                .col(ColumnDef::new(WorkOrderAssets::ActionsTaken).text().null())
                .foreign_key(ForeignKey::create().from(WorkOrderAssets::Table, WorkOrderAssets::WorkOrderId).to(WorkOrders::Table, WorkOrders::Id).on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        // Work Order Photos
        manager.create_table(
            Table::create().table(WorkOrderPhotos::Table).if_not_exists()
                .col(ColumnDef::new(WorkOrderPhotos::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(WorkOrderPhotos::WorkOrderId).uuid().not_null())
                .col(ColumnDef::new(WorkOrderPhotos::FilePath).string_len(500).not_null())
                .col(ColumnDef::new(WorkOrderPhotos::Caption).string_len(255).null())
                .col(ColumnDef::new(WorkOrderPhotos::PhotoType).string_len(10).not_null().default("during"))
                .col(ColumnDef::new(WorkOrderPhotos::UploadedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(WorkOrderPhotos::Table, WorkOrderPhotos::WorkOrderId).to(WorkOrders::Table, WorkOrders::Id).on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        manager.get_connection().execute_unprepared("CREATE SEQUENCE IF NOT EXISTS work_order_number_seq START 1;").await?;
        manager.create_index(Index::create().name("idx_wo_scheduled").table(WorkOrders::Table).col(WorkOrders::ScheduledDate).col(WorkOrders::Status).to_owned()).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(WorkOrderPhotos::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(WorkOrderAssets::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(WorkOrders::Table).to_owned()).await?;
        Ok(())
    }
}

#[derive(Iden)]
pub enum WorkOrders {
    Table, Id, WoNumber, ClientId, LocationId, AssignedTo, CreatedBy,
    ContractScheduleId, QuotationId, WorkType, Specialty, Priority, Status,
    ScheduledDate, ScheduledTimeStart, ScheduledTimeEnd, StartedAt, CompletedAt,
    Description, TechnicianNotes, ClientSignature, ReportPdfPath, CreatedAt,
}
#[derive(Iden)]
pub enum WorkOrderAssets { Table, Id, WorkOrderId, AssetId, Findings, ActionsTaken }
#[derive(Iden)]
pub enum WorkOrderPhotos { Table, Id, WorkOrderId, FilePath, Caption, PhotoType, UploadedAt }
