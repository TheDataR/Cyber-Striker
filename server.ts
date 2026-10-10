import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

// WebSocket Server for Multiplayer
const wss = new WebSocketServer({ server, path: '/ws' });

interface Player {
  id: string;
  name: string;
  room: string;
  team: 'blue' | 'red';
  x: number;
  y: number;
  z: number;
  rotY: number;
  rotX: number;
  wep: number;
  wepClass: string;
  hp: number;
  maxHp: number;
  isShooting: boolean;
  walkPhase: number;
  ws: WebSocket;
  lastActive: number;
}

const rooms: Record<string, Record<string, Player>> = {};
const roomBotCounts: Record<string, number> = {};
const roomMatchDurations: Record<string, number> = {};
const roomAllySmartness: Record<string, number> = {};
const roomEnemySmartness: Record<string, number> = {};
const roomGameModes: Record<string, string> = {};
const roomMaps: Record<string, string> = {};

function getRoomPlayers(roomName: string, excludeId?: string) {
  const room = rooms[roomName];
  if (!room) return [];
  return Object.values(room)
    .filter((p) => p.id !== excludeId)
    .map((p) => ({
      id: p.id,
      name: p.name,
      team: p.team,
      x: p.x,
      y: p.y,
      z: p.z,
      rotY: p.rotY,
      rotX: p.rotX,
      wep: p.wep,
      wepClass: p.wepClass,
      hp: p.hp,
      maxHp: p.maxHp,
      isShooting: p.isShooting,
      walkPhase: p.walkPhase
    }));
}

function broadcastToRoom(roomName: string, msg: any, excludeId?: string) {
  const room = rooms[roomName];
  if (!room) return;
  const payload = JSON.stringify(msg);
  for (const pid in room) {
    if (pid !== excludeId && room[pid].ws.readyState === WebSocket.OPEN) {
      room[pid].ws.send(payload);
    }
  }
}

