use sea_orm_migration::prelude::*;

pub struct Migration;

impl MigrationName for Migration {
    fn name(&self) -> &str {
        "m20260505_000001_add_scope_to_quotation_items"
    }
}

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("quotation_items"))
                    .add_column(ColumnDef::new(Alias::new("scope")).text())
                    .to_owned(),
            )
            .await?;
        
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("invoice_items"))
                    .add_column(ColumnDef::new(Alias::new("scope")).text())
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("quotation_items"))
                    .drop_column(Alias::new("scope"))
                    .to_owned(),
            )
            .await?;
            
        manager
            .alter_table(
                Table::alter()
                    .table(Alias::new("invoice_items"))
                    .drop_column(Alias::new("scope"))
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}
