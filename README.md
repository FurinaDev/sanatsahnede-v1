# SanatSahnede — Kültür-Sanat Üretim ve İş Birliği Ekosistemi

**SanatSahnede** (`sanatsahnede.com`); bireysel sanatçıları, sanat topluluklarını, kültür kurumlarını, işletmeleri, sahne mekânlarını, teknik hizmet sağlayıcılarını ve kültür-sanat organizatörlerini uçtan uca bir araya getiren tam kapsamlı bir sahne pazaryeri ve üretim platformudur.

---

## Mimari Genel Bakış

- **Ön Yüz (Frontend):** React 19, Vite, TypeScript, Tailwind CSS v4, Lucide Icons, Motion (`motion/react`)
- **Arka Uç (Backend):** Node.js, Express (`server.ts`), modüler API yönlendiricileri (`server/modules/*`)
- **Veritabanı & Kalıcılık:** SQLite (`better-sqlite3`, WAL modu) — otomatik şema başlatma (`server/db/database.ts`) ve deterministik başlangıç verisi (`server/db/seed.ts`)
- **Kimlik Doğrulama & Yetkilendirme:** `scrypt` parola hashleme, `httpOnly` oturum çerezleri (`sessions` tablosu), çoklu rol desteği ve sunucu tarafında IDOR/RBAC doğrulaması
- **QR & Takvim Entegrasyonu:** Canlı PNG QR üretimi (`qrcode`) ve etkinlikler için standart `.ics` takvim çıktısı

### Temel Modüller

1. **Sanatçı & Topluluk Portfolyoları:** Bireysel sanatçılar ve topluluklar için profil düzenleme, e-posta ile topluluk üyesi davet/kabul akışı, Kariyer Pasaportu (doğrulanmış rezervasyon kayıtları ve manuel kayıtlar) ve Sanatçı Stüdyosu (EPK versiyonları + canlı QR).
2. **İlan, Başvuru, Teklif ve Güvence Akışı:** Doğrulanmış kurumlar için ilan oluşturma/düzenleme/kapatma, moderasyon kuyruğu, başvuru geri çekme, karşı teklif müzakeresi (geçerlilik süresi ve çift rezervasyon çakışma korumasıyla `409 Conflict`), dijital icra sözleşmesi, sandbox ödeme havuzu, çift taraflı hizmet tamamlama onayı, uyuşmazlık çözümü ve değerlendirme.
3. **Kültür Ekosistemi Modülleri:**
   - **Açık Sahne Ağı:** Mekân düzenleme, salon/sahne yönetimi, erişilebilirlik beyanları ve çakışma korumalı prova/sahne slotları.
   - **Proje Laboratuvarı:** Disiplinlerarası ekip kurma, proje rol başvuruları ve ortak hak paylaşım alanı.
   - **Prodüksiyon Masası:** Her rezervasyon ve proje için paylaşılan teknik rider, sahne zaman planı ve ses kontrolü çalışma alanı.
   - **Teknik Eşleşme:** Ses/ışık/sahne sağlayıcı profili, ekipman ve paket yönetimi, talep ve teklif onay/red akışı.
   - **Kültür Masası & Originals:** Kurumsal program yönetimi (`self_service` / `managed_service`), platform inisiyatifi destek başvuruları ve moderasyonlu etkinlik duyuruları.
4. **Yönetim & Denetim Merkezi (`AdminPanel`):** KYC/belge akreditasyon onayı/reddi, mekân ve teknik sağlayıcı doğrulama, ön moderasyon kuyruğu, uyuşmazlık çözümü, finansal defter (ledger), komisyon ayarları, özellik bayrakları (feature flags), kullanıcı rol/durum yönetimi, iletişim mesajları ve denetim kayıtları.

---

## Kurulum ve Çalıştırma

### 1. Ortam Değişkenleri

Örnek yapılandırmayı temel alarak `.env` dosyasını oluşturabilirsiniz (üretim dışı kullanımda dahili varsayılanlarla da çalışır):

