use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "client_locations")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub client_id: Uuid,
    pub label: String,
    pub address: String,
    pub city: Option<String>,
    pub province: Option<String>,
    pub latitude: Option<f64>,
    pub longitude: Option<f64>,
    pub is_primary: bool,
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
