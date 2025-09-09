export async function onRequestGet({ env }) {
  const kv = env.USERS_KV;
  // List all users (Cloudflare KV does not support listing keys by default, so store usernames in a separate key)
  const usersListRaw = await kv.get('users_list');
  if(!usersListRaw) {
    return new Response(JSON.stringify({top:[]}), {headers:{'Content-Type':'application/json'}});
  }
  const usersList = JSON.parse(usersListRaw);
  const usersData = [];
  for(const username of usersList) {
    const dataRaw = await kv.get(username);
    if(dataRaw) {
      const data = JSON.parse(dataRaw);
      usersData.push({username, score: data.score || 0});
    }
  }
  usersData.sort((a,b) => b.score - a.score);
  return new Response(JSON.stringify({top: usersData.slice(0,10)}), {headers:{'Content-Type':'application/json'}});
}
