import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  runTransaction,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

// ── Firebase config ──────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyB1rFfw8FI9W0TKmJJICCwfy32JdKchEOI",
  authDomain: "sukhbaatar2026-2fc3c.firebaseapp.com",
  projectId: "sukhbaatar2026-2fc3c",
  storageBucket: "sukhbaatar2026-2fc3c.firebasestorage.app",
  messagingSenderId: "706952348934",
  appId: "1:706952348934:web:e9e6fb8ac481311d330a87",
  measurementId: "G-HWBXVS1EL3",
};

// Total number of bib numbers available (shared pool across ALL age groups)
export const MAX_HORSE_NUMBER = 500;
// Each age group has its own separate "Морь тавиач" (handler) number pool, 1..25 —
// matching the pre-printed, per-age color-coded vests.
export const MAX_TAVIACH_PER_AGE = 25;

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

// ── Collection refs ──────────────────────────────────────────────────────────
const usersCol  = collection(db, "users");
const horsesCol = collection(db, "horses");
const seqRef        = doc(db, "meta", "sequences");         // { nextHorse, reservedNumbers }
const taviachSeqRef = doc(db, "meta", "taviach_sequences"); // { byAge: { [ageGroupId]: { next, reservedNumbers } } }
const settingsRef   = doc(db, "meta", "settings");          // { regDeadline, blockedHorseNumbers }

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Atomically grab the next horse number (1..MAX_HORSE_NUMBER) — first come, first served,
 * shared across all age groups. Numbers released by admin deletion are reissued before
 * handing out a brand-new one. Numbers the admin has set aside (blockedHorseNumbers) are
 * always skipped and never handed to anyone.
 */
async function getNextHorseNumber() {
  const blockedSnap = await getDoc(settingsRef);
  const blocked = new Set(blockedSnap.exists() ? (blockedSnap.data().blockedHorseNumbers || []) : []);

  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(seqRef);
    const data = snap.exists() ? snap.data() : { nextHorse: 1, reservedNumbers: [] };
    const reserved = (data.reservedNumbers || []).filter(n => typeof n === 'number' && !blocked.has(n));

    if (reserved.length > 0) {
      const sorted = [...reserved].sort((a, b) => a - b);
      const num = sorted[0];
      const remaining = (data.reservedNumbers || []).filter(n => n !== num);
      tx.set(seqRef, { ...data, reservedNumbers: remaining }, { merge: true });
      return num;
    }

    let next = data.nextHorse || 1;
    while (blocked.has(next)) next++;
    if (next > MAX_HORSE_NUMBER) throw new Error("Бүх дугаар дууссан байна! (1–" + MAX_HORSE_NUMBER + ")");
    tx.set(seqRef, { ...data, nextHorse: next + 1 }, { merge: true });
    return next;
  });
}

/** Get the list of horse numbers the admin has set aside — never auto-assigned to anyone. */
export async function getBlockedHorseNumbers() {
  const snap = await getDoc(settingsRef);
  return snap.exists() ? (snap.data().blockedHorseNumbers || []) : [];
}

/** Set the full list of horse numbers to set aside (replaces the previous list). */
export async function setBlockedHorseNumbers(numbers) {
  await setDoc(settingsRef, { blockedHorseNumbers: numbers }, { merge: true });
}

/** Release a horse number back into the pool for reissue (only call once nothing else uses it). */
async function releaseHorseNumber(num) {
  if (!num) return;
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(seqRef);
    const data = snap.exists() ? snap.data() : { nextHorse: 1, reservedNumbers: [] };
    const reserved = data.reservedNumbers || [];
    if (!reserved.includes(num)) {
      tx.set(seqRef, { ...data, reservedNumbers: [...reserved, num] }, { merge: true });
    }
  });
}

/**
 * Atomically grab the next "Морь тавиач" (handler) number for a SPECIFIC age
 * group. Each age group has its own separate 1..MAX_TAVIACH_PER_AGE pool
 * (matching the pre-printed, per-age color-coded vests) — a number from one
 * age group's pool can never be reused for another age group.
 */
async function getNextTaviachNumber(ageGroupId) {
  const key = String(ageGroupId);
  return await runTransaction(db, async (tx) => {
    const snap = await tx.get(taviachSeqRef);
    const data = snap.exists() ? snap.data() : {};
    const byAge = data.byAge || {};
    const bucket = byAge[key] || { next: 1, reservedNumbers: [] };
    const reserved = (bucket.reservedNumbers || []).filter(n => typeof n === 'number');

    let num;
    let newBucket;
    if (reserved.length > 0) {
      const sorted = [...reserved].sort((a, b) => a - b);
      num = sorted[0];
      newBucket = { ...bucket, reservedNumbers: sorted.slice(1) };
    } else {
      const next = bucket.next || 1;
      if (next > MAX_TAVIACH_PER_AGE) throw new Error("Энэ насны ангилалд тавиачийн дугаар дууссан байна! (1–" + MAX_TAVIACH_PER_AGE + ")");
      num = next;
      newBucket = { ...bucket, next: next + 1 };
    }
    tx.set(taviachSeqRef, { byAge: { ...byAge, [key]: newBucket } }, { merge: true });
    return num;
  });
}

