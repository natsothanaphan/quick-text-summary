require('dotenv').config({ path: ['.env', '.env.default'] });
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const { setGlobalOptions } = require('firebase-functions/v2');
const { onRequest } = require('firebase-functions/v2/https');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('firebase-functions/logger');
const express = require('express');

setGlobalOptions({ region: 'asia-southeast1' });
initializeApp();
const db = getFirestore();

const app = express();
app.use(express.json());
app.use(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(idToken);
    req.uid = decodedToken.uid;
    next();
  } catch (err) {
    logger.error('Authentication error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-2.0-pro-exp-02-05',
  systemInstruction:
    'Summarize text provided by user.\n\n' +
    'Follow the procedure:\n' +
    '1-thinkingTrace: Think about main points.\n' +
    '2-mainPoints: List main points.\n' +
    '3-summaries: Summarize.\n' +
    '  3.1-mainPoint: Reiterate each main point.\n' +
    '  3.2-thinkingTraces: Reason about this main point.\n' +
    '  3.3-synthesis: Synthesize information on this main point.',
});
const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: 'application/json',
  responseSchema: { type: 'object', properties: {
    '1-thinkingTrace': { type: 'string' },
    '2-mainPoints': { type: 'array', items: { type: 'string' } },
    '3-summaries': { type: 'array', items: { type: 'object', properties: {
      '3.1-mainPoint': { type: 'string' },
      '3.2-thinkingTraces': { type: 'array', items: { type: 'string' } },
      '3.3-synthesis': { type: 'string' },
    }, required: [ '3.1-mainPoint', '3.2-thinkingTraces', '3.3-synthesis' ] } },
  }, required: [ '1-thinkingTrace', '2-mainPoints', '3-summaries' ] },
};

const createTimeFields = () => ({ createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
const updateTimeFields = () => ({ updatedAt: FieldValue.serverTimestamp() });
const docToData = (doc) => {
  const data = doc.data();
  return { id: doc.id, ...data, createdAt: data.createdAt.toDate(), updatedAt: data.updatedAt.toDate() };
};

const getRequestsColl = (uid) => db.collection('users').doc(uid).collection('requests');

const createFirestore = async (uid, text) => {
  const doc = { text, ...createTimeFields() };
  const docRef = await getRequestsColl(uid).add(doc);
  logger.info(`Create Firestore: ${docRef.id}`);
  return docRef.id;
};
const updateFirestore = async (uid, docId, result) => {
  const docRef = getRequestsColl(uid).doc(docId);
  await docRef.update({ result, ...updateTimeFields() });
  logger.info(`Update Firestore: ${docRef.id}`);
};

const generateResult = async (text) => {
  const rawResult = await model.generateContent({ generationConfig, contents: [{ role: 'user',  parts: [{ text }] }] });
  const result = JSON.parse(await rawResult.response.text());
  logger.info('Generate result', result);
  return result;
};

app.post('/api/summarize', async (req, res) => {
  try {
    const uid = req.uid;
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: 'text is required' });
    if (text.length > 500000) return res.status(400).json({ error: 'text is too long, max 500,000 characters' });
    const createFirestoreTask = createFirestore(uid, text);
    const result = await generateResult(text);
    const docId = await createFirestoreTask;
    await updateFirestore(uid, docId, result);
    res.status(200).json(result);
  } catch (err) {
    logger.error('Error post /api/summarize', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const uid = req.uid;
    const { day, timezone } = req.query;
    if (!day) return res.status(400).json({ error: 'day is required' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return res.status(400).json({ error: 'day format must be yyyy-mm-dd.' });
    const date = new Date(day); if (isNaN(date)) return res.status(400).json({ error: 'day is invalid' });
    if (!timezone) return res.status(400).json({ error: 'timezone is required' });
    const offset = parseInt(timezone, 10); if (isNaN(offset)) return res.status(400).json({ error: 'timezone is invalid' });
    const start = new Date(date); start.setMinutes(start.getMinutes() - offset);
    const end = new Date(start); end.setDate(end.getDate() + 1);
    logger.info(`start: ${start.toISOString()}, end: ${end.toISOString()}`);
    
    const snapshot = await getRequestsColl(uid).select('createdAt', 'updatedAt')
      .where('createdAt', '>=', start).where('createdAt', '<', end).orderBy('createdAt', 'desc').get();
    const data = snapshot.docs.map(docToData);
    res.status(200).json(data);
  } catch (err) {
    logger.error('Error get /api/history', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/history/:docId', async (req, res) => {
  try {
    const uid = req.uid;
    const { docId } = req.params;
    const doc = await getRequestsColl(uid).doc(docId).get();
    if (!doc.exists) return res.status(404).json({ error: 'History not found' });
    res.status(200).json(docToData(doc));
  } catch (err) {
    logger.error('Error get /api/history/:docId', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

exports.app = onRequest(app);
