use std::path::PathBuf;
use tokio::fs;
use crate::errors::AppError;

pub struct StorageService {
    base_path: PathBuf,
}

impl StorageService {
    pub fn new(base_path: &str) -> Self {
        Self {
            base_path: PathBuf::from(base_path),
        }
    }

    pub async fn init(&self) -> Result<(), AppError> {
        if !self.base_path.exists() {
            fs::create_dir_all(&self.base_path).await
                .map_err(|e| AppError::Internal(format!("Error creando directorio de storage: {}", e)))?;
        }
        Ok(())
    }

    pub async fn save_file(&self, filename: &str, content: &[u8]) -> Result<String, AppError> {
        let file_path = self.base_path.join(filename);
        
        // Si hay subdirectorios en el nombre, asegurarnos que existan
        if let Some(parent) = file_path.parent() {
            if !parent.exists() {
                fs::create_dir_all(parent).await
                    .map_err(|e| AppError::Internal(format!("Error creando subdirectorio: {}", e)))?;
            }
        }

        fs::write(&file_path, content).await
            .map_err(|e| AppError::Internal(format!("Error guardando archivo {}: {}", filename, e)))?;

        Ok(file_path.to_string_lossy().to_string())
    }

    pub async fn get_file(&self, filename: &str) -> Result<Vec<u8>, AppError> {
        let file_path = self.base_path.join(filename);
        fs::read(file_path).await
            .map_err(|e| AppError::Internal(format!("Error leyendo archivo {}: {}", filename, e)))
    }
}
