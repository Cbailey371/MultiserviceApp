use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contracts")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub contract_number: String,
    pub client_id: Uuid,
    pub specialty: String,
    pub frequency: String,
    pub start_date: Date,
    pub end_date: Date,
    pub monthly_price: Decimal,
    pub visits_per_period: i32,
    pub status: String,
    pub scope_of_work: Option<String>,
    pub notes: Option<String>,
    pub created_at: DateTime,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::clients::Entity",
        from = "Column::ClientId",
        to = "super::clients::Column::Id"
    )]
    Clients,
    #[sea_orm(has_many = "super::contract_schedules::Entity")]
    ContractSchedules,
}

impl Related<super::clients::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Clients.def()
    }
}

impl Related<super::contract_schedules::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::ContractSchedules.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
