import {
  createRoomRecord,
  findRoom,
  finishRoom,
  deleteRoomData,
  addPlayerRecord,
  getPlayers,
  addEvidenceRecord,
  getEvidence,
  sendMessageRecord,
  getMessages,
  getRoomStatus
} from './api.js';

let currentRoomCode = '';
let currentUser = null;
let currentRoomRecordId = null;
let refreshTimer = null;
let roomFinished = false;

const ROLE_LABELS = {
  judge: 'Судья',
  prosecutor: 'Прокурор',
  advocate: 'Адвокат',
  victim: 'Жертва',
  defendant: 'Подсудимый',
  witness: 'Свидетель',
  spectator: 'Зритель'
};

const SLOTS = {
  judge:      { top: '25%', left: '50%' },
  prosecutor: { top: '55%', left: '25%' },
  advocate:   { top: '65%', left: '15%' },
  victim:     { top: '55%', left: '75%' },
  defendant:  { top: '65%', left: '85%' }
};

const SLOT_LABELS = {
  judge: 'СУДЬЯ',
  prosecutor: 'ПРОКУРОР',
  advocate: 'АДВОКАТ',
  victim: 'ЖЕРТВА',
  defendant: 'ПОДСУДИМЫЙ'
};

const CAN_ADD_EVIDENCE = ['judge', 'prosecutor', 'advocate', 'victim'];

window.showCreate = function() {
  document.getElementById('create-error').textContent = '';
  show('screen-create');
};

window.showJoin = function() {
  document.getElementById('join-error').textContent = '';
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

function backToMenu() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
  currentRoomCode = '';
  currentUser = null;
  currentRoomRecordId = null;
  roomFinished = false;
  document.getElementById('players-layer').innerHTML = '';
  document.getElementById('evidence-list').innerHTML = '';
  document.getElementById('chat-list').innerHTML = '';
  document.getElementById('spectators-list').innerHTML = '';
  document.getElementById('spectators-box').classList.add('hidden');
  document.getElementById('verdict-banner').classList.add('hidden');
  document.getElementById('evidence-modal').classList.add('hidden');
  document.getElementById('chat-modal').classList.add('hidden');
  document.getElementById('verdict-modal').classList.add('hidden');
  document.getElementById('verdict-confirm').classList.add('hidden');
  document.getElementById('image-modal').classList.add('hidden');
  show('screen-menu');
}

function randomCode() {
  return 'court-' + Math.random().toString(36).substring(2, 8);
}

window.createRoom = async function() {
  const err = document.getElementById('create-error');
  err.textContent = '';

  const mode = document.getElementById('create-mode').value;
  const nick = document.getElementById('create-nick').value.trim();
  const file = document.getElementById('create-avatar').files[0];

  if (!nick || !file) {
    err.textContent = 'Введи ник и выбери аватарку';
    return;
  }

  try {
    const roomCode = randomCode();
    const judgeId = 'judge-' + Date.now();
    await createRoomRecord(roomCode, mode, judgeId);
    const room = await findRoom(roomCode);

    const avatarUrl = await cropToSquare(file, 256, 0.7);
    await addPlayerRecord(roomCode, nick, avatarUrl, 'judge');

    currentRoomCode = roomCode;
    currentRoomRecordId = room.id;
    currentUser = {
      player_id: judgeId,
      nickname: nick,
      role: 'judge',
      avatar_url: avatarUrl
    };
    roomFinished = false;
    enterCourt();
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

    const playerId = 'player-' + Date.now();
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
    roomFinished = false;
    enterCourt();
  } catch (e) {
    err.textContent = 'Ошибка: ' + e.message;
  }
};

function enterCourt() {
  show('screen-court');
  document.getElementById('room-code-box').textContent = 'КОД: ' + currentRoomCode;
  refreshAll();
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshAll, 4000);
}

async function refreshAll() {
  if (!currentRoomCode) return;
  try {
    const status = await getRoomStatus(currentRoomCode);
    if (status === 'finished') {
      backToMenu();
      return;
    }
    const results = await Promise.all([
      getPlayers(currentRoomCode),
      getEvidence(currentRoomCode),
      getMessages(currentRoomCode)
    ]);
    renderPlayers(results[0]);
    renderEvidence(results[1]);
    renderMessages(results[2]);
  } catch (e) {
    console.log('refresh error', e);
  }
}