wss.on('connection', (ws) => {
  let playerId = '';
  let playerRoom = '';

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === 'join') {
        playerId = `player_${Math.random().toString(36).substring(2, 9)}`;
        playerRoom = data.room || 'CyberArena1';

        if (!rooms[playerRoom]) {
          rooms[playerRoom] = {};
          if (typeof data.botCount === 'number') {
            roomBotCounts[playerRoom] = data.botCount;
          }
          if (typeof data.matchDuration === 'number') {
            roomMatchDurations[playerRoom] = Math.min(30, Math.max(1, data.matchDuration));
          }
          if (typeof data.allySmartness === 'number') {
            roomAllySmartness[playerRoom] = Math.min(10, Math.max(1, data.allySmartness));
          }
          if (typeof data.enemySmartness === 'number') {
            roomEnemySmartness[playerRoom] = Math.min(10, Math.max(1, data.enemySmartness));
          }
          if (data.gameMode) {
            roomGameModes[playerRoom] = data.gameMode;
          }
          if (data.mapKey) {
            roomMaps[playerRoom] = data.mapKey;
          }
        } else {
          if (typeof data.botCount === 'number' && roomBotCounts[playerRoom] === undefined) {
            roomBotCounts[playerRoom] = data.botCount;
          }
          if (typeof data.matchDuration === 'number' && roomMatchDurations[playerRoom] === undefined) {
            roomMatchDurations[playerRoom] = Math.min(30, Math.max(1, data.matchDuration));
          }
          if (typeof data.allySmartness === 'number' && roomAllySmartness[playerRoom] === undefined) {
            roomAllySmartness[playerRoom] = Math.min(10, Math.max(1, data.allySmartness));
          }
          if (typeof data.enemySmartness === 'number' && roomEnemySmartness[playerRoom] === undefined) {
            roomEnemySmartness[playerRoom] = Math.min(10, Math.max(1, data.enemySmartness));
          }
          if (data.gameMode && !roomGameModes[playerRoom]) {
            roomGameModes[playerRoom] = data.gameMode;
          }
          if (data.mapKey && !roomMaps[playerRoom]) {
            roomMaps[playerRoom] = data.mapKey;
          }
        }

        const currentRoomBots = roomBotCounts[playerRoom] !== undefined ? roomBotCounts[playerRoom] : 8;
        const currentMatchDuration = roomMatchDurations[playerRoom] !== undefined ? roomMatchDurations[playerRoom] : 5;
        const currentAllySmartness = roomAllySmartness[playerRoom] !== undefined ? roomAllySmartness[playerRoom] : 5;
        const currentEnemySmartness = roomEnemySmartness[playerRoom] !== undefined ? roomEnemySmartness[playerRoom] : 5;
        const currentGameMode = roomGameModes[playerRoom] || 'ffa';
        const currentMapKey = roomMaps[playerRoom] || 'neoncity';

        const newPlayer: Player = {
          id: playerId,
          name: (data.name || 'Operative').substring(0, 16),
          room: playerRoom,
          team: data.team === 'red' ? 'red' : 'blue',
          x: data.x || 0,
          y: data.y || 1.6,
          z: data.z || 0,
          rotY: 0,
          rotX: 0,
          wep: data.wep || 1,
          wepClass: data.wepClass || 'ar',
          hp: data.hp || 150,
          maxHp: 150,
          isShooting: false,
          walkPhase: 0,
          ws,
          lastActive: Date.now()
        };

        rooms[playerRoom][playerId] = newPlayer;

        // Send confirmation and current room players to the newcomer
        ws.send(
          JSON.stringify({
            type: 'welcome',
            id: playerId,
            room: playerRoom,
            players: getRoomPlayers(playerRoom, playerId),
            botCount: currentRoomBots,
            matchDuration: currentMatchDuration,
            allySmartness: currentAllySmartness,
            enemySmartness: currentEnemySmartness,
            gameMode: currentGameMode,
            mapKey: currentMapKey
          })
        );

        // Notify other players in the room
        broadcastToRoom(
          playerRoom,
          {
            type: 'player_joined',
            player: {
              id: newPlayer.id,
              name: newPlayer.name,
              team: newPlayer.team,
              x: newPlayer.x,
              y: newPlayer.y,
              z: newPlayer.z,
              rotY: newPlayer.rotY,
              rotX: newPlayer.rotX,
              wep: newPlayer.wep,
              wepClass: newPlayer.wepClass,
              hp: newPlayer.hp,
              maxHp: newPlayer.maxHp
            }
          },
          playerId
        );
      } else if (data.type === 'state' && playerId && playerRoom && rooms[playerRoom]?.[playerId]) {
        const p = rooms[playerRoom][playerId];
        p.x = data.x;
        p.y = data.y;
        p.z = data.z;
        p.rotY = data.rotY;
        p.rotX = data.rotX;
        p.wep = data.wep;
        p.wepClass = data.wepClass;
        p.hp = data.hp;
        p.isShooting = data.isShooting;
        p.walkPhase = data.walkPhase;
        p.lastActive = Date.now();

        // Broadcast update to others
        broadcastToRoom(
          playerRoom,
          {
            type: 'player_state',
            id: playerId,
            x: p.x,
            y: p.y,
            z: p.z,
            rotY: p.rotY,
            rotX: p.rotX,
            wep: p.wep,
            wepClass: p.wepClass,
            hp: p.hp,
            isShooting: p.isShooting,
            walkPhase: p.walkPhase
          },
          playerId
        );
      } else if (data.type === 'shoot' && playerId && playerRoom) {
        broadcastToRoom(
          playerRoom,
          {
            type: 'player_shoot',
            id: playerId,
            from: data.from,
            to: data.to,
            slot: data.slot,
            weaponClass: data.weaponClass
          },
          playerId
        );
      } else if (data.type === 'hit' && playerId && playerRoom) {
        const targetId = data.targetId;
        const targetPlayer = rooms[playerRoom]?.[targetId];
        if (targetPlayer && targetPlayer.ws.readyState === WebSocket.OPEN) {
          targetPlayer.ws.send(
            JSON.stringify({
              type: 'take_damage',
              fromId: playerId,
              fromName: rooms[playerRoom][playerId]?.name || 'Unknown',
              dmg: data.dmg,
              crit: data.crit
            })
          );
        }
      } else if (data.type === 'kill' && playerId && playerRoom) {
        broadcastToRoom(playerRoom, {
          type: 'player_killed',
          killer: data.killer,
          victim: data.victim,
          color: data.color
        });
      } else if (data.type === 'bot_control' && playerId && playerRoom) {
        if (data.action === 'set' && typeof data.count === 'number') {
          roomBotCounts[playerRoom] = data.count;
        } else if (data.action === 'add') {
          roomBotCounts[playerRoom] = (roomBotCounts[playerRoom] || 0) + 1;
        } else if (data.action === 'remove') {
          roomBotCounts[playerRoom] = Math.max(0, (roomBotCounts[playerRoom] || 0) - 1);
        }
        broadcastToRoom(
          playerRoom,
          {
            type: 'bot_control',
            action: data.action,
            count: data.count,
            team: data.team,
            sender: rooms[playerRoom]?.[playerId]?.name || 'Operative'
          },
          playerId
        );
      } else if (data.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', time: data.time }));
      }
    } catch (e) {
      // Ignore malformed packets
    }
  });

  const cleanup = () => {
    if (playerId && playerRoom && rooms[playerRoom]?.[playerId]) {
      delete rooms[playerRoom][playerId];
      broadcastToRoom(playerRoom, {
        type: 'player_left',
        id: playerId
      });
      if (Object.keys(rooms[playerRoom]).length === 0) {
        delete rooms[playerRoom];
        delete roomBotCounts[playerRoom];
        delete roomMatchDurations[playerRoom];
        delete roomAllySmartness[playerRoom];
        delete roomEnemySmartness[playerRoom];
        delete roomGameModes[playerRoom];
        delete roomMaps[playerRoom];
      }
    }
  };

  ws.on('close', cleanup);
  ws.on('error', cleanup);
});

