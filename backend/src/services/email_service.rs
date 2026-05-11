use lettre::{Message, SmtpTransport, Transport};
use lettre::transport::smtp::authentication::Credentials;
use lettre::message::{Attachment, MultiPart, SinglePart, header::ContentType};
use crate::errors::AppError;
use std::collections::HashMap;

pub struct EmailService {
    // These are fallback/default settings from Env
    default_transport: Option<SmtpTransport>,
    default_from: String,
}

impl EmailService {
    pub fn new(smtp_server: &str, smtp_port: u16, user: &str, pass: &str, from: &str) -> Self {
        let creds = Credentials::new(user.to_string(), pass.to_string());
        let transport = SmtpTransport::relay(smtp_server)
            .expect("Could not create SMTP transport")
            .port(smtp_port)
            .credentials(creds)
            .build();

        Self {
            default_transport: Some(transport),
            default_from: from.to_string(),
        }
    }

    pub fn new_empty() -> Self {
        Self {
            default_transport: None,
            default_from: "no-reply@system.com".to_string(),
        }
    }

    fn get_transport_from_settings(&self, settings: &HashMap<String, String>) -> Result<(SmtpTransport, String), AppError> {
        let host = settings.get("smtp_host");
        let port = settings.get("smtp_port").and_then(|p| p.parse::<u16>().ok());
        let user = settings.get("smtp_user");
        let pass = settings.get("smtp_password");
        let from = settings.get("smtp_from_email");

        if let (Some(h), Some(p), Some(u), Some(pw), Some(f)) = (host, port, user, pass, from) {
            let creds = Credentials::new(u.to_string(), pw.to_string());
            let transport = SmtpTransport::relay(h)
                .map_err(|e| AppError::Internal(format!("Error SMTP Host: {}", e)))?
                .port(p)
                .credentials(creds)
                .build();
            Ok((transport, f.to_string()))
        } else if let Some(ref t) = self.default_transport {
            Ok((t.clone(), self.default_from.clone()))
        } else {
            Err(AppError::Internal("Servidor de correo no configurado".into()))
        }
    }

    pub async fn send_document(
        &self,
        to_email: &str,
        subject: &str,
        body: &str,
        filename: &str,
        pdf_data: Vec<u8>,
        settings: &HashMap<String, String>,
    ) -> Result<(), AppError> {
        let (transport, from_address) = self.get_transport_from_settings(settings)?;

        let from_name = settings.get("smtp_from_name").map(|s| s.as_str()).unwrap_or("MultiService Pro");
        let from_header = format!("{} <{}>", from_name, from_address);

        let attachment = Attachment::new(filename.to_string())
            .body(pdf_data, ContentType::parse("application/pdf").unwrap());

        let email = Message::builder()
            .from(from_header.parse().map_err(|_| AppError::Internal("Invalid from address".into()))?)
            .to(to_email.parse().map_err(|_| AppError::Internal("Invalid recipient address".into()))?)
            .subject(subject)
            .multipart(
                MultiPart::mixed()
                    .singlepart(SinglePart::plain(body.to_string()))
                    .singlepart(attachment)
            )
            .map_err(|e| AppError::Internal(format!("Error construyendo email: {}", e)))?;

        transport.send(&email)
            .map_err(|e| AppError::Internal(format!("Error enviando email: {}", e)))?;

        Ok(())
    }

    pub async fn send_invoice(
        &self,
        to_email: &str,
        invoice_number: &str,
        pdf_data: Vec<u8>,
        settings: &HashMap<String, String>,
    ) -> Result<(), AppError> {
        let subject = format!("Factura de Servicio — {}", invoice_number);
        let body = format!("Adjunto encontrará la factura {} de su servicio.\n\nGracias por su confianza.", invoice_number);
        let filename = format!("Factura_{}.pdf", invoice_number);
        
        self.send_document(to_email, &subject, &body, &filename, pdf_data, settings).await
    }

    pub async fn send_quotation(
        &self,
        to_email: &str,
        quote_number: &str,
        pdf_data: Vec<u8>,
        settings: &HashMap<String, String>,
    ) -> Result<(), AppError> {
        let subject = format!("Cotización de Servicio — {}", quote_number);
        let body = format!("Cordial saludo,\n\nAdjunto encontrará la cotización {} solicitada.\n\nQuedamos atentos a sus comentarios.", quote_number);
        let filename = format!("Cotizacion_{}.pdf", quote_number);
        
        self.send_document(to_email, &subject, &body, &filename, pdf_data, settings).await
    }

    pub async fn send_reminder(
        &self,
        to_email: &str,
        invoice_number: &str,
        balance: f64,
        settings: &HashMap<String, String>,
    ) -> Result<(), AppError> {
        let (transport, from_address) = self.get_transport_from_settings(settings)?;
        let from_name = settings.get("smtp_from_name").map(|s| s.as_str()).unwrap_or("MultiService Pro");
        let from_header = format!("{} <{}>", from_name, from_address);

        let email = Message::builder()
            .from(from_header.parse().map_err(|_| AppError::Internal("Invalid from address".into()))?)
            .to(to_email.parse().map_err(|_| AppError::Internal("Invalid recipient address".into()))?)
            .subject(format!("Recordatorio de Pago — Factura {}", invoice_number))
            .singlepart(SinglePart::plain(format!(
                "Cordial saludo,\n\nLe recordamos que la factura {} tiene un saldo pendiente de ${:.2}.\n\nLe agradecemos gestionar el pago a la brevedad posible.\n\nMultiService Pro ERP",
                invoice_number, balance
            )))
            .map_err(|e| AppError::Internal(format!("Error construyendo email: {}", e)))?;

        transport.send(&email)
            .map_err(|e| AppError::Internal(format!("Error enviando email: {}", e)))?;

        Ok(())
    }

    pub async fn send_test_email(
        &self,
        to_email: &str,
        settings: &HashMap<String, String>,
    ) -> Result<(), AppError> {
        let (transport, from_address) = self.get_transport_from_settings(settings)?;
        let from_name = settings.get("smtp_from_name").map(|s| s.as_str()).unwrap_or("MultiService Pro");
        let from_header = format!("{} <{}>", from_name, from_address);

        let email = Message::builder()
            .from(from_header.parse().map_err(|_| AppError::Internal("Invalid from address".into()))?)
            .to(to_email.parse().map_err(|_| AppError::Internal("Invalid recipient address".into()))?)
            .subject("Correo de Prueba — MultiService Pro")
            .singlepart(SinglePart::plain(format!(
                "Hola,\n\nEste es un correo de prueba enviado desde MultiService Pro para verificar tu configuración SMTP.\n\nSi has recibido esto, ¡tu configuración está funcionando correctamente!"
            )))
            .map_err(|e| AppError::Internal(format!("Error construyendo email: {}", e)))?;

        transport.send(&email)
            .map_err(|e| AppError::Internal(format!("Error enviando email: {}", e)))?;

        Ok(())
    }
}
