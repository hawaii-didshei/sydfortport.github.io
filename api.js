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
  serverTimestamp,
  Timestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const db = getFirestore(app);

export async function createRoomRecord(roomCode, mode, judgeId) {
  const col = collection(db, 'rooms');
  await addDoc(col, {
    room_code: roomCode,
    mode: mode,
    status: 'waiting',
    judge_id: judgeId,
    deleteAt: null,
    createdAt: serverTimestamp()
  });
}

export async function findRoom(roomCode) {
  const col = collection(db, 'rooms');
  const q = query(col, where('room_code', '==', roomCode));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function finishRoom(recordId) {
  const roomRef = doc(db, 'rooms', recordId);
  const deleteAt = Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000));
  await updateDoc(roomRef, {
    status: 'finished',
    deleteAt: deleteAt
  });
}

export async function addPlayerRecord(roomCode, nickname, avatarUrl, role) {
  const col = collection(db, 'players');
  await addDoc(col, {
    room_code: roomCode,
    nickname: nickname,
    avatar_url: avatarUrl,
    role: role,
    joinedAt: serverTimestamp()
  });
}

export async function getPlayers(roomCode) {
  const col = collection(db, 'players');
  const q = query(col, where('room_code', '==', roomCode));
  const snap = await getDocs(q);
  return snap.docs.map(function(d) {
    return { id: d.id, ...d.data() };
  });
}

export async function addEvidenceRecord(roomCode, authorId, title, imageUrl) {
  const col = collection(db, 'evidence');
  await addDoc(col, {
    room_code: roomCode,
    author_id: authorId,
    title: title,
    image_url: imageUrl,
    createdAt: serverTimestamp()
  });
}

export async function getEvidence(roomCode) {
  const col = collection(db, 'evidence');
  const q = query(col, where('room_code', '==', roomCode));
  const snap = await getDocs(q);
  return snap.docs.map(function(d) {
    return { id: d.id, ...d.data() };
  });
}

export async function sendMessageRecord(roomCode, playerId, nickname, text) {
  const col = collection(db, 'messages');
  await addDoc(col, {
    room_code: roomCode,
    player_id: playerId,
    nickname: nickname,
    text: text,
    createdAt: serverTimestamp()
  });
}

export async function getMessages(roomCode) {
  const col = collection(db, 'messages');
  const q = query(col, where('room_code', '==', roomCode));
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
