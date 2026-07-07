const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// KONFIGURASI PROVIDER
// ============================================================
// Untuk DEMO ini pakai API publik gratis (lfourr) sebagai proof-of-concept.
// Untuk PRODUCTION, ganti isi callProvider() dengan provider resmi:
// Api.co.id / Xendit Data Services / Duitku, dll.
// ============================================================

const DEMO_BASE_URL = 'https://api-rekening.lfourr.com';

async function callProvider({ type, bankCode, accountNumber }) {
  const endpoint = type === 'ewallet' ? '/getEwalletAccount' : '/getBankAccount';
  const { data } = await axios.get(`${DEMO_BASE_URL}${endpoint}`, {
    params: { bankCode, accountNumber },
    timeout: 10000,
  });
  return data;
}

// CATATAN: cache in-memory di bawah ini HANYA berguna selama function
// masih "warm" (belum cold start). Untuk production di Vercel, ganti
// dengan Redis (misal Upstash, ada free tier & native support Vercel).
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function getCacheKey(type, bankCode, accountNumber) {
  return `${type}:${bankCode}:${accountNumber}`;
}

app.post('/api/cek-rekening', async (req, res) => {
  const { bankCode, accountNumber, type } = req.body;

  if (!bankCode || !accountNumber) {
    return res.status(400).json({
      valid: false,
      message: 'bankCode dan accountNumber wajib diisi',
    });
  }

  const inquiryType = type === 'ewallet' ? 'ewallet' : 'bank';
  const cacheKey = getCacheKey(inquiryType, bankCode, accountNumber);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ ...cached.data, fromCache: true });
  }

  try {
    const providerResult = await callProvider({
      type: inquiryType,
      bankCode,
      accountNumber,
    });

    const normalized = {
      valid: Boolean(providerResult?.status === true || providerResult?.name),
      accountName: providerResult?.name || providerResult?.account_name || null,
      bankName: providerResult?.bank_name || providerResult?.bankName || bankCode,
      accountNumber,
      raw: providerResult,
    };

    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
    res.json(normalized);
  } catch (err) {
    res.status(502).json({
      valid: false,
      message: 'Gagal menghubungi provider validasi rekening',
      detail: err.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// PENTING: jangan pakai app.listen() di Vercel — cukup export app-nya,
// Vercel yang akan handle request lifecycle-nya.
module.exports = app;
