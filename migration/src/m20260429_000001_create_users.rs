use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260429_000001_create_users"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create()
                .table(Users::Table)
                .if_not_exists()
                .col(ColumnDef::new(Users::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Users::Email).string_len(255).not_null().unique_key())
                .col(ColumnDef::new(Users::PasswordHash).string_len(512).not_null())
                .col(ColumnDef::new(Users::Role).string_len(20).not_null().default("technician"))
                .col(ColumnDef::new(Users::FullName).string_len(255).not_null())
                .col(ColumnDef::new(Users::Phone).string_len(20).null())
                .col(ColumnDef::new(Users::IsActive).boolean().not_null().default(true))
                .col(ColumnDef::new(Users::CreatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .to_owned(),
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Users::Table).to_owned()).await
    }
}

#[derive(Iden)]
pub enum Users {
    Table,
    Id,
    Email,
    PasswordHash,
    Role,
    FullName,
    Phone,
    IsActive,
    CreatedAt,
}
