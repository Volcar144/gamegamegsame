import { SignJWT, jwtVerify } from 'jose';

// Convert secret string to Uint8Array for jose
const SECRET = new TextEncoder().encode('efhwiuhwhehiu&Y&£&87iyhdjdudhfF:V>LDKHfvfhfududd');

// Converts ArrayBuffer to hex string (Web-compatible replacement for Buffer)
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Hash password with salt using Web Crypto API
async function hashPassword(password, salt) {
  const msgUint8 = new TextEncoder().encode(salt + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  return bufferToHex(hashBuffer);
}

// Generate random salt
function generateSalt() {
  return crypto.getRandomValues(new Uint8Array(8))
    .reduce((str, b) => str + b.toString(16).padStart(2, '0'), '');
}

// Main POST handler
export async function onRequestPost({ request, env }) {
  const data = await request.json();
  const { username, password } = data;

  // Validate input
  if (!username || !password || username.length < 3 || username.length > 15 || password.length < 6) {
    return new Response(JSON.stringify({ error: 'Invalid username or password' }), { status: 400 });
  }

  const kv = env.USERS_KV;

  // Check if user exists
  let userDataRaw = await kv.get(username);
  if (userDataRaw) {
    const userData = JSON.parse(userDataRaw);

    // Verify password
    const inputHash = await hashPassword(password, userData.salt);
    if (inputHash !== userData.hash) {
      return new Response(JSON.stringify({ error: 'Invalid credentials' }), { status: 401 });
    }

    // Create JWT token
    const token = await new SignJWT({ username, playerId: userData.playerId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET);

    return new Response(JSON.stringify({ token, playerId: userData.playerId }), {
      headers: { 'Content-Type': 'application/json' }
    });

  } else {
    // Register new user
    const salt = generateSalt();
    const hash = await hashPassword(password, salt);
    const userData = {
      username,
      hash,
      salt,
      playerId: crypto.randomUUID(),
      customization: { color: '#00ff00', weapon: 'pistol' },
      score: 0,
      kills: 0
    };
    await kv.put(username, JSON.stringify(userData));

    // Create JWT token
    const token = await new SignJWT({ username, playerId: userData.playerId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(SECRET);

    return new Response(JSON.stringify({ token, playerId: userData.playerId }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
