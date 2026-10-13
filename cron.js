const API_URL = 'https://api.tabrica.ru/public/v1';
const TOKEN = 'tab_kO8PuBTFFdzl84B1ptFqEU5I1xVUZrE1XXMnCfkQLUjoU7r2PkQEdxiooxHsuUFJ';
const DATABASE_ID = 167;
const ROOMS_TABLE = 218;

async function cleanup() {
  const now = Math.floor(Date.now() / 1000);
  const where = encodeURIComponent('(delete_at,lt,' + now + ')');
  const url = API_URL + '/databases/' + DATABASE_ID + '/tables/' + ROOMS_TABLE + '/records?where=' + where;
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  const data = await res.json();
  const rooms = data.data && data.data.records ? data.data.records : [];
  for (let i = 0; i < rooms.length; i++) {
    const del = API_URL + '/databases/' + DATABASE_ID + '/tables/' + ROOMS_TABLE + '/records/' + rooms[i].id;
    await fetch(del, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + TOKEN }
    });
    console.log('Удалено: ' + rooms[i].room_code);
  }
}

cleanup();
