const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// MODE: MOCK / SIMULASI (untuk keperluan demo proposal)
// ============================================================
// Server ini TIDAK memanggil API pihak ketiga mana pun — semua data
// di bawah ini adalah data simulasi yang di-hardcode, supaya demo bisa
// jalan 100% gratis dan nggak gantung ke provider luar (yang beberapa
// kali kita coba ternyata mati / berbayar / butuh approval manual).
//
// UNTUK PRODUCTION: ganti isi function lookupAccount() di bawah dengan
// pemanggilan API provider resmi (Api.co.id / Xendit Data Services /
// Duitku, dll). Struktur endpoint & response ke frontend TIDAK perlu
// berubah — cukup ganti bagian ini.
// ============================================================

const MOCK_DB = {
  // ---- Bank ----
  'bca:1234567890': { name: 'BUDI SANTOSO', bankName: 'BCA' },
  'bri:0123456789': { name: 'SITI RAHAYU', bankName: 'BRI' },
  'mandiri:1370012345678': { name: 'AHMAD FAUZI', bankName: 'Mandiri' },
  'bni:0009876543': { name: 'DEWI LESTARI', bankName: 'BNI' },
  'bsi:7001234567': { name: 'MUHAMMAD IQBAL', bankName: 'BSI' },
  // ---- E-Wallet ----
  'gopay:081234567890': { name: 'RIZKY PRATAMA', bankName: 'GoPay' },
  'dana:081298765432': { name: 'MAYA INDAH SARI', bankName: 'DANA' },
  'ovo:081211112222': { name: 'ANDI WIJAYA', bankName: 'OVO' },
};

// Daftar contoh yang ditampilkan di UI supaya reviewer gampang coba
const SAMPLE_ACCOUNTS = Object.entries(MOCK_DB).map(([key, val]) => {
  const [bankCode, accountNumber] = key.split(':');
  return { bankCode, accountNumber, bankName: val.bankName, type: ['gopay', 'dana', 'ovo'].includes(bankCode) ? 'ewallet' : 'bank' };
});

function lookupAccount(bankCode, accountNumber) {
  const key = `${bankCode.toLowerCase()}:${accountNumber}`;
  const found = MOCK_DB[key];
  if (found) {
    return {
      valid: true,
      accountName: found.name,
      bankName: found.bankName,
      accountNumber,
    };
  }
  return {
    valid: false,
    accountName: null,
    bankName: bankCode,
    accountNumber,
    message: 'Rekening tidak ditemukan / tidak valid (data simulasi demo)',
  };
}

app.post('/api/cek-rekening', (req, res) => {
  const { bankCode, accountNumber } = req.body;

  if (!bankCode || !accountNumber) {
    return res.status(400).json({
      valid: false,
      message: 'bankCode dan accountNumber wajib diisi',
    });
  }

  const result = lookupAccount(bankCode, accountNumber);
  res.json({ ...result, mode: 'demo-simulasi' });
});

app.get('/api/sample-accounts', (req, res) => {
  res.json({ samples: SAMPLE_ACCOUNTS });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString(), mode: 'demo-simulasi' });
});

module.exports = app;