export { getNextTaviachNumber };

/** Release a previously-assigned (but not yet used) taviach number back into that age group's pool. */
export async function releaseTaviachNumber(ageGroupId, num) {
  if (!num) return;
  const key = String(ageGroupId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(taviachSeqRef);
    const data = snap.exists() ? snap.data() : {};
    const byAge = data.byAge || {};
    const bucket = byAge[key] || { next: 1, reservedNumbers: [] };
    const reserved = bucket.reservedNumbers || [];
    if (!reserved.includes(num)) {
      const newBucket = { ...bucket, reservedNumbers: [...reserved, num] };
      tx.set(taviachSeqRef, { byAge: { ...byAge, [key]: newBucket } }, { merge: true });
    }
  });
}

/**
 * How many taviach numbers are currently issued (active, not released) per age
 * group — used by the UI to show "X/25" and disable the option once an age
 * group's pool is exhausted.
 */
export async function getTaviachIssuedCounts() {
  const snap = await getDoc(taviachSeqRef);
  const byAge = snap.exists() ? (snap.data().byAge || {}) : {};
  const counts = {};
  Object.keys(byAge).forEach(key => {
    const bucket = byAge[key];
    const issued = (bucket.next || 1) - 1 - (bucket.reservedNumbers || []).length;
    counts[key] = Math.max(0, issued);
  });
  return counts;
}

/**
 * Repair tool: rebuild every age group's taviach counter directly from the
 * taviach numbers actually attached to real horse documents, clearing any
 * drift caused by an abandoned session (someone tapped "Тийм", claiming a
 * number, then closed the tab before finishing registration — that number
 * is never releasable automatically, so it can appear "skipped").
 * Returns the number of age groups touched.
 */
export async function reconcileTaviachSequence() {
  const snap = await getDocs(horsesCol);
  const maxByAge = {};
  snap.docs.forEach(d => {
    const h = d.data();
    if (h.taviachNum && h.ageGroupId != null) {
      const key = String(h.ageGroupId);
      maxByAge[key] = Math.max(maxByAge[key] || 0, h.taviachNum);
    }
  });
  const byAge = {};
  Object.keys(maxByAge).forEach(key => {
    byAge[key] = { next: maxByAge[key] + 1, reservedNumbers: [] };
  });
  await setDoc(taviachSeqRef, { byAge }, { merge: false });
  return Object.keys(byAge).length;
}

// ── USER ─────────────────────────────────────────────────────────────────────

/**
 * Find existing user by phone or create new one.
 * Returns user object with Firestore id.
 */
export async function loginOrCreateUser({ surname, givenName, phone }) {
  const q = query(usersCol, where("phone", "==", phone));
  const snap = await getDocs(q);
  if (!snap.empty) {
    const d = snap.docs[0];
    return { id: d.id, ...d.data() };
  }
  const ref = await addDoc(usersCol, {
    surname,
    givenName,
    name: `${surname} ${givenName}`,
    phone,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id, surname, givenName, name: `${surname} ${givenName}`, phone };
}

// ── HORSES ───────────────────────────────────────────────────────────────────

/**
 * Register a horse. Number is assigned instantly (no waiting) — payment is a
 * separate step handled afterward; `paid` starts false and is flipped true by
 * an admin once they've confirmed the bank transfer.
 *
 * Numbering logic: a rider keeps ONE number and reuses it across DIFFERENT age
 * groups. Only when they enter another horse in the SAME age group they already
 * hold a number in do they get a new, distinct number (first-come-first-served
 * from the shared 1–MAX_HORSE_NUMBER pool — same as the Nalaikh app).
 *
 * `myExistingHorses` should be this rider's already-registered horses (fetched
 * beforehand), used to decide whether to reuse a number or mint a new one.
 */
export async function registerHorse(userId, phone, ageGroupId, ageGroupName, formData, myExistingHorses = []) {
  const usedInThisAgeGroup = myExistingHorses.filter(h => h.ageGroupId === ageGroupId).map(h => h.number);
  const ownedNumbers = [...new Set(myExistingHorses.map(h => h.number).filter(Boolean))];
  const reusable = ownedNumbers.filter(n => !usedInThisAgeGroup.includes(n));

  const number = reusable.length > 0 ? Math.min(...reusable) : await getNextHorseNumber();

  // If a taviach number was already assigned when the user picked "Тийм" in the form,
  // reuse it as-is. Otherwise (fallback), assign one now.
  let taviachNum = formData.taviachNum || 0;
  if (formData.taviachRequested && !taviachNum) {
    taviachNum = await getNextTaviachNumber(ageGroupId);
  }

  const horse = {
    ...formData,
    number,
    taviachNum,
    ageGroupId,
    ageGroupName,
    userId,
    ownerPhone: phone,
    confirmed: true,
    paid: false,
    createdAt: serverTimestamp(),
  };
  delete horse.taviachRequested;

  const ref = await addDoc(horsesCol, horse);
  return { id: ref.id, ...horse };
}

/** Mark a single horse's payment as confirmed (or unconfirmed) — admin action. */
export async function setHorsePaid(horseId, paid = true) {
  await updateDoc(doc(db, "horses", horseId), { paid });
}

/** Mark several horses' payment as confirmed (or unconfirmed) at once — admin bulk action. */
export async function setHorsesPaid(horseIds, paid = true) {
  await Promise.all(horseIds.map(id => updateDoc(doc(db, "horses", id), { paid })));
}

/**
 * Get all horses for a user.
 */
export async function getMyHorses(phone) {
  const q = query(horsesCol, where("ownerPhone", "==", phone));
  const snap = await getDocs(q);
  const horses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return horses.sort((a,b)=>{
    const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return ta - tb;
  });
}

// ── EXPLAINER ────────────────────────────────────────────────────────────────

/**
 * Get all confirmed horses (for explainer / public results).
 * Optionally filter by ageGroupId or search string.
 */
export async function getConfirmedHorses({ ageGroupId = null, search = "" } = {}) {
  const snap = await getDocs(horsesCol);
  let horses = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b)=>(a.number||0)-(b.number||0));

  if (ageGroupId) horses = horses.filter(h => h.ageGroupId === ageGroupId);

  if (search.trim()) {
    const s = search.toLowerCase();
    horses = horses.filter(h =>
      String(h.number).includes(s) ||
      (h.horseName  || "").toLowerCase().includes(s) ||
      (h.uyaachName || "").toLowerCase().includes(s) ||
      (h.riderName  || "").toLowerCase().includes(s) ||
      (h.ownerName  || "").toLowerCase().includes(s)
    );
  }
  return horses;
}

