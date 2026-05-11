use sea_orm::entity::prelude::*;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, DeriveEntityModel, Serialize, Deserialize)]
#[sea_orm(table_name = "work_orders")]
pub struct Model {
    #[sea_orm(primary_key, auto_increment = false)]
    pub id: Uuid,
    #[sea_orm(unique)]
    pub wo_number: String,
    pub client_id: Uuid,
    pub location_id: Option<Uuid>,
    pub assigned_to: Uuid,
    pub created_by: Uuid,
    pub contract_schedule_id: Option<Uuid>,
    pub quotation_id: Option<Uuid>,
    pub work_type: String,        // preventive, corrective, installation, inspection
    pub specialty: String,        // hvac, electrical, construction
    pub priority: String,         // low, medium, high, urgent
    pub status: String,           // pending, en_route, in_progress, completed, cancelled
    pub scheduled_date: Date,
    pub scheduled_time_start: Option<Time>,
    pub scheduled_time_end: Option<Time>,
    pub started_at: Option<DateTime>,
    pub completed_at: Option<DateTime>,
    #[sea_orm(column_type = "Text", nullable)]
    pub description: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub technician_notes: Option<String>,
    #[sea_orm(column_type = "Text", nullable)]
    pub client_signature: Option<String>,
    pub report_pdf_path: Option<String>,
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
    #[sea_orm(
        belongs_to = "super::users::Entity",
        from = "Column::AssignedTo",
        to = "super::users::Column::Id"
    )]
    Technician,
}

impl Related<super::clients::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Client.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