```bash
cp .env.example .env
```

Başlıca değişkenler (`.env.example`):

- `PORT=3000`
- `SESSION_SECRET=...` (üretimde güçlü rastgele değer kullanın)
- `DATABASE_PATH=./data/sanatsahnede.db`
- `ENABLE_DEMO_QUICK_LOGIN=true` (üretim ortamında `false` yapın)
- `PAYMENT_MODE=sandbox` (`iyzico` anahtarları tanımlanana kadar sandbox modunda çalışır)
- `IYZICO_API_KEY`, `IYZICO_SECRET_KEY`, `IYZICO_BASE_URL`, `IYZICO_WEBHOOK_SECRET` (opsiyonel)
- `VITE_GOOGLE_MAPS_API_KEY` (opsiyonel; yoksa dahili Türkiye haritası görünümü kullanılır)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMS_PROVIDER_API_KEY` (opsiyonel; yoksa doğrulama kodları sandbox akışında çalışır)
- `KYC_PROVIDER_URL`, `KYC_PROVIDER_API_KEY` (opsiyonel harici kimlik doğrulama sağlayıcısı — e-Devlet şifresi kesinlikle istenmez)
- `GEMINI_API_KEY` (opsiyonel sunucu tarafı yapay zekâ taslak yardımcısı)

### 2. Bağımlılıkları Yükleme ve Geliştirme Sunucusu

```bash
npm install
npm run dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde başlar.

### 3. Test ve Derleme Komutları

```bash
# Tüm birim ve API entegrasyon testleri
npx --yes tsx --test src/utils/businessLogic.test.ts src/utils/platformStats.test.ts server/tests/api.test.ts

# TypeScript / ESLint denetimi ve üretim derlemesi
npm run lint
npm run build
```

---

## Demo Hesapları

Tüm seed demo hesaplarının ortak parolası **`DemoSanat123!`** şeklindedir:

| Rol | E-posta |
| :--- | :--- |
| İşletme / Otel Yöneticisi | `etkinlik@grandbosphorus.com` |
| Bireysel Sanatçı (Piyanist) | `efeozkaniletisim@gmail.com` |
| Topluluk Lideri (String Trio) | `selin@istanbulstringtrio.com` |
| Mekân Yöneticisi | `sahne@kadikoyakustik.com` |
| Teknik Sağlayıcı | `teknik@sesvesahne.com` |
| Kültür Organizatörü | `festival@istanbuloda.org` |
| İzleyici | `izleyici@sanatsever.com` |
| Moderatör | `moderator@sanatsahnede.com` |
| Platform Yöneticisi (Admin) | `admin@sahnesanat.com` |

---

## Harici Entegrasyon ve Sandbox Notları

- **Ödeme (`iyzico`):** `IYZICO_API_KEY` / `IYZICO_SECRET_KEY` tanımlı değilken ödeme işlemleri `iyzico_sandbox` adaptörü üzerinden gerçek veritabanı defter kayıtları (`financial_ledger`) ile simüle edilir; gerçek kart tahsilatı yapılmaz.
- **E-posta & SMS Doğrulama:** `SMTP_*` veya `SMS_PROVIDER_API_KEY` tanımlanmadığında doğrulama akışı sandbox moduyla test edilebilir.
- **Kimlik Doğrulama (KYC):** Platform hiçbir senaryoda e-Devlet kullanıcı şifresi talep etmez; harici KYC URL/anahtarı sağlanmadığında belge inceleme ve yönetici akreditasyon kuyruğu üzerinden ilerler.
- **Harita & Yapay Zekâ Taslakları:** `VITE_GOOGLE_MAPS_API_KEY` yoksa yerleşik şehir haritası bileşeni kullanılır; `GEMINI_API_KEY` yoksa taslak yardımcıları şeffaf biçimde şablon tabanlı öneri üretir.
