fn main() {
    let path = "data/uploads/branding/company_logo.png";
    match image::open(path) {
        Ok(img) => {
            println!("Success! Dimensions: {}x{}", img.width(), img.height());
            println!("Color type: {:?}", img.color());
        },
        Err(e) => {
            println!("Failed to open image: {}", e);
        }
    }
}
