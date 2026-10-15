import {
  createRoomRecord,
  findRoom,
  finishRoom,
  addPlayerRecord,
  getPlayers,
  addEvidenceRecord,
  getEvidence,
  sendMessageRecord,
  getMessages
} from './api.js';

let currentRoomCode = '';
let currentUser = null;
let currentRoomRecordId = null;
let refreshTimer = null;
let isJudgeFlow = false;

window.showCreate = function() {
  document.getElementById('create-error').textContent = '';
  show('screen-create');
};

window.showJoin = function() {
  if (!isJudgeFlow) {
    document.getElementById('join-title').textContent = 'Вход в суд';
    document.getElementById('join-code').disabled = false;
    document.getElementById('join-code').value = '';
    document.getElementById('join-role-field').classList.remove('hidden');
    document.getElementById('join-role').value = 'spectator';
    document.getElementById('join-nick').value = '';
    document.getElementById('join-avatar').value = '';
    document.getElementById('join-error').textContent = '';
  }
  show('screen-join');
};

function show(id) {
  document.querySelectorAll('.screen').forEach(function(el) {
    el.classList.add('hidden');
  });
  document.getElementById(id).classList.remove('hidden');

  const bg = document.getElementById('bg-blur');
  if (id === 'screen-court') {
    bg.classList.add('hidden');
  } else {
    bg.classList.remove('hidden');
  }
}

function randomCode() {
  return 'court-' + Math.random().toString(36).substring(2, 8);
}

window.createRoom = async function() {
  const err = document.getElementById('create-error');
  err.textContent = '';
  try {
    const mode = document.getElementById('create-mode').value;
    const roomCode = randomCode();
    const judgeId = 'judge-' + Date.now();
    await createRoomRecord(roomCode, mode, judgeId);

    isJudgeFlow = true;
    document.getElementById('join-title').textContent = 'Создание судьи';
    document.getElementById('join-code').value = roomCode;
    document.getElementById('join-code').disabled = true;
    document.getElementById('join-role-field').classList.add('hidden');
    document.getElementById('join-role').value = 'judge';
    document.getElementById('join-nick').value = '';
    document.getElementById('join-avatar').value = '';
    document.getElementById('join-error').textContent = '';

    show('screen-join');
  } catch (e) {
    err.textContent = 'Ошибка: ' + e.message;
  }
};

window.joinRoom = async function() {
  const code = document.getElementById('join-code').value.trim();
  const nick = document.getElementById('join-nick').value.trim();
  const role = document.getElementById('join-role').value;
  const file = document.getElementById('join-avatar').files[0];
  const err = document.getElementById('join-error');
  err.textContent = '';

  if (!code || !nick || !file) {
    err.textContent = 'Заполни все поля';
    return;
  }

  try {
    const room = await findRoom(code);
    if (!room) {
      err.textContent = 'Комната не найдена';
      return;
    }

    const playerId = (role === 'judge' ? 'judge-' : 'player-') + Date.now();
    const avatarUrl = await cropToSquare(file, 256, 0.7);
    await addPlayerRecord(code, nick, avatarUrl, role);

    currentRoomCode = code;
    currentRoomRecordId = room.id;
    currentUser = {
      player_id: playerId,
      nickname: nick,
      role: role,
      avatar_url: avatarUrl
    };
    enterCourt();
  } catch (e) {
    err.textContent = 'Ошибка: ' + e.message;
  }
};

function enterCourt() {
  show('screen-court');
  refreshAll();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshAll, 5000);
}

async function refreshAll() {
  try {
    const players = await getPlayers(currentRoomCode);
    const evidence = await getEvidence(currentRoomCode);
    const messages = await getMessages(currentRoomCode);
    renderPlayers(players);
    renderEvidence(evidence);
    renderMessages(messages);
  } catch (e) {
    console.log('refresh error', e);
  }
}

