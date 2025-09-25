# OSRM on AWS Lightsail/EC2 (Docker + Caddy)

This folder lets you deploy a production-ready OSRM instance on AWS Lightsail/EC2 using Docker and Caddy (automatic HTTPS).

## Prerequisites
- A domain you control (e.g., example.com)
- A subdomain for routing (e.g., routes.example.com)
- An AWS Lightsail/EC2 Ubuntu 22.04 instance (≥ 2 vCPU, 4 GB RAM, 20+ GB disk)
- Security group / firewall allowing inbound 22 (SSH), 80 (HTTP), 443 (HTTPS)

## 1) SSH into the server and install Docker
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg

# Docker repo
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | \
  sudo gpg --batch --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 2) Copy this folder to the server
- Either `git clone` your repository on the server, or copy just `infra/osrm/`:
```bash
# from your local repo root
scp -r infra/osrm ubuntu@<server-ip>:/home/ubuntu/
```

## 3) Prepare the OSRM data
From the server:
```bash
cd ~/osrm # or wherever you copied infra/osrm
# Create data and preprocess from a Geofabrik URL (replace with your region)
chmod +x prepare_osrm.sh
./prepare_osrm.sh https://download.geofabrik.de/asia/philippines-latest.osm.pbf
```
This downloads the PBF and runs `osrm-extract`, `osrm-partition`, and `osrm-customize` into `./data/`.

## 4) Set your domain for HTTPS
Edit `Caddyfile` and replace `routes.example.com` with your domain.
Create a DNS A record: `routes.example.com` → your instance public IP.

## 5) Start the services
```bash
# Still inside infra/osrm
docker compose up -d
```
- Caddy will obtain a TLS certificate automatically.
- OSRM listens only on the internal Docker network. Port 5000 is NOT exposed publicly.

## 6) Test your hosted OSRM
```bash
curl "https://routes.example.com/route/v1/driving/121.0,14.5;121.05,14.6?overview=false"
```
Replace the coordinates with points in your region.

## 7) Point your app to your OSRM
In your app repo `backend/.env` set:
```
OSRM_BASE_URL=https://routes.example.com
OSRM_TIMEOUT_MS=20000
```
Restart your backend so it picks up the new environment variables.

## Operations
- To update data, re-run `prepare_osrm.sh` with a new PBF (this overwrites files in `./data`). Then restart the stack:
```bash
docker compose restart osrm
```
- Logs:
```bash
docker compose logs -f osrm
```
- Update images:
```bash
docker compose pull && docker compose up -d
```
- Remove stack:
```bash
docker compose down
```

## Notes
- OSRM expects `lng,lat` in the URL. Your backend already handles lat/lng conversion for the frontend.
- Sizing: country extracts typically run fine on 2–4 GB RAM. Larger regions need more.
- Security: If the endpoint is only for your app, consider restricting IPs at AWS SG or add auth/rate-limit at Caddy.

## Quick Temporary HTTP (no domain / no HTTPS)

If you just need a quick, temporary endpoint without a domain or TLS, you can expose OSRM directly on port 5000 and point your app to `http://<server-ip>:5000`.

1) AWS firewall/Security Group
- Open inbound TCP port 5000 on your EC2/Lightsail instance.
- For safety, restrict the source to your own IP or your backend server’s IP instead of 0.0.0.0/0.

2) Start OSRM with the HTTP-only compose file
```bash
# From this directory (infra/osrm), after you have prepared data in ./data
docker compose -f docker-compose.http.yml up -d
```

3) Test over HTTP
```bash
curl "http://<server-ip>:5000/route/v1/driving/121.0,14.5;121.05,14.6?overview=false"
```

4) Point your app to the temporary HTTP endpoint
In your app repo `backend/.env` set:
```
OSRM_BASE_URL=http://<server-ip>:5000
OSRM_TIMEOUT_MS=20000
```
Restart your backend to apply changes.

Notes:
- This is not encrypted (no HTTPS). Do not send sensitive traffic over it.
- Consider assigning an Elastic IP so the address doesn’t change.
- For production or public access, use the Caddy (HTTPS) setup above.
