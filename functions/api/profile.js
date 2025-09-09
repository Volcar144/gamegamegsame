import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode('efhwiuhwhehiu&Y&£&87iyhdjdudhfF:V>LDKHfvfhfududd');

export async function onRequestGet({ request, env }) {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
  const token = auth.substring(7);

  try {
    const { payload } = await jwtVerify(token, SECRET);

    const kv = env.USERS_KV;
    const userDataRaw = await kv.get(payload.username);
    if (!userDataRaw) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }
    const userData = JSON.parse(userDataRaw);

    return new Response(
      JSON.stringify({
        username: userData.username,
        playerId: userData.playerId,
        customization: userData.customization,
        score: userData.score,
        kills: userData.kills,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }
}
