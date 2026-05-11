use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "invoices")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub invoice_number: String,
    pub quotation_id: Option<Uuid>,
    pub client_id: Uuid,
    pub created_by: Uuid,
    pub invoice_type: String,   // cash, credit
    pub status: String,         // draft, sent, partial, paid, overdue, cancelled
    pub issue_date: Date,
    pub due_date: Option<Date>,
    pub subtotal: Decimal,
    pub tax_rate: Decimal,
    pub tax_amount: Decimal,
    pub discount_amount: Decimal,
    pub total: Decimal,
    pub amount_paid: Decimal,
    pub balance_due: Decimal,
    #[sea_orm(column_type = "Text", nullable)]
    pub notes: Option<String>,
    pub pdf_path: Option<String>,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::clients::Entity",
        from = "Column::ClientId",
        to = "super::clients::Column::Id"
    )]
    Client,
    #[sea_orm(has_many = "super::invoice_items::Entity")]
    Items,
    #[sea_orm(has_many = "super::payments::Entity")]
    Payments,
}

impl Related<super::clients::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Client.def()
    }
}

impl Related<super::invoice_items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Items.def()
    }
}

impl Related<super::payments::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Payments.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
