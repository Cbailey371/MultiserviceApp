use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "payments")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub invoice_id: Uuid,
    pub registered_by: Uuid,
    pub amount: Decimal,
    pub payment_method: String,  // cash, transfer, card, check
    pub reference_number: Option<String>,
    pub payment_date: Date,
    #[sea_orm(column_type = "Text", nullable)]
    pub notes: Option<String>,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::invoices::Entity",
        from = "Column::InvoiceId",
        to = "super::invoices::Column::Id"
    )]
    Invoice,
}

impl Related<super::invoices::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Invoice.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
