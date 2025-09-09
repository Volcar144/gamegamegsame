/**
 * Simple matchmaking system using Cloudflare KV.
 * Lobbies stored in KV with TTL.
 * For demo, lobbies expire after 5 minutes.
 * 
 * Lobby structure:
 * {
 *   id: string,
 *   mode: string,
 *   players: [{username, peerId, customization}],
 *   hostPeerId: string,
 *   mapId: string,
 *   isStarted: boolean
 * }
 */

import jwt from 'jsonwebtoken';

const SECRET = 'efhwiuhwhehiu&Y&£&87iyhdjdudhfF:V>LDKHfvfhfududd';

const LOBBY_TTL = 300; // 5 minutes

export async function onRequestPost({ request, env }) {
  const auth = request.headers.get('Authorization');
  if(!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({error:'Unauthorized'}), {status:401});
  }
  const token = auth.substring(7);
  try {
    const payload = jwt.verify(token, SECRET);
    const data = await request.json();
    const { mode, peerId, mapVote } = data;
    if(!mode || !peerId) {
      return new Response(JSON.stringify({error:'Invalid data'}), {status:400});
    }
    const kv = env.LOBBIES_KV;
    const usersKv = env.USERS_KV;

    // Get user data
    const userDataRaw = await usersKv.get(payload.username);
    if(!userDataRaw) return new Response(JSON.stringify({error:'User not found'}), {status:404});
    const userData = JSON.parse(userDataRaw);

    // Load all lobbies
    const lobbiesRaw = await kv.get('lobbies');
    let lobbies = lobbiesRaw ? JSON.parse(lobbiesRaw) : [];

    // Try to find existing lobby with same mode and not started and space
    let lobby = lobbies.find(l => l.mode === mode && !l.isStarted && l.players.length < (mode === '1v1' ? 2 : 8));

    if(!lobby) {
      // Create new lobby
      lobby = {
        id: crypto.randomUUID(),
        mode,
        players: [],
        hostPeerId: peerId,
        mapId: mapVote || 'map1',
        isStarted: false
      };
      lobbies.push(lobby);
    }

    // Add player if not already in lobby
    if(!lobby.players.find(p => p.peerId === peerId)) {
      lobby.players.push({
        username: payload.username,
        peerId,
        customization: userData.customization || {color:'#00ff00', weapon:'pistol'}
      });
    }

    // If lobby full, start game
    if((mode === '1v1' && lobby.players.length === 2) || (mode === 'multiplayer' && lobby.players.length >= 2) || (mode === 'zombies' && lobby.players.length >= 1)) {
      lobby.isStarted = true;
    }

    // Save lobbies back
    await kv.put('lobbies', JSON.stringify(lobbies), {expirationTtl: LOBBY_TTL});

    // Return lobby info
    return new Response(JSON.stringify({
      lobbyId: lobby.id,
      mode: lobby.mode,
      players: lobby.players,
      hostPeerId: lobby.hostPeerId,
      isHost: lobby.hostPeerId === peerId,
      mapId: lobby.mapId
    }), {headers: {'Content-Type':'application/json'}});
  } catch(e) {
    return new Response(JSON.stringify({error:'Unauthorized'}), {status:401});
  }
}
