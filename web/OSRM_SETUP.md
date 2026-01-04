# Setting Up Your Own OSRM Instance

The public OSRM demo server (`router.project-osrm.org`) has rate limits and is not suitable for production use. This guide shows you how to set up your own OSRM instance.

**⚠️ Resource Note**: Full India map requires ~20GB disk and 4-5GB RAM. For development, consider using the public API. For production, regional maps (Delhi, Mumbai, etc.) are more efficient. See [OSRM_RESOURCES.md](../OSRM_RESOURCES.md) for details.

## Option 1: Docker (Recommended - Easiest)

**Already added to docker-compose.yml!** Just run:
```bash
docker-compose up osrm -d
```

The OSRM service is already configured. See below for customization options.

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. **Create a docker-compose.yml file:**

```yaml
version: '3.8'

services:
  osrm:
    image: osrm/osrm-backend:latest
    container_name: osrm-backend
    ports:
      - "5000:5000"
    volumes:
      - ./data:/data
    command: >
      sh -c "
      if [ ! -f /data/india-latest.osrm ]; then
        echo 'Downloading India map data...'
        wget -O /data/india-latest.osm.pbf https://download.geofabrik.de/asia/india-latest.osm.pbf
        echo 'Extracting road network...'
        osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
        echo 'Partitioning...'
        osrm-partition /data/india-latest.osm.pbf
        echo 'Customizing...'
        osrm-customize /data/india-latest.osm.pbf
      fi
      echo 'Starting OSRM server...'
      osrm-routed --algorithm mld /data/india-latest.osm.pbf
      "
    restart: unless-stopped
```

2. **Run the container:**

```bash
docker-compose up -d
```

3. **Wait for the map data to download and process** (this may take 30-60 minutes for India)

4. **Test the server:**

```bash
curl "http://localhost:5000/route/v1/driving/77.2090,28.6139;77.2184,28.6159?overview=full&geometries=geojson"
```

5. **Update your .env file:**

```env
VITE_OSRM_URL=http://localhost:5000
```

For production, replace `localhost:5000` with your server's public URL.

## Option 2: Manual Installation

### Prerequisites
- Ubuntu/Debian Linux server
- 20GB+ free disk space
- 4GB+ RAM

### Steps

1. **Install dependencies:**

```bash
sudo apt-get update
sudo apt-get install -y build-essential git cmake pkg-config \
  libbz2-dev libstxxl-dev libstxxl1v5 libxml2-dev \
  libzip-dev libboost-all-dev lua5.2 liblua5.2-dev libtbb-dev
```

2. **Install OSRM:**

```bash
git clone https://github.com/Project-OSRM/osrm-backend.git
cd osrm-backend
mkdir -p build
cd build
cmake ..
cmake --build .
sudo cmake --build . --target install
```

3. **Download map data:**

```bash
mkdir -p /opt/osrm-data
cd /opt/osrm-data
wget https://download.geofabrik.de/asia/india-latest.osm.pbf
```

4. **Extract and prepare data:**

```bash
osrm-extract -p /opt/osrm-backend/profiles/car.lua india-latest.osm.pbf
osrm-partition india-latest.osm.pbf
osrm-customize india-latest.osm.pbf
```

5. **Start OSRM server:**

```bash
osrm-routed --algorithm mld --port 5000 india-latest.osm.pbf
```

6. **Set up as a service (systemd):**

Create `/etc/systemd/system/osrm.service`:

```ini
[Unit]
Description=OSRM Routing Service
After=network.target

[Service]
Type=simple
User=osrm
WorkingDirectory=/opt/osrm-data
ExecStart=/usr/local/bin/osrm-routed --algorithm mld --port 5000 india-latest.osm.pbf
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable osrm
sudo systemctl start osrm
```

## Option 3: Cloud Services

### Mapbox Directions API
- **Pros**: Reliable, fast, well-maintained
- **Cons**: Paid service (free tier: 100k requests/month)
- **Setup**: Get API key from https://account.mapbox.com/

Update routing.ts to use Mapbox format (different API structure).

### GraphHopper
- **Pros**: Free tier available, good documentation
- **Cons**: Different API format
- **Setup**: https://www.graphhopper.com/

## Updating Map Data

Map data should be updated periodically (monthly recommended):

```bash
# Stop OSRM
docker-compose down  # or systemctl stop osrm

# Download new data
wget -O /data/india-latest.osm.pbf https://download.geofabrik.de/asia/india-latest.osm.pbf

# Rebuild
osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
osrm-partition /data/india-latest.osm.pbf
osrm-customize /data/india-latest.osm.pbf

# Restart
docker-compose up -d  # or systemctl start osrm
```

## Performance Considerations

- **Memory**: OSRM needs ~4GB RAM for India map
- **Disk**: India map data is ~2GB compressed, ~15GB processed
- **CPU**: Initial processing takes 1-2 hours on modern hardware
- **Network**: Ensure your server has good bandwidth for map downloads

## Security

If exposing OSRM publicly:
1. Use a reverse proxy (nginx) with rate limiting
2. Add authentication if needed
3. Consider using HTTPS
4. Monitor usage to prevent abuse

## Troubleshooting

### Connection Refused
- Check if OSRM is running: `docker ps` or `systemctl status osrm`
- Check firewall: `sudo ufw allow 5000`
- Verify port: `curl http://localhost:5000/health`

### Out of Memory
- Reduce map region (use state-level maps instead of country)
- Increase server RAM
- Use `--algorithm ch` instead of `mld` (slower but uses less memory)

### Slow Routing
- Ensure using `mld` algorithm (faster than `ch`)
- Check server resources (CPU, RAM)
- Consider using a CDN or caching layer

## Testing

Test your OSRM instance:

```bash
# Health check
curl http://localhost:5000/health

# Route test
curl "http://localhost:5000/route/v1/driving/77.2090,28.6139;77.2184,28.6159?overview=full&geometries=geojson"
```

Expected response should have `"code":"Ok"` and route coordinates.

