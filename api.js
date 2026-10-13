import { app } from './firebase.js';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadString,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const db = getFirestore(app);
const storage = getStorage(app);

async function createRoomRecord(roomCode, mode, judgeId) {
  const ref = collection(db, 'rooms');
  await addDoc(ref, {
    room_code: roomCode,
    mode: mode,
    status: 'waiting',
    judge_id: judgeId,
    deleteAt: null,
    createdAt: serverTimestamp()
  });
  return { message: 'success' };
}

async function findRoom(roomCode) {
  const ref = collection(db, 'rooms');
  const q = query(ref, where('room_code', '==', roomCode));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

async function finishRoom(recordId) {
  const roomRef = doc(db, 'rooms', recordId);
  const deleteAt = Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000));
  await updateDoc(roomRef, {
    status: 'finished',
    deleteAt: deleteAt
  });
}

async function deleteRoomRecord(recordId) {
  await deleteDoc(doc(db, 'rooms', recordId));
}

async function addPlayerRecord(roomCode, nickname, avatarUrl, role) {
  const ref = collection(db, 'players');
  await addDoc(ref, {
    room_code: roomCode,
    nickname: nickname,
    avatar_url: avatarUrl,
    role: role,
    joinedAt: serverTimestamp()
  });
}

async function getPlayers(roomCode) {
  const ref = collection(db, 'players');
  const q = query(ref, where('room_code', '==', roomCode));
  const snap = await getDocs(q);
  return snap.docs.map(function(d) {
    return { id: d.id, ...d.data() };
  });
}

async function addEvidenceRecord(roomCode, authorId, title, imageUrl) {
  const ref = collection(db, 'evidence');
  await addDoc(ref, {
    room_code: roomCode,
    author_id: authorId,
    title: title,
    image_url: imageUrl,
    createdAt: serverTimestamp()
  });
}

async function getEvidence(roomCode) {
  const ref = collection(db, 'evidence');
  const q = query(ref, where('room_code', '==', roomCode));
  const snap = await getDocs(q);
  return snap.docs.map(function(d) {
    return { id: d.id, ...d.data() };
  });
}

async function sendMessageRecord(roomCode, playerId, nickname, text) {
  const ref = collection(db, 'messages');
  await addDoc(ref, {
    room_code: roomCode,
    player_id: playerId,
    nickname: nickname,
    text: text,
    createdAt: serverTimestamp()
  });
}

async function getMessages(roomCode) {
  const ref = collection(db, 'messages');
  const q = query(ref, where('room_code', '==', roomCode));
  const snap = await getDocs(q);
  const list = snap.docs.map(function(d) {
    return { id: d.id, ...d.data() };
  });
  list.sort(function(a, b) {
    const ta = a.createdAt && a.createdAt.seconds ? a.createdAt.seconds : 0;
    const tb = b.createdAt && b.createdAt.seconds ? b.createdAt.seconds : 0;
    return ta - tb;
  });
  return list;
}

async function uploadImage(path, dataUrl) {
  const imageRef = ref(storage, path);
  await uploadString(imageRef, dataUrl, 'data_url');
  return await getDownloadURL(imageRef);
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
