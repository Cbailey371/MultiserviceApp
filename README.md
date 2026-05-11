# 🔧 MultiService Pro

Sistema ERP especializado para empresas de mantenimiento multidisciplinario.

## Stack

| Capa | Tecnología |
|------|------------|
| **Backend** | Rust (Axum + SeaORM) |
| **Frontend** | React + Vite |
| **Base de Datos** | PostgreSQL 16 |
| **Infraestructura** | Docker + DevContainer |
| **Diseño** | Kinetic Glass (Glassmorphism Dark) |

## Quick Start

### Usando DevContainer (recomendado)
1. Abre el proyecto en VS Code
2. "Reopen in Container" — abre automáticamente el DevContainer
3. El entorno incluye Rust, Node.js y PostgreSQL

### Manual
```bash
# Backend
cd backend && cargo run

# Frontend
cd frontend && npm install && npm run dev

# Migraciones
cd migration && sea-orm-cli migrate up
```

## Especialidades
- 🔵 **HVAC** — Aire Acondicionado
- 🟡 **Electricidad** — Instalaciones y Mantenimiento
- 🟠 **Construcción** — Obra civil y remodelación

## Módulos
1. Dashboard KPIs
2. Clientes + Ubicaciones
3. Inventario de Activos (Equipos)
4. Cotizaciones + Conversión a Factura
5. Facturación + Pagos
6. Contratos Recurrentes
7. Calendario Dinámico
8. Órdenes de Trabajo + Fotos + Firma
9. Reportes de Productividad

## Licencia
Privado
