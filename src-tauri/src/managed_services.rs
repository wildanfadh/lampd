use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManagedServiceDef {
    pub id: String,
    pub label: String,
    pub category: String,
    pub candidate_units: Vec<String>,
}

pub fn fixed_catalog() -> Vec<ManagedServiceDef> {
    vec![
        ManagedServiceDef {
            id: "apache".into(),
            label: "Apache".into(),
            category: "Web Server".into(),
            candidate_units: vec!["apache2".into(), "httpd".into()],
        },
        ManagedServiceDef {
            id: "nginx".into(),
            label: "Nginx".into(),
            category: "Web Server".into(),
            candidate_units: vec!["nginx".into()],
        },
        ManagedServiceDef {
            id: "mysql".into(),
            label: "MySQL".into(),
            category: "Database".into(),
            candidate_units: vec!["mysql".into(), "mysqld".into(), "mariadb".into()],
        },
        ManagedServiceDef {
            id: "php-fpm".into(),
            label: "PHP-FPM".into(),
            category: "Runtime".into(),
            candidate_units: vec![
                "php-fpm".into(),
                "php8.4-fpm".into(),
                "php8.3-fpm".into(),
                "php8.2-fpm".into(),
                "php8.1-fpm".into(),
                "php8.0-fpm".into(),
            ],
        },
        ManagedServiceDef {
            id: "postgresql".into(),
            label: "PostgreSQL".into(),
            category: "Database".into(),
            candidate_units: vec!["postgresql".into()],
        },
        ManagedServiceDef {
            id: "docker".into(),
            label: "Docker".into(),
            category: "Engine".into(),
            candidate_units: vec!["docker".into()],
        },
        ManagedServiceDef {
            id: "podman".into(),
            label: "Podman".into(),
            category: "Engine".into(),
            candidate_units: vec!["podman".into()],
        },
    ]
}
