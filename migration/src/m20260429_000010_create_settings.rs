use sea_orm_migration::prelude::*;

pub struct Migration;
impl MigrationName for Migration { fn name(&self) -> &str { "m20260429_000010_create_settings" } }

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.create_table(
            Table::create().table(Settings::Table).if_not_exists()
                .col(ColumnDef::new(Settings::Id).uuid().not_null().primary_key())
                .col(ColumnDef::new(Settings::Key).string_len(100).not_null().unique_key())
                .col(ColumnDef::new(Settings::Value).text().null())
                .col(ColumnDef::new(Settings::Description).string_len(255).null())
                .col(ColumnDef::new(Settings::UpdatedAt).timestamp().not_null().default(Expr::current_timestamp()))
                .to_owned()
        ).await
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager.drop_table(Table::drop().table(Settings::Table).to_owned()).await
    }
}

#[derive(Iden)]
pub enum Settings {
    Table,
    Id,
    Key,
    Value,
    Description,
    UpdatedAt,
}
