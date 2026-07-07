# API Cek Nama Rekening & E-Wallet (Demo)

Demo proof-of-concept untuk sistem validasi rekening bank/e-wallet Indonesia.
Input: kode bank/e-wallet + nomor rekening → Output: nama pemilik, nama bank, status valid/tidak.

## Cara Jalankan

```bash
npm install
node server.js
```

Buka `http://localhost:3000` untuk UI tester, atau hit langsung endpoint API-nya.

## Endpoint

**POST** `/api/cek-rekening`

```json
{
  "type": "bank",
  "bankCode": "bca",
  "accountNumber": "1234567890"
}
```

Response:
```json
{
  "valid": true,
  "accountName": "JOHN DOE",
  "bankName": "BCA",
  "accountNumber": "1234567890"
}
```

## Catatan Penting (untuk klien)

Demo ini menggunakan provider publik untuk keperluan proof-of-concept. Untuk versi
production dengan volume 3000 hit/hari, backend akan diarahkan ke provider resmi
(Api.co.id / Xendit Data Services / Duitku) yang:
- Mendukung 130+ bank secara resmi & reliable
- Punya SLA uptime
- Legal & sesuai regulasi data nasabah (OJK/BI)

Struktur endpoint dan response **tidak berubah** — hanya bagian `callProvider()`
di `server.js` yang diganti sesuai provider yang dipilih klien.

## Fitur yang sudah diimplementasikan

- ✅ Endpoint REST untuk cek rekening bank & e-wallet
- ✅ Caching in-memory 24 jam (mengurangi biaya per-hit ke provider)
- ✅ Response normalisasi (format konsisten apapun providernya)
- ✅ UI tester untuk non-technical reviewer
- ✅ Siap untuk rate limiting & auth API key (tinggal ditambahkan sesuai kebutuhan client)

## Rencana untuk Production (3000 hit/hari)

- Rate limiting per API key
- Redis untuk caching (bukan in-memory)
- Logging request untuk audit & billing
- Retry & circuit breaker saat provider timeout
- Monitoring uptime (misal UptimeRobot)