// Periodic inactive player cleanup (15s timeout)
setInterval(() => {
  const now = Date.now();
  for (const rName in rooms) {
    for (const pId in rooms[rName]) {
      if (now - rooms[rName][pId].lastActive > 15000) {
        rooms[rName][pId].ws.terminate();
        delete rooms[rName][pId];
        broadcastToRoom(rName, { type: 'player_left', id: pId });
      }
    }
  }
}, 5000);

// API status route
app.get('/api/online-status', (req, res) => {
  let totalPlayers = 0;
  const roomList = Object.keys(rooms).map((r) => {
    const count = Object.keys(rooms[r]).length;
    totalPlayers += count;
    return { name: r, players: count };
  });
  res.json({ totalPlayers, rooms: roomList });
});

// API servers listing route for Server Browser - ONLY servers with real human players (playerCount > 0)
app.get('/api/servers', (req, res) => {
  const result: any[] = [];

  // Active rooms on server: ONLY include rooms where real human players are present
  for (const rName in rooms) {
    const playerCount = Object.keys(rooms[rName] || {}).length;
    if (playerCount > 0) {
      result.push({
        id: `live_${rName}`,
        name: rName,
        region: 'US-EAST',
        gameMode: roomGameModes[rName] || 'ffa',
        mapKey: roomMaps[rName] || 'neoncity',
        playerCount,
        maxPlayers: 16,
        botCount: roomBotCounts[rName] !== undefined ? roomBotCounts[rName] : 8,
        allyBotSmartness: roomAllySmartness[rName] !== undefined ? roomAllySmartness[rName] : 5,
        enemyBotSmartness: roomEnemySmartness[rName] !== undefined ? roomEnemySmartness[rName] : 5,
        matchDuration: roomMatchDurations[rName] !== undefined ? roomMatchDurations[rName] : 5,
        ping: Math.floor(14 + Math.random() * 12),
        isOfficial: false
      });
    }
  }

  res.json({ servers: result });
});

// Download index.html route
app.get('/api/download-html', (req, res) => {
  const filePath = path.resolve(__dirname, 'index.html');
  res.download(filePath, 'index.html');
});

// Vite middleware in dev or static serve in prod
const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const PORT = Number(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
