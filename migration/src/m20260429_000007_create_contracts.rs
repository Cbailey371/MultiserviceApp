use sea_orm_migration::prelude::*;
use super::m20260429_000002_create_clients::Clients;

pub struct Migration;
impl MigrationName for Migration { fn name(&self) -> &str { "m20260429_000007_create_contracts" } }

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(Contracts::Table).if_not_exists()
                .col(ColumnDef::new(Contracts::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Contracts::ContractNumber).string_len(20).not_null().unique_key())
                .col(ColumnDef::new(Contracts::ClientId).uuid().not_null())
                .col(ColumnDef::new(Contracts::Specialty).string_len(30).not_null())
                .col(ColumnDef::new(Contracts::Frequency).string_len(20).not_null())
                .col(ColumnDef::new(Contracts::StartDate).date().not_null())
                .col(ColumnDef::new(Contracts::EndDate).date().not_null())
                .col(ColumnDef::new(Contracts::MonthlyPrice).decimal_len(12, 2).not_null())
                .col(ColumnDef::new(Contracts::VisitsPerPeriod).integer().not_null().default(1))
                .col(ColumnDef::new(Contracts::Status).string_len(20).not_null().default("active"))
                .col(ColumnDef::new(Contracts::ScopeOfWork).text().null())
                .col(ColumnDef::new(Contracts::Notes).text().null())
                .col(ColumnDef::new(Contracts::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(Contracts::Table, Contracts::ClientId).to(Clients::Table, Clients::Id))
                .to_owned(),
        ).await?;

        manager.create_table(
            Table::create().table(ContractSchedules::Table).if_not_exists()
                .col(ColumnDef::new(ContractSchedules::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(ContractSchedules::ContractId).uuid().not_null())
                .col(ColumnDef::new(ContractSchedules::WorkOrderId).uuid().null())
                .col(ColumnDef::new(ContractSchedules::ScheduledDate).date().not_null())
                .col(ColumnDef::new(ContractSchedules::Status).string_len(20).not_null().default("pending"))
                .col(ColumnDef::new(ContractSchedules::AssignedTo).uuid().null())
                .col(ColumnDef::new(ContractSchedules::Notes).text().null())
                .foreign_key(ForeignKey::create()
                    .from(ContractSchedules::Table, ContractSchedules::ContractId)
                    .to(Contracts::Table, Contracts::Id).on_delete(ForeignKeyAction::Cascade))
                .to_owned(),
        ).await?;

        manager.get_connection().execute_unprepared("CREATE SEQUENCE IF NOT EXISTS contract_number_seq START 1;").await?;
        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(ContractSchedules::Table).to_owned()).await?;
        manager.drop_table(Table::drop().table(Contracts::Table).to_owned()).await?;
        Ok(())
    }
}

#[derive(Iden)]
pub enum Contracts {
    Table, Id, ContractNumber, ClientId, Specialty, Frequency,
    StartDate, EndDate, MonthlyPrice, VisitsPerPeriod, Status, ScopeOfWork, Notes, CreatedAt,
}
#[derive(Iden)]
pub enum ContractSchedules { Table, Id, ContractId, WorkOrderId, ScheduledDate, Status, AssignedTo, Notes }
