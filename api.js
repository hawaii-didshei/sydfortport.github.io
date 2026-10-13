const API_URL = 'https://tabrica.ru/orgs/sudy-fortport/db/167';
const TOKEN = 'tab_kO8PuBTFFdzl84B1ptFqEU5I1xVUZrE1XXMnCfkQLUjoU7r2PkQEdxiooxHsuUFJ';
const DATABASE_ID = 167;

const TABLES = {
  ROOMS: 218,
  PLAYERS: 0,
  EVIDENCE: 0,
  MESSAGES: 0
};

function tableUrl(tableId) {
  return API_URL + '/databases/' + DATABASE_ID + '/tables/' + tableId + '/records';
}

async function request(method, tableId, body, recordId) {
  let url = tableUrl(tableId);
  if (recordId) url += '/' + recordId;
  const options = {
    method: method,
    headers: {
      'Authorization': 'Bearer ' + TOKEN,
      'Content-Type': 'application/json'
    }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  return await res.json();
}

async function createRoomRecord(roomCode, mode, judgeId) {
  return request('POST', TABLES.ROOMS, {
    room_code: roomCode,
    mode: mode,
    status: 'waiting',
    judge_id: judgeId,
    delete_at: 0,
    created_at: new Date().toISOString()
  });
}

async function findRoom(roomCode) {
  const where = encodeURIComponent('(room_code,eq,' + roomCode + ')');
  const url = tableUrl(TABLES.ROOMS) + '?where=' + where + '&response_format=names';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  const data = await res.json();
  return data.data.records[0];
}

async function finishRoom(recordId) {
  const deleteAt = Math.floor(Date.now() / 1000) + 3600;
  return request('PUT', TABLES.ROOMS, {
    status: 'finished',
    delete_at: deleteAt
  }, recordId);
}

async function addPlayerRecord(roomCode, nickname, avatarUrl, role) {
  return request('POST', TABLES.PLAYERS, {
    room_code: roomCode,
    nickname: nickname,
    avatar_url: avatarUrl,
    role: role,
    joined_at: new Date().toISOString()
  });
}

async function getPlayers(roomCode) {
  const where = encodeURIComponent('(room_code,eq,' + roomCode + ')');
  const url = tableUrl(TABLES.PLAYERS) + '?where=' + where + '&response_format=names';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  const data = await res.json();
  return data.data.records;
}

async function addEvidenceRecord(roomCode, authorId, title, imageUrl) {
  return request('POST', TABLES.EVIDENCE, {
    room_code: roomCode,
    author_id: authorId,
    title: title,
    image_url: imageUrl,
    created_at: new Date().toISOString()
  });
}

async function getEvidence(roomCode) {
  const where = encodeURIComponent('(room_code,eq,' + roomCode + ')');
  const url = tableUrl(TABLES.EVIDENCE) + '?where=' + where + '&response_format=names';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  const data = await res.json();
  return data.data.records;
}

async function sendMessageRecord(roomCode, playerId, nickname, text) {
  return request('POST', TABLES.MESSAGES, {
    room_code: roomCode,
    player_id: playerId,
    nickname: nickname,
    text: text,
    created_at: new Date().toISOString()
  });
}

async function getMessages(roomCode) {
  const where = encodeURIComponent('(room_code,eq,' + roomCode + ')');
  const url = tableUrl(TABLES.MESSAGES) + '?where=' + where + '&response_format=names';
  const res = await fetch(url, {
    headers: { 'Authorization': 'Bearer ' + TOKEN }
  });
  const data = await res.json();
  return data.data.records;
}
