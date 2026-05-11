use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "assets")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub client_id: Uuid,
    pub location_id: Option<Uuid>,
    pub specialty: String,
    pub asset_type: Option<String>,
    pub brand: Option<String>,
    pub model_name: Option<String>,
    pub serial_number: Option<String>,
    pub capacity_btu: Option<i32>,
    pub capacity_electrical: Option<String>,
    pub installation_date: Option<chrono::NaiveDate>,
    pub warranty_expiry: Option<chrono::NaiveDate>,
    pub status: String,
    pub custom_fields: Option<serde_json::Value>,
    pub notes: Option<String>,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::clients::Entity",
        from = "Column::ClientId",
        to = "super::clients::Column::Id"
    )]
    Client,
}

impl Related<super::clients::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Client.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
