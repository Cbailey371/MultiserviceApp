use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "contract_schedules")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    pub contract_id: Uuid,
    pub work_order_id: Option<Uuid>,
    pub scheduled_date: Date,
    pub status: String,
    pub assigned_to: Option<Uuid>,
    pub notes: Option<String>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::contracts::Entity",
        from = "Column::ContractId",
        to = "super::contracts::Column::Id",
        on_delete = "Cascade"
    )]
    Contracts,
    #[sea_orm(
        belongs_to = "super::work_orders::Entity",
        from = "Column::WorkOrderId",
        to = "super::work_orders::Column::Id"
    )]
    WorkOrders,
}

impl Related<super::contracts::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Contracts.def()
    }
}

impl Related<super::work_orders::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::WorkOrders.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