function renderPlayers(players) {
  const layer = document.getElementById('players-layer');
  layer.innerHTML = '';

  const spectators = [];

  players.forEach(function(p) {
    const slot = SLOTS[p.role];
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
      '<img src="' + p.avatar_url + '" loading="lazy" />' +
      '<span class="name">' + p.nickname + '</span>' +
      '<span class="role">' + SLOT_LABELS[p.role] + '</span>';
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
      el.innerHTML =
        '<img src="' + s.avatar_url + '" loading="lazy" />' +
        '<span>' + s.nickname + ' (' + ROLE_LABELS[s.role] + ')</span>';
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
    el.onclick = function() { openImage(ev.image_url); };
    el.innerHTML =
      '<img src="' + ev.image_url + '" loading="lazy" />' +
      '<p>' + ev.title + '</p>' +
      '<p style="font-size:11px">' +
        (ev.author_nickname || '') +
        (ev.author_role ? ' (' + ROLE_LABELS[ev.author_role] + ')' : '') +
      '</p>';
    list.appendChild(el);
  });

  const form = document.getElementById('evidence-form');
  if (currentUser && CAN_ADD_EVIDENCE.indexOf(currentUser.role) !== -1 && !roomFinished) {
    form.classList.remove('hidden');
  } else {
    form.classList.add('hidden');
  }

  const finishBtn = document.getElementById('btn-finish');
  if (currentUser && currentUser.role === 'judge' && !roomFinished) {
    finishBtn.classList.remove('hidden');
  } else {
    finishBtn.classList.add('hidden');
  }
}

function renderMessages(messages) {
  const list = document.getElementById('chat-list');
  list.innerHTML = '';
  messages.forEach(function(m) {
    const el = document.createElement('div');
    el.className = 'chat-message';
    const roleName = ROLE_LABELS[m.role] || '';
    el.innerHTML =
      '<span class="who">' + m.nickname + ' (' + roleName + '): </span>' +
      m.text;
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
  if (!currentUser || CAN_ADD_EVIDENCE.indexOf(currentUser.role) === -1) return;
  const title = document.getElementById('evidence-title').value.trim();
  const file = document.getElementById('evidence-file').files[0];
  if (!title || !file) return;
  const imageUrl = await cropToSquare(file, 400, 0.6);
  await addEvidenceRecord(
    currentRoomCode,
    currentUser.player_id,
    currentUser.nickname,
    currentUser.role,
    title,
    imageUrl
  );
  document.getElementById('evidence-title').value = '';
  document.getElementById('evidence-file').value = '';
  refreshAll();
};

window.sendMessage = async function() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  await sendMessageRecord(
    currentRoomCode,
    currentUser.player_id,
    currentUser.nickname,
    currentUser.role,
    text
  );
  input.value = '';
  refreshAll();
};

window.openVerdict = function() {
  document.getElementById('verdict-text').value = '';
  document.getElementById('verdict-modal').classList.remove('hidden');
};

window.confirmVerdict = function() {
  const text = document.getElementById('verdict-text').value.trim();
  if (!text) return;
  document.getElementById('verdict-modal').classList.add('hidden');
  document.getElementById('verdict-confirm').classList.remove('hidden');
};

window.cancelVerdict = function() {
  document.getElementById('verdict-confirm').classList.add('hidden');
};

window.publishVerdict = async function() {
  const text = document.getElementById('verdict-text').value.trim();
  if (!text) return;

  document.getElementById('verdict-confirm').classList.add('hidden');

  const banner = document.getElementById('verdict-banner');
  banner.textContent = 'ПРИГОВОР: ' + text;
  banner.classList.remove('hidden');

  await sendMessageRecord(
    currentRoomCode,
    'judge',
    'СУД',
    'judge',
    'Оглашает приговор: ' + text
  );

  await finishRoom(currentRoomRecordId);
  roomFinished = true;

  const roomCode = currentRoomCode;
  const roomId = currentRoomRecordId;

  setTimeout(function() {
    deleteRoomData(roomCode, roomId);
  }, 1500);

  setTimeout(function() {
    alert('Суд завершён. Все данные удалены.');
    backToMenu();
  }, 3000);
};

window.copyRoomCode = function() {
  navigator.clipboard.writeText(currentRoomCode);
  const box = document.getElementById('room-code-box');
  const old = box.textContent;
  box.textContent = 'СКОПИРОВАНО';
  setTimeout(function() {
    box.textContent = old;
  }, 1500);
};

window.toggleCode = function() {
  const box = document.getElementById('room-code-box');
  const btn = document.getElementById('btn-hide-code');
  if (box.style.visibility === 'hidden') {
    box.style.visibility = 'visible';
    btn.textContent = 'Скрыть';
  } else {
    box.style.visibility = 'hidden';
    btn.textContent = 'Показать';
  }
};

window.openImage = function(url) {
  document.getElementById('image-modal-img').src = url;
  document.getElementById('image-modal').classList.remove('hidden');
};

window.closeImage = function() {
  document.getElementById('image-modal').classList.add('hidden');
  document.getElementById('image-modal-img').src = '';
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
