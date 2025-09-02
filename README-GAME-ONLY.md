# Red Hat Quest - Game-Only Deployment

This directory contains files for deploying **only the game** without the WebSocket server and admin control functionality. This creates a lightweight, static deployment that's perfect for demonstrations or environments where you don't need real-time control.

## 🆚 Deployment Comparison

| Feature | Full Deployment | Game-Only Deployment |
|---------|----------------|---------------------|
| **Container Size** | ~500MB | ~150MB |
| **Dependencies** | Node.js + nginx | nginx only |
| **WebSocket Server** | ✅ Yes | ❌ No |
| **Admin Control** | ✅ Real-time | ❌ Static only |
| **Leaderboard** | ✅ Live updates | ❌ Static display |
| **Game Play** | ✅ Full functionality | ✅ Full functionality |
| **Performance** | Good | Excellent |
| **Use Cases** | Production, demos with admin | Simple demos, static hosting |

## 🚀 Quick Start

### Option 1: Using the Build Script (Recommended)
```bash
./build-game-only-docker.sh
```

### Option 2: Manual Docker Commands
```bash
# Build the image
docker build -f Dockerfile-game-only -t red-hat-quest-game:static .

# Run the container
docker run -d --name red-hat-quest-game-static -p 8080:8080 red-hat-quest-game:static

# Access the game
open http://localhost:8080
```

### Option 3: Local Development Server
```bash
# Using Python (recommended for local testing)
python3 -m http.server 8080

# Or using Node.js (if you have it installed)
npx http-server . -p 8080 --cors
```

## 📁 Files Included in Game-Only Deployment

```
├── Dockerfile-game-only          # Lightweight container definition
├── build-game-only-docker.sh     # Automated build script
├── package-game-only.json        # Minimal package.json
├── index.html                    # Main game interface
├── admin.html                    # Admin panel (static version)
├── leaderboard.html              # Leaderboard (static version)
├── style.css                     # Game styling
├── js/                           # Game JavaScript modules
│   ├── main.js
│   ├── gameController.js
│   ├── renderer.js
│   └── ...
└── assets/                       # Game assets
    ├── player.png
    ├── coin.png
    └── ...
```

## 🔧 Files Excluded from Game-Only Deployment

- `websocket-server.js` - WebSocket control server
- `package.json` - Full dependencies including WebSocket libraries
- `dev-server.js` - Development server
- Node.js dependencies in `node_modules/`

## 🌐 Available Endpoints

When running the game-only container:

- **Main Game**: `http://localhost:8080/`
- **Admin Panel**: `http://localhost:8080/admin.html` (static version)
- **Leaderboard**: `http://localhost:8080/leaderboard.html` (static version)
- **Health Check**: `http://localhost:8080/health`

## ⚠️ Limitations

### What Doesn't Work:
- **Real-time admin control**: No pause/resume/new game from admin panel
- **Live leaderboard updates**: Leaderboard shows static demo data
- **WebSocket communication**: No real-time features
- **Persistent data**: No game state persistence between container restarts

### What Still Works:
- **Full game gameplay**: Complete maze game experience
- **Registration system**: Player registration and username generation
- **Scoring system**: Points, t-shirts, and coin collection
- **Game over screens**: Order confirmation and invoice generation
- **Responsive design**: Mobile and desktop compatibility

## 🏗️ Customization

### Modifying the Container

1. Edit game files as needed
2. Rebuild using the build script:
   ```bash
   ./build-game-only-docker.sh
   ```

### Adding Custom nginx Configuration

Edit the nginx configuration section in `Dockerfile-game-only`:

```dockerfile
# Add custom server blocks or modify existing ones
RUN { \
    echo 'server {'; \
    echo '    # Your custom configuration here'; \
    echo '}'; \
} >> /etc/nginx/nginx.conf.d/default.conf
```

## 🔄 Switching Between Deployments

### To Full Deployment:
```bash
# Use the original Dockerfile
docker build -t red-hat-quest:full .
docker run -d --name red-hat-quest-full -p 8000:8000 -p 8080:8080 red-hat-quest:full
```

### To Game-Only Deployment:
```bash
# Use the game-only Dockerfile
./build-game-only-docker.sh
```

## 🐛 Troubleshooting

### Container Won't Start
```bash
# Check container logs
docker logs red-hat-quest-game-static

# Check if port is already in use
lsof -i :8080
```

### Game Assets Not Loading
- Ensure all files are copied correctly in the Dockerfile
- Check nginx error logs: `docker exec red-hat-quest-game-static cat /var/log/nginx/error.log`

### Health Check Failing
```bash
# Test health endpoint manually
curl http://localhost:8080/health
```

## 📊 Performance

The game-only deployment is optimized for:
- **Fast startup**: ~2-3 seconds vs ~10-15 seconds for full deployment
- **Low memory usage**: ~50MB RAM vs ~200MB for full deployment  
- **Better caching**: Static assets cached efficiently by nginx
- **High concurrency**: nginx can handle many more concurrent users

Perfect for demo environments, trade shows, or simple game hosting scenarios!
