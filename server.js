const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;

// ============================================================
// KONFIGURASI PROVIDER
// ============================================================
// Untuk DEMO ini pakai API publik gratis (lfourr) sebagai proof-of-concept.
// Untuk PRODUCTION (client asli), ganti dengan provider resmi:
// - Api.co.id (berbayar per-hit / subscription unlimited)
// - Xendit Data Services
// - Duitku Disbursement Inquiry
// Cukup ganti isi function callProvider() di bawah ini, struktur
// endpoint & response ke frontend tidak perlu berubah.
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

// Cache sederhana in-memory (di production ganti Redis, TTL 24 jam)
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 jam

function getCacheKey(type, bankCode, accountNumber) {
  return `${type}:${bankCode}:${accountNumber}`;
}

// ============================================================
// ENDPOINT UTAMA
// ============================================================
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

    // Normalisasi response supaya format output konsisten
    // apapun provider yang dipakai di belakang layar
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

app.listen(PORT, () => {
  console.log(`Server jalan di http://localhost:${PORT}`);
});
