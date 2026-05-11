use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "invoice_items")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub catalog_item_id: Option<Uuid>,
    pub sort_order: i32,
    #[sea_orm(column_type = "Text")]
    pub description: String,
    pub quantity: Decimal,
    pub unit: String,
    pub unit_price: Decimal,
    pub line_total: Decimal,
    #[sea_orm(column_type = "Text", nullable)]
    pub scope: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::invoices::Entity",
        from = "Column::InvoiceId",
        to = "super::invoices::Column::Id",
        on_delete = "Cascade"
    )]
    Invoice,
}

impl Related<super::invoices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Invoice.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
