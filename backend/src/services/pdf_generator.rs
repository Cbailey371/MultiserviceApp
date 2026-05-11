use genpdf::elements;
use genpdf::style;
use genpdf::Element as _;
use std::path::PathBuf;
use crate::errors::AppError;

pub struct BrandingInfo {
    pub company_name: String,
    pub company_legal_name: Option<String>,
    pub company_tax_id: Option<String>,
    pub company_address: Option<String>,
    pub company_phone: Option<String>,
    pub company_email: Option<String>,
    pub logo_path: Option<String>, // Full path on disk
}


pub struct PdfGenerator {
    font_dir: PathBuf,
}

impl PdfGenerator {
    pub fn new() -> Self {
        let paths = [
            "/usr/share/fonts/truetype/dejavu",
            "/usr/share/fonts/dejavu",
            "/System/Library/Fonts/Supplemental",
            "/Library/Fonts",
            "/System/Library/Fonts",
        ];
        
        let font_dir = paths.iter()
            .map(PathBuf::from)
            .find(|p| p.exists())
            .unwrap_or_else(|| PathBuf::from("/usr/share/fonts"));

        Self { font_dir }
    }

    fn get_font_family(&self) -> Result<genpdf::fonts::FontFamily<genpdf::fonts::FontData>, AppError> {
        let dir_str = self.font_dir.to_str().unwrap_or("");
        
        if dir_str.contains("dejavu") {
            return genpdf::fonts::from_files(&self.font_dir, "DejaVuSans", None)
                .map_err(|e| AppError::Internal(format!("Error cargando DejaVuSans: {}", e)));
        }

        if dir_str.contains("Supplemental") || dir_str.contains("Fonts") {
            // Special handling for Mac naming convention
            let regular_path = self.font_dir.join("Arial.ttf");
            if regular_path.exists() {
                let regular = genpdf::fonts::FontData::load(&regular_path, None)
                    .map_err(|e| AppError::Internal(format!("Error loading Arial Regular: {}", e)))?;
                
                let bold = genpdf::fonts::FontData::load(self.font_dir.join("Arial Bold.ttf"), None)
                    .unwrap_or_else(|_| regular.clone());
                let italic = genpdf::fonts::FontData::load(self.font_dir.join("Arial Italic.ttf"), None)
                    .unwrap_or_else(|_| regular.clone());
                let bold_italic = genpdf::fonts::FontData::load(self.font_dir.join("Arial Bold Italic.ttf"), None)
                    .unwrap_or_else(|_| regular.clone());

                return Ok(genpdf::fonts::FontFamily { regular, bold, italic, bold_italic });
            }
        }

        genpdf::fonts::from_files(&self.font_dir, "Arial", None)
            .map_err(|e| AppError::Internal(format!("Error cargando fuentes (Arial) en {:?}: {}", self.font_dir, e)))
    }

