# MediaForge Production Deployment Architecture

**Version:** 1.0.0  
**Target Environment:** Linux Container Host / Dedicated VPS / Kubernetes  
**Architectural Model:** Ephemeral, In-Memory, Zero-Database Architecture

---

## 1. Production Architecture Overview

MediaForge is deployed behind a reverse proxy (Nginx or Caddy) handling TLS/HTTPS termination, request rate limiting, and static asset caching. The Spring Boot backend and Next.js web application run in isolated containers or systemd processes.

```
                          [ Internet Traffic ]
                                   |
                             (HTTPS : 443)
                                   v
                   +-------------------------------+
                   |       Nginx / Caddy TLS       |
                   |   (Certbot / Let's Encrypt)   |
                   +-------------------------------+
                       |                       |
          (Proxy /)    |                       | (Proxy /api/)
                       v                       v
            +--------------------+   +--------------------+
            |   Next.js Portal   |   | Spring Boot Backend|
            |   (Port 3000)      |   |   (Port 8080)      |
            +--------------------+   +--------------------+
                                               |
                                     (Bounded Process Pool)
                                               v
                                     +--------------------+
                                     |   FFmpeg Engine    |
                                     | (Ephemeral Scratch)|
                                     +--------------------+
```

---

## 2. Nginx Reverse Proxy Configuration

Create `/etc/nginx/sites-available/mediaforge`:

```nginx
upstream backend_api {
    server 127.0.0.1:8080;
    keepalive 32;
}

upstream frontend_web {
    server 127.0.0.1:3000;
    keepalive 32;
}

server {
    listen 80;
    server_name mediaforge.example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name mediaforge.example.com;

    ssl_certificate /etc/letsencrypt/live/mediaforge.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/mediaforge.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Maximum upload size for video/audio conversion
    client_max_body_size 520M;

    # Security Headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API Routing
    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
        proxy_buffering off;
    }

    # Frontend Routing
    location / {
        proxy_pass http://frontend_web;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 3. Systemd Service Deployment (Bare-Metal / VPS)

### Backend Service (`/etc/systemd/system/mediaforge-backend.service`)
```ini
[Unit]
Description=MediaForge Spring Boot Backend
After=network.target

[Service]
Type=simple
User=mediaforge
Group=mediaforge
WorkingDirectory=/opt/mediaforge/backend
ExecStart=/usr/bin/java -Dspring.profiles.active=prod -Xms512m -Xmx1536m -jar mediaforge-backend-1.0.0.jar
Restart=always
RestartSec=10
LimitNOFILE=65536
Environment="PORT=8080"
Environment="STORAGE_LOCAL_PATH=/opt/mediaforge/storage"

[Install]
WantedBy=multi-user.target
```

### Web Portal Service (`/etc/systemd/system/mediaforge-web.service`)
```ini
[Unit]
Description=MediaForge Next.js Web Portal
After=network.target

[Service]
Type=simple
User=mediaforge
Group=mediaforge
WorkingDirectory=/opt/mediaforge/web
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment="PORT=3000"
Environment="NODE_ENV=production"

[Install]
WantedBy=multi-user.target
```

---

## 4. Resource Allocation & Sizing Guidelines

| Sizing Tier | Concurrent Jobs | vCPU | RAM | Ephemeral NVMe |
| :--- | :--- | :--- | :--- | :--- |
| **Small (Entry)** | 2 Concurrent Transcodes | 2 vCPU | 2 GB | 20 GB |
| **Medium (Production)** | 4 Concurrent Transcodes | 4 vCPU | 4 GB | 50 GB |
| **Large (High Concurrency)**| 8 Concurrent Transcodes | 8 vCPU | 8 GB | 100 GB |
