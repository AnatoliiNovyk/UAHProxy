export type Language = 'uk' | 'en';

export const translations = {
  uk: {
    brand: "UAProxy Premium",
    dashboard: "Панель управління",
    servers: "Сервери",
    installer: "1-Click Встановлення",
    config_editor: "Конфігурації",
    runtime_api: "HAProxy Runtime",
    smon: "SMON Моніторинг",
    clusters: "HA Кластери",
    ssl_waf: "SSL & WAF",
    alerts_audit: "Алерти та Аудит",
    settings: "Налаштування",
    
    // Overview Stats
    total_servers: "Всього серверів",
    active_proxies: "Активні проксі",
    smon_uptime: "SMON Аптайм",
    active_alerts: "Активні алерти",
    system_load: "Навантаження системи",

    // Action buttons
    add_server: "Додати сервер",
    install_service: "Встановити сервіс",
    save_config: "Зберегти конфіг",
    validate_syntax: "Валідувати синтаксис",
    compare_diff: "Порівняти версії",
    rollback: "Відкотити",
    test_ssh: "Перевірити SSH",
    send_test_alert: "Тестовий алерт",
    public_status_page: "Публічна сторінка статусу",

    // Statuses
    running: "Працює",
    stopped: "Зупинено",
    healthy: "Здоровий",
    degraded: "Порушено",
    up: "В МЕРЕЖІ",
    down: "НЕ ДОСТУПНИЙ",
    drain: "ДРЕЙН (DRAIN)",
    maint: "ТЕХОБСЛУГОВУВАННЯ",

    // Descriptions
    smon_desc: "Синтетичний гео-розподілений моніторинг сервісів, портів та SSL сертифікатів",
    clusters_desc: "Keepalived VRRP високодоступні кластери та Master-Slave синхронізація",
    runtime_desc: "Керування HAProxy socket API без перезапуску сервісу в реальному часі",
    git_sync_active: "Git Синхронізація: АКТИВНА"
  },
  en: {
    brand: "UAProxy Premium",
    dashboard: "Dashboard",
    servers: "Servers",
    installer: "1-Click Installer",
    config_editor: "Config Studio",
    runtime_api: "HAProxy Runtime",
    smon: "SMON Monitoring",
    clusters: "HA Clusters",
    ssl_waf: "SSL & WAF",
    alerts_audit: "Alerts & Audit",
    settings: "Settings",

    // Overview Stats
    total_servers: "Total Servers",
    active_proxies: "Active Proxies",
    smon_uptime: "SMON Uptime",
    active_alerts: "Active Alerts",
    system_load: "System Load",

    // Action buttons
    add_server: "Add Server",
    install_service: "Install Service",
    save_config: "Save Config",
    validate_syntax: "Validate Syntax",
    compare_diff: "Compare Versions",
    rollback: "Rollback",
    test_ssh: "Test SSH",
    send_test_alert: "Test Alert",
    public_status_page: "Public Status Page",

    // Statuses
    running: "Running",
    stopped: "Stopped",
    healthy: "Healthy",
    degraded: "Degraded",
    up: "ONLINE",
    down: "OFFLINE",
    drain: "DRAIN",
    maint: "MAINTENANCE",

    // Descriptions
    smon_desc: "Synthetic monitoring for HTTP(S), TCP/UDP, Pings, and SSL Expiry",
    clusters_desc: "Keepalived VRRP high-availability clusters & Master-Slave sync",
    runtime_desc: "HAProxy runtime socket manipulation without zero-downtime restarts",
    git_sync_active: "Git Auto-Sync: ACTIVE"
  }
};
