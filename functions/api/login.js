import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const SECRET = 'efhwiuhwhehiu&Y&£&87iyhdjdudhfF:V>LDKHfvfhfududd'; // Change to strong secret

export async function onRequestPost({ request, env }) {
  const data = await request.json();
  const { username, password } = data;

  if(!username || !password || username.length < 3 || username.length > 15 || password.length < 6) {
    return new Response(JSON.stringify({error:'Invalid username or password'}), {status:400});
  }

  const kv = env.USERS_KV;

  // Check if user exists
  let userData = await kv.get(username);
  if(userData) {
    userData = JSON.parse(userData);
    // Verify password
    const match = await bcrypt.compare(password, userData.hash);
    if(!match) {
      return new Response(JSON.stringify({error:'Invalid credentials'}), {status:401});
    }
  } else {
    // Register new user
    const hash = await bcrypt.hash(password, 10);
    userData = {
      username,
      hash,
      playerId: crypto.randomUUID(),
      customization: {color:'#00ff00', weapon:'pistol'},
      score: 0,
      kills: 0
    };
    await kv.put(username, JSON.stringify(userData));
  }

  // Create JWT token
  const token = jwt.sign({username, playerId: userData.playerId}, SECRET, {expiresIn:'7d'});

  return new Response(JSON.stringify({token, playerId: userData.playerId}), {
    headers: {'Content-Type':'application/json'}
  });
}
