use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "quotations")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub quote_number: String,
    pub client_id: Uuid,
    pub location_id: Option<Uuid>,
    pub created_by: Uuid,
    pub status: String, // draft, sent, approved, rejected, invoiced
    pub valid_until: Option<Date>,
    pub subtotal: Decimal,
    pub tax_amount: Decimal,
    pub discount_amount: Decimal,
    pub total: Decimal,
    #[sea_orm(column_type = "Text", nullable)]
    pub notes: Option<String>,
    pub created_at: DateTime,
    pub approved_at: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::clients::Entity",
        from = "Column::ClientId",
        to = "super::clients::Column::Id"
    )]
    Client,
    #[sea_orm(has_many = "super::quotation_items::Entity")]
    Items,
}

impl Related<super::clients::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Client.def()
    }
}

impl Related<super::quotation_items::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Items.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
