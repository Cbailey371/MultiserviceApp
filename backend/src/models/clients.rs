use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "clients")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub client_type: String,
    pub company_name: Option<String>,
    pub tax_id: Option<String>,
    pub tax_dv: Option<String>,
    pub contact_name: String,
    pub email: Option<String>,
    pub phone: String,
    pub phone_alt: Option<String>,
    pub notes: Option<String>,
    pub created_at: chrono::NaiveDateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(has_many = "super::client_locations::Entity")]
    Locations,
    #[sea_orm(has_many = "super::assets::Entity")]
    Assets,
}

impl Related<super::client_locations::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Locations.def()
    }
}

impl Related<super::assets::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Assets.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
