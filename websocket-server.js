#!/usr/bin/env node

// Simple WebSocket Server for Red Hat Quest Game Control
// This is a demonstration server that listens for game commands

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

const PORT = 8080;
const server = new WebSocket.Server({ 
    port: PORT,
    path: '/game-control'
});

console.log(`🎮 Red Hat Quest WebSocket Control Server running on ws://localhost:${PORT}/game-control`);
console.log('📡 Waiting for game client to connect...');
console.log('');
console.log('Available commands:');
console.log('  - start  : Start/Resume the game');
console.log('  - pause  : Pause the game');
console.log('  - new    : Create a new game');
console.log('');

let connectedClients = new Set();
let leaderboardData = [];

server.on('connection', (ws, request) => {
    const clientInfo = {
        ip: request.socket.remoteAddress,
        userAgent: request.headers['user-agent']
    };
    
    connectedClients.add(ws);
    console.log(`🔗 Game client connected from ${clientInfo.ip}`);
    console.log(`👥 Total connected clients: ${connectedClients.size}`);

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to Red Hat Quest Control Server',
        availableCommands: ['start', 'pause', 'new']
    }));

    ws.on('message', (data) => {
        try {
            let messageData;
            try {
                messageData = JSON.parse(data);
            } catch (e) {
                messageData = { type: 'raw', data: data.toString() };
            }
            
            console.log(`📨 Received from client:`, messageData);
            
            // Process game over events for leaderboard
            if (messageData.type === 'game_event' && messageData.event === 'game_over') {
                processGameOverEvent(messageData);
            }
            
            //if receiving a command from admin-panel then process the command
            if (typeof messageData === 'object' && messageData !== null) {
                const messageType = messageData.type;
                
                // If it's not a command message, but has a command field, extract it
                if (messageData.command && messageData.source === 'admin-panel') {
                    command = messageData.command;
                    source = messageData.source;
                    console.log("Received command: " +command + " from " + source);
                    handleCommand(command);
                } else {
                    return;
                }
            }

            // Don't echo back confirmations to avoid loops
            // Just log the received message
            
        } catch (error) {
            console.error('❌ Error processing message:', error);
        }
    });

    ws.on('close', (code, reason) => {
        connectedClients.delete(ws);
        console.log(`🔌 Client disconnected (${code}): ${reason}`);
        console.log(`👥 Total connected clients: ${connectedClients.size}`);
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        connectedClients.delete(ws);
    });
});

// Command line interface for manual testing
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('💬 Type commands to send to all connected clients (start, pause, new) or "quit" to exit:');

rl.on('line', (input) => {
    const command = input.trim().toLowerCase();
    handleCommand(command);
});

// Process game over events for leaderboard
function processGameOverEvent(gameEvent) {
    try {
        const player = gameEvent.player;
        const gameData = gameEvent.gameData;
        
        // Calculate score: T-shirt total value + coins remaining
        const tShirtValue = gameData.tShirtsCollected.totalValue || 0;
        const coinsRemaining = gameData.coinsRemaining || 0;
        const totalScore = tShirtValue + coinsRemaining;
        
        const leaderboardEntry = {
            userId: player.userId,
            email: player.email,
            username: player.username,
            score: totalScore,
            tShirtValue: tShirtValue,
            coinsRemaining: coinsRemaining,
            tShirtsCount: gameData.tShirtsCollected.totalCount || 0,
            level: gameData.currentLevel || 1,
            timestamp: gameEvent.timestamp,
            gameSession: gameData.gameSession
        };
        
        // Add to leaderboard data
        leaderboardData.push(leaderboardEntry);
        
        // Sort by score (highest first) and keep top 100
        leaderboardData.sort((a, b) => b.score - a.score);
        if (leaderboardData.length > 100) {
            leaderboardData = leaderboardData.slice(0, 100);
        }
        
        console.log(`🏆 New leaderboard entry: ${player.userId} scored ${totalScore} (T-shirts: ${tShirtValue}, Coins: ${coinsRemaining})`);
        console.log(`📊 Current leaderboard has ${leaderboardData.length} entries`);
        
    } catch (error) {
        console.error('❌ Error processing game over event for leaderboard:', error);
    }
}

function handleCommand(command) {
    console.log("Handling command: " + command);
    if (command === 'quit' || command === 'exit') {
        console.log('🛑 Shutting down server...');
        server.close();
        rl.close();
        process.exit(0);
    }
    
    if (command === 'status') {
        console.log(`📊 Server Status:`);
        console.log(`   Port: ${PORT}`);
        console.log(`   Connected clients: ${connectedClients.size}`);
        console.log(`   Uptime: ${process.uptime().toFixed(2)}s`);
        return;
    }
    
    if (['start', 'pause', 'new'].includes(command)) {
        const message = JSON.stringify({
            command: command,
            timestamp: new Date().toISOString(),
            source: 'server'
        });
        
        let sentCount = 0;
        connectedClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
                sentCount++;
            }
        });
        
        console.log(`📤 Sent "${command}" command to ${sentCount} client(s)`);
    } else if (command !== '') {
        console.log(`❓ Unknown command: "${command}". Available: start, pause, new, status, quit`);
    }
}


// HTTP Server for leaderboard API
const HTTP_PORT = 8081;
const httpServer = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (parsedUrl.pathname === '/leaderboard') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            count: leaderboardData.length,
            data: leaderboardData,
            lastUpdated: new Date().toISOString()
        }));
        console.log(`📊 Leaderboard API called - returned ${leaderboardData.length} entries`);
    } else if (parsedUrl.pathname === '/health') {
        // Health check endpoint for Docker
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            service: 'websocket-server',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            connectedClients: wss.clients.size,
            leaderboardEntries: leaderboardData.length
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

httpServer.listen(HTTP_PORT, () => {
    console.log(`📊 Leaderboard API server running on http://localhost:${HTTP_PORT}`);
    console.log(`🔗 Leaderboard data: http://localhost:${HTTP_PORT}/leaderboard`);
});

// Handle server shutdown gracefully
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    server.close();
    httpServer.close();
    rl.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    server.close();
    httpServer.close();
    rl.close();
    process.exit(0);
});
