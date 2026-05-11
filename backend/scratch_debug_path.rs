use std::path::{Path, PathBuf};
use std::env;

fn main() {
    let storage_path = "./data/uploads";
    let rel_logo = "branding/company_logo.png";
    
    let cwd = env::current_dir().unwrap();
    println!("CWD: {:?}", cwd);
    
    let p = Path::new(storage_path).join(rel_logo);
    println!("Joined path: {:?}", p);
    println!("Absolute?: {}", p.is_absolute());
    
    let mut possible_paths = vec![p.to_path_buf()];
    if !p.is_absolute() {
        possible_paths.push(cwd.join(&p));
        possible_paths.push(cwd.join("backend").join(&p));
    }
    
    for path in possible_paths {
        println!("Checking: {:?} - Exists: {}", path, path.exists());
    }
}
