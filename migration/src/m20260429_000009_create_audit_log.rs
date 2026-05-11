use sea_orm_migration::prelude::*;
use super::m20260429_000001_create_users::Users;

pub struct Migration;
impl MigrationName for Migration { fn name(&self) -> &str { "m20260429_000009_create_audit_log" } }

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(AuditLog::Table).if_not_exists()
                .col(ColumnDef::new(AuditLog::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(AuditLog::UserId).uuid().not_null())
                .col(ColumnDef::new(AuditLog::EntityType).string_len(50).not_null())
                .col(ColumnDef::new(AuditLog::EntityId).uuid().not_null())
                .col(ColumnDef::new(AuditLog::Action).string_len(20).not_null())
                .col(ColumnDef::new(AuditLog::OldValues).json_binary().null())
                .col(ColumnDef::new(AuditLog::NewValues).json_binary().null())
                .col(ColumnDef::new(AuditLog::IpAddress).string_len(45).null())
                .col(ColumnDef::new(AuditLog::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .foreign_key(ForeignKey::create().from(AuditLog::Table, AuditLog::UserId).to(Users::Table, Users::Id))
                .to_owned(),
        ).await?;

        manager.create_index(
            Index::create().name("idx_audit_entity").table(AuditLog::Table)
                .col(AuditLog::EntityType).col(AuditLog::EntityId).to_owned()
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(AuditLog::Table).to_owned()).await
    }
}

#[derive(Iden)]
pub enum AuditLog {
    Table, Id, UserId, EntityType, EntityId, Action,
    OldValues, NewValues, IpAddress, CreatedAt,
}
