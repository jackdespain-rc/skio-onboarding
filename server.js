const express = require('express');
const admin   = require('firebase-admin');
const path    = require('path');
require('dotenv').config();

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname)); // serves index.html and any other static files

// ── Firebase Admin init ──────────────────────────────────────────────────────
// Store the full service-account JSON as the env var FIREBASE_SERVICE_ACCOUNT
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();
const REPS = db.collection('reps');

// ── Routes ───────────────────────────────────────────────────────────────────

// Serve the app
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// GET progress for one rep
app.get('/api/progress/:email', async (req, res) => {
  try {
    const doc = await REPS.doc(req.params.email).get();
    res.json({ progress: doc.exists ? (doc.data().progress || null) : null });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST (save/merge) progress for one rep
app.post('/api/progress/:email', async (req, res) => {
  try {
    const { progress, name } = req.body;
    await REPS.doc(req.params.email).set(
      { progress, name: name || req.params.email, lastActive: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET grades for one rep
app.get('/api/grades/:email', async (req, res) => {
  try {
    const doc = await REPS.doc(req.params.email).get();
    res.json({ grades: doc.exists ? (doc.data().grades || {}) : {} });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST (save) grades for one rep
app.post('/api/grades/:email', async (req, res) => {
  try {
    const { grades } = req.body;
    await REPS.doc(req.params.email).set({ grades }, { merge: true });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET all reps — manager dashboard
app.get('/api/reps', async (req, res) => {
  try {
    const snap = await REPS.orderBy('lastActive', 'desc').get();
    const reps = [];
    snap.forEach(doc => reps.push({ email: doc.id, ...doc.data() }));
    res.json({ reps });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅  Skio Training running → http://localhost:${PORT}`));