function renderPlayers(players) {
  const layer = document.getElementById('players-layer');
  layer.innerHTML = '';

  const slots = {
    judge:      { top: '25%', left: '50%' },
    prosecutor: { top: '55%', left: '25%' },
    advocate:   { top: '65%', left: '15%' },
    victim:     { top: '55%', left: '75%' },
    defendant:  { top: '65%', left: '85%' }
  };

  const labels = {
    judge: 'СУДЬЯ',
    prosecutor: 'ПРОКУРОР',
    advocate: 'АДВОКАТ',
    victim: 'ЖЕРТВА',
    defendant: 'ПОДСУДИМЫЙ'
  };

  const spectators = [];

  players.forEach(function(p) {
    const slot = slots[p.role];
    if (!slot) {
      spectators.push(p);
      return;
    }
    const el = document.createElement('div');
    el.className = 'player-slot';
    el.style.top = slot.top;
    el.style.left = slot.left;
    el.style.transform = 'translateX(-50%)';
    el.innerHTML =
      '<img src="' + p.avatar_url + '" />' +
      '<span class="name">' + p.nickname + '</span>' +
      '<span class="role">' + labels[p.role] + '</span>';
    layer.appendChild(el);
  });

  const box = document.getElementById('spectators-box');
  const list = document.getElementById('spectators-list');
  list.innerHTML = '';
  if (spectators.length === 0) {
    box.classList.add('hidden');
  } else {
    box.classList.remove('hidden');
    spectators.forEach(function(s) {
      const el = document.createElement('div');
      el.className = 'spectator';
      el.innerHTML = '<img src="' + s.avatar_url + '" /><span>' + s.nickname + '</span>';
      list.appendChild(el);
    });
  }
}

function renderEvidence(evidence) {
  const list = document.getElementById('evidence-list');
  list.innerHTML = '';
  evidence.forEach(function(ev) {
    const el = document.createElement('div');
    el.className = 'evidence-card';
    el.innerHTML =
      '<img src="' + ev.image_url + '" />' +
      '<p>' + ev.title + '</p>';
    list.appendChild(el);
  });

  const canAdd = ['prosecutor', 'advocate', 'victim'].indexOf(currentUser.role) !== -1;
  const form = document.getElementById('evidence-form');
  if (canAdd) form.classList.remove('hidden');
  else form.classList.add('hidden');

  const finishBtn = document.getElementById('btn-finish');
  if (currentUser.role === 'judge') finishBtn.classList.remove('hidden');
  else finishBtn.classList.add('hidden');
}

function renderMessages(messages) {
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  messages.forEach(function(m) {
    const el = document.createElement('div');
    el.className = 'chat-message';
    el.innerHTML = '<span class="who">' + m.nickname + ': </span>' + m.text;
    list.appendChild(el);
  });
  list.scrollTop = list.scrollHeight;
}

window.toggleEvidence = function() {
  document.getElementById('evidence-modal').classList.toggle('hidden');
};

window.toggleChat = function() {
  document.getElementById('chat-modal').classList.toggle('hidden');
};

window.addEvidence = async function() {
  const title = document.getElementById('evidence-title').value.trim();
  const file = document.getElementById('evidence-file').files[0];
  if (!title || !file) return;
  const imageUrl = await cropToSquare(file, 400, 0.6);
  await addEvidenceRecord(currentRoomCode, currentUser.player_id, title, imageUrl);
  document.getElementById('evidence-title').value = '';
  document.getElementById('evidence-file').value = '';
  refreshAll();
};

window.sendMessage = async function() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  await sendMessageRecord(currentRoomCode, currentUser.player_id, currentUser.nickname, text);
  input.value = '';
  refreshAll();
};

window.finishCourt = async function() {
  if (!confirm('Огласить приговор?')) return;
  await finishRoom(currentRoomRecordId);
  alert('Суд завершён. Комната удалится в течение 24 часов.');
};

function cropToSquare(file, maxSize, quality) {
  return new Promise(function(resolve) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const size = Math.min(img.width, img.height);
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const ox = (img.width - size) / 2;
        const oy = (img.height - size) / 2;
        ctx.drawImage(img, ox, oy, size, size, 0, 0, size, size);
        const small = document.createElement('canvas');
        small.width = maxSize;
        small.height = maxSize;
        small.getContext('2d').drawImage(canvas, 0, 0, maxSize, maxSize);
        resolve(small.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

window.addEventListener('load', function() {
  show('screen-menu');
});
