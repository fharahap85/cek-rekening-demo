const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// KONFIGURASI PROVIDER
// ============================================================
// Menggunakan Api.co.id (Indonesia Bank Validation API) — provider resmi,
// aktif, dan reliable. Daftar gratis di api.co.id untuk dapat API key.
// Set API key di Vercel: Project > Settings > Environment Variables
// dengan nama API_CO_ID_KEY.
//
// CATATAN: cek dokumentasi resmi di dashboard api.co.id untuk base URL
// yang berlaku saat ini (bisa berubah), dan sesuaikan endpoint di bawah
// kalau perlu.
// ============================================================

const API_CO_ID_BASE_URL = process.env.API_CO_ID_BASE_URL || 'https://use.api.co.id/validation';
const API_CO_ID_KEY = process.env.API_CO_ID_KEY;

async function callProvider({ bankCode, accountNumber, accountName }) {
  const { data } = await axios.get(`${API_CO_ID_BASE_URL}/validation/bank`, {
    params: {
      bank_code: bankCode,
      account_number: accountNumber,
      account_name: accountName || '',
    },
    headers: { 'x-api-co-id': API_CO_ID_KEY },
    timeout: 10000,
  });
  return data;
}

// CATATAN: cache in-memory di bawah ini HANYA berguna selama function
// masih "warm" (belum cold start). Untuk production, ganti dengan Redis
// (misal Upstash, ada free tier & native support Vercel).
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24;

function getCacheKey(bankCode, accountNumber) {
  return `${bankCode}:${accountNumber}`;
}

app.post('/api/cek-rekening', async (req, res) => {
  const { bankCode, accountNumber, accountName } = req.body;

  if (!bankCode || !accountNumber) {
    return res.status(400).json({
      valid: false,
      message: 'bankCode dan accountNumber wajib diisi',
    });
  }

  if (!API_CO_ID_KEY) {
    return res.status(500).json({
      valid: false,
      message: 'API_CO_ID_KEY belum di-set di environment variables Vercel',
    });
  }

  const cacheKey = getCacheKey(bankCode, accountNumber);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json({ ...cached.data, fromCache: true });
  }

  try {
    const providerResult = await callProvider({ bankCode, accountNumber, accountName });

    const normalized = {
      valid: Boolean(providerResult?.data?.is_valid),
      accountName: providerResult?.data?.name || null,
      bankName: bankCode,
      accountNumber,
      note: providerResult?.data?.note || null,
      raw: providerResult,
    };

    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
    res.json(normalized);
  } catch (err) {
    res.status(502).json({
      valid: false,
      message: 'Gagal menghubungi provider validasi rekening',
      detail: err.response?.data || err.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), providerConfigured: Boolean(API_CO_ID_KEY) });
});

module.exports = app;