    pub async fn generate_invoice_pdf(
        &self,
        branding: &BrandingInfo,
        doc_type: &str, // "COTIZACIÓN" o "FACTURA"
        doc_number: &str,
        client_name: &str,
        items: &[(String, f64, f64)], // (desc, qty, price)
        subtotal: f64,
        tax_amount: f64,
        total: f64,
    ) -> Result<Vec<u8>, AppError> {
        let font_family = self.get_font_family()?;
        let mut doc = genpdf::Document::new(font_family);
        
        doc.set_title(format!("{} {}", doc_type, doc_number));
        let mut decorator = genpdf::SimplePageDecorator::new();
        decorator.set_margins(15);
        doc.set_page_decorator(decorator);
        
        let primary_color = style::Color::Rgb(30, 58, 138); // Deep Blue (Slate-900)
        let secondary_color = style::Color::Rgb(75, 85, 99); // Gray-600
        let accent_color = style::Color::Rgb(59, 130, 246); // Blue-500
        let light_gray = style::Color::Rgb(243, 244, 246); // Gray-100

        // --- Top Bar (Modern Accent) ---
        doc.push(elements::Paragraph::new(" ")
            .styled(style::Style::new().with_color(primary_color))
            .padded(1));
        
        doc.push(elements::Break::new(1));

        // --- Header Section ---
        let mut header_table = elements::TableLayout::new(vec![1, 1]);
        let mut header_row = header_table.row();
        
        // Left Column: Logo & Company Name
        let mut left_layout = elements::LinearLayout::vertical();
        
        let mut logo_rendered = false;
        if let Some(path) = &branding.logo_path {
            // ... (keeping existing logo resolution logic) ...
            let p = std::path::Path::new(path);
            let mut possible_paths = vec![p.to_path_buf()];
            if !p.is_absolute() {
                if let Ok(cwd) = std::env::current_dir() {
                    possible_paths.push(cwd.join(p));
                    possible_paths.push(cwd.join("backend").join(p));
                }
            }

            for absolute_path in possible_paths {
                if absolute_path.exists() {
                    let final_path = std::fs::canonicalize(&absolute_path).unwrap_or(absolute_path);
                    if let Ok(img) = image::open(&final_path) {
                        let (width, _) = (img.width(), img.height());
                        let processed_img = if width > 800 { img.resize(800, 800, image::imageops::FilterType::Lanczos3) } else { img };
                        let rgb_img = processed_img.to_rgb8();
                        let temp_path = std::env::temp_dir().join(format!("logo_temp_{}.png", uuid::Uuid::new_v4()));
                        if let Ok(_) = rgb_img.save(&temp_path) {
                            if let Ok(genpdf_img) = elements::Image::from_path(&temp_path) {
                                left_layout.push(genpdf_img.with_scale(genpdf::Scale::new(0.2, 0.2)));
                                logo_rendered = true;
                                let _ = std::fs::remove_file(temp_path);
                                break;
                            }
                            let _ = std::fs::remove_file(temp_path);
                        }
                    }
                }
            }
        }
        
        if !logo_rendered {
            left_layout.push(elements::Paragraph::new(&branding.company_name)
                .styled(style::Style::new().with_font_size(20).bold().with_color(primary_color)));
        } else {
            left_layout.push(elements::Break::new(0.5));
            left_layout.push(elements::Paragraph::new(&branding.company_name)
                .styled(style::Style::new().with_font_size(10).bold().with_color(secondary_color)));
        }
        header_row.push_element(left_layout);

        // Right Column: Document ID & Date
        let mut right_layout = elements::LinearLayout::vertical();
        right_layout.push(elements::Paragraph::new(doc_type.to_uppercase())
            .aligned(genpdf::Alignment::Right)
            .styled(style::Style::new().with_font_size(22).bold().with_color(accent_color)));
        
        right_layout.push(elements::Paragraph::new(format!("NO: {}", doc_number))
            .aligned(genpdf::Alignment::Right)
            .styled(style::Style::new().with_font_size(12).bold()));
        
        right_layout.push(elements::Paragraph::new(format!("FECHA: {}", chrono::Local::now().format("%d/%m/%Y")))
            .aligned(genpdf::Alignment::Right)
            .styled(style::Style::new().with_font_size(10).with_color(secondary_color)));

        header_row.push_element(right_layout);
        header_row.push().unwrap();
        doc.push(header_table);

        doc.push(elements::Break::new(1.5));

        // --- Info Section (Sender vs Receiver) ---
        let mut info_table = elements::TableLayout::new(vec![1, 1]);
        let mut info_row = info_table.row();

        // Left: From (Our Info)
        let mut from_layout = elements::LinearLayout::vertical();
        from_layout.push(elements::Paragraph::new("EMITIDO POR")
            .styled(style::Style::new().with_font_size(8).bold().with_color(secondary_color)));
        
        if let Some(legal) = &branding.company_legal_name {
            from_layout.push(elements::Paragraph::new(legal).styled(style::Style::new().with_font_size(9).bold()));
        }
        if let Some(ruc) = &branding.company_tax_id {
            from_layout.push(elements::Paragraph::new(format!("RUC/NIT: {}", ruc)).styled(style::Style::new().with_font_size(8)));
        }
        if let Some(address) = &branding.company_address {
            from_layout.push(elements::Paragraph::new(address).styled(style::Style::new().with_font_size(8)));
        }
        if let Some(phone) = &branding.company_phone {
            from_layout.push(elements::Paragraph::new(format!("Tel: {}", phone)).styled(style::Style::new().with_font_size(8)));
        }
        info_row.push_element(from_layout);

        // Right: To (Client Info)
        let mut to_layout = elements::LinearLayout::vertical();
        to_layout.push(elements::Paragraph::new("FACTURADO A")
            .aligned(genpdf::Alignment::Right)
            .styled(style::Style::new().with_font_size(8).bold().with_color(secondary_color)));
        
        to_layout.push(elements::Paragraph::new(client_name)
            .aligned(genpdf::Alignment::Right)
            .styled(style::Style::new().with_font_size(11).bold()));
        
        info_row.push_element(to_layout);
        info_row.push().unwrap();
        doc.push(info_table);

        doc.push(elements::Break::new(2));

        // --- Items Table ---
        let mut items_table = elements::TableLayout::new(vec![4, 1, 1, 1]);
        
        let mut h_row = items_table.row();
        let h_style = style::Style::new().bold().with_font_size(9).with_color(style::Color::Rgb(255, 255, 255));
        
        h_row.push_element(elements::Paragraph::new("DESCRIPCIÓN DE SERVICIOS / PRODUCTOS").styled(h_style).padded(4).styled(style::Style::new().with_color(primary_color)));
        h_row.push_element(elements::Paragraph::new("CANT.").aligned(genpdf::Alignment::Right).styled(h_style).padded(4).styled(style::Style::new().with_color(primary_color)));
        h_row.push_element(elements::Paragraph::new("P. UNIT").aligned(genpdf::Alignment::Right).styled(h_style).padded(4).styled(style::Style::new().with_color(primary_color)));
        h_row.push_element(elements::Paragraph::new("TOTAL").aligned(genpdf::Alignment::Right).styled(h_style).padded(4).styled(style::Style::new().with_color(primary_color)));
        h_row.push().unwrap();

        for (i, (desc, qty, price)) in items.iter().enumerate() {
            let mut i_row = items_table.row();
            let row_style = if i % 2 == 0 { style::Style::new() } else { style::Style::new().with_color(light_gray) };
            
            i_row.push_element(elements::Paragraph::new(desc).styled(style::Style::new().with_font_size(9)).padded(3).styled(row_style));
            i_row.push_element(elements::Paragraph::new(format!("{:.2}", qty)).aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(9)).padded(3).styled(row_style));
            i_row.push_element(elements::Paragraph::new(format!("${:.2}", price)).aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(9)).padded(3).styled(row_style));
            i_row.push_element(elements::Paragraph::new(format!("${:.2}", qty * price)).aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(9).bold()).padded(3).styled(row_style));
            i_row.push().unwrap();
        }
        doc.push(items_table);
        
        doc.push(elements::Break::new(1));

        // --- Totals Section ---
        let mut totals_layout = elements::LinearLayout::vertical();
        totals_layout.push(elements::Paragraph::new("_".repeat(40)).aligned(genpdf::Alignment::Right).styled(style::Style::new().with_color(light_gray)));
        
        let mut totals_table = elements::TableLayout::new(vec![3, 1]);
        
        let mut st_row = totals_table.row();
        st_row.push_element(elements::Paragraph::new("SUBTOTAL").aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(9).bold()));
        st_row.push_element(elements::Paragraph::new(format!("${:.2}", subtotal)).aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(9)));
        st_row.push().unwrap();

        let mut tx_row = totals_table.row();
        tx_row.push_element(elements::Paragraph::new("ITBMS (7%)").aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(9).bold()));
        tx_row.push_element(elements::Paragraph::new(format!("${:.2}", tax_amount)).aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(9)));
        tx_row.push().unwrap();

        let mut t_row = totals_table.row();
        t_row.push_element(elements::Paragraph::new("TOTAL A PAGAR").aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(12).bold().with_color(primary_color)));
        t_row.push_element(elements::Paragraph::new(format!("${:.2}", total)).aligned(genpdf::Alignment::Right).styled(style::Style::new().with_font_size(12).bold()));
        t_row.push().unwrap();
        
        doc.push(totals_table);

        doc.push(elements::Break::new(4));

        // --- Footer / Terms ---
        doc.push(elements::Paragraph::new("TÉRMINOS Y CONDICIONES")
            .styled(style::Style::new().with_font_size(8).bold().with_color(secondary_color)));
        doc.push(elements::Paragraph::new("Este documento es una representación amigable de su transacción. Por favor, conserve este comprobante para sus registros. Los pagos deben realizarse según los términos acordados previamente.")
            .styled(style::Style::new().with_font_size(7).with_color(secondary_color)));
        
        doc.push(elements::Break::new(2));
        doc.push(elements::Paragraph::new("GRACIAS POR SU PREFERENCIA")
            .aligned(genpdf::Alignment::Center)
            .styled(style::Style::new().with_font_size(10).bold().with_color(primary_color)));

        let mut buffer = Vec::new();
        doc.render(&mut buffer)
            .map_err(|e| AppError::Internal(format!("Error al renderizar PDF: {}", e)))?;

        Ok(buffer)
    }
}
