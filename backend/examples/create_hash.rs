use argon2::{
    password_hash::{rand_core::OsRng, SaltString},
    Argon2, PasswordHasher,
};
use std::env;

fn main() {
    let args: Vec<String> = env::args().collect();
    if args.len() < 2 {
        println!("Uso: cargo run --example create_hash <password>");
        return;
    }

    let password = &args[1];
    
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(password.as_bytes(), &salt)
        .expect("Error al generar el hash")
        .to_string();

    println!("\n--- DATOS PARA LA BASE DE DATOS ---");
    println!("Contraseña: {}", password);
    println!("Hash: {}", password_hash);
    println!("------------------------------------\n");
    println!("Ejecuta este SQL en tu base de datos para crear el usuario admin:");
    println!("\nINSERT INTO users (id, email, password_hash, full_name, role, is_active, created_at)");
    println!("VALUES (gen_random_uuid(), 'admin@tu-dominio.com', '{}', 'Administrador', 'admin', true, NOW());", password_hash);
}