// ── ADMIN ────────────────────────────────────────────────────────────────────

/** Get ALL horses (admin only). */
export async function getAllHorses() {
  const snap = await getDocs(horsesCol);
  const horses = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  return horses.sort((a,b)=>(a.number||0)-(b.number||0));
}

/**
 * Delete a horse registration. Releases its number back into the pool for reissue —
 * but only if no other horse (e.g. the same rider's entry in a different age group)
 * still uses that same number.
 */
export async function deleteHorse(h) {
  await deleteDoc(doc(db, "horses", h.fbId || h.id));
  try {
    if (h.number) {
      const q = query(horsesCol, where("number", "==", h.number));
      const snap = await getDocs(q);
      if (snap.empty) {
        await releaseHorseNumber(h.number);
      }
    }
    if (h.taviachNum) {
      await releaseTaviachNumber(h.ageGroupId, h.taviachNum);
    }
  } catch (e) { console.error("Release number error:", e); }
}

/** Get admin stats. */
export async function getAdminStats() {
  const all = await getAllHorses();
  const byAge = {};
  all.forEach(h => {
    if (!byAge[h.ageGroupName]) byAge[h.ageGroupName] = 0;
    byAge[h.ageGroupName]++;
  });
  const distinctNumbers = new Set(all.map(h => h.number)).size;
  const unpaidCount = all.filter(h => !h.paid).length;
  return {
    total: all.length,
    remaining: Math.max(0, MAX_HORSE_NUMBER - distinctNumbers),
    unpaidCount,
    byAge,
  };
}

// ── REGISTRATION DEADLINE ───────────────────────────────────────────────────

export async function saveDeadline(isoString) {
  await setDoc(settingsRef, { regDeadline: isoString }, { merge: true });
}

export async function getDeadline() {
  const snap = await getDoc(settingsRef);
  return snap.exists() ? snap.data().regDeadline || null : null;
}

export async function clearDeadline() {
  await updateDoc(settingsRef, { regDeadline: null });
}

/**
 * Per-age-group deadlines — lets the admin close registration for specific age
 * groups (e.g. "Шүдлэн" fills up faster than others) while the rest stay open,
 * independent of the global deadline above.
 */
export async function saveAgeGroupDeadline(ageGroupId, isoString) {
  const snap = await getDoc(settingsRef);
  const current = snap.exists() ? (snap.data().ageGroupDeadlines || {}) : {};
  await setDoc(settingsRef, { ageGroupDeadlines: { ...current, [String(ageGroupId)]: isoString } }, { merge: true });
}

export async function clearAgeGroupDeadline(ageGroupId) {
  const snap = await getDoc(settingsRef);
  const current = snap.exists() ? (snap.data().ageGroupDeadlines || {}) : {};
  const next = { ...current };
  delete next[String(ageGroupId)];
  await setDoc(settingsRef, { ageGroupDeadlines: next }, { merge: true });
}

export async function getAgeGroupDeadlines() {
  const snap = await getDoc(settingsRef);
  return snap.exists() ? (snap.data().ageGroupDeadlines || {}) : {};
}
