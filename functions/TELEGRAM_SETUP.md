# Telegram bot / obuna sozlamalari

Token endi kodda saqlanmaydi. Deploydan **oldin** quyidagilar bajarilishi shart.

## 1. Eski tokenni bekor qiling

Eski token `functions/telegramBot.js` ichida ochiq yozilgan va git tarixida qolgan —
u oshkor bo'lgan hisoblanadi. BotFather'da `/revoke` qilib yangi token oling.

## 2. Konfiguratsiyani o'rnating

Google `functions:config` (runtime config) ni to'xtatdi — firebase-tools 15 da u
mavjud emas. O'rniga `functions/.env` fayli ishlatiladi (CLI uni deploy paytida
funksiya muhit o'zgaruvchilariga aylantiradi):

```
TELEGRAM_TOKEN=<BOTFATHER_TOKEN>
TELEGRAM_ADMIN_CHAT_ID=66049218
TELEGRAM_WEBHOOK_SECRET=<random hex>
```

⚠️ `functions/.env` git'ga tushmaydi (root `.gitignore` dagi `.env` qoidasi).
Yangi muhitga o'tganda uni qo'lda yaratish kerak.

Kuchliroq variant (ixtiyoriy): `firebase functions:secrets:set TELEGRAM_TOKEN`
va eksportlarga `.runWith({ secrets: ["TELEGRAM_TOKEN"] })` qo'shish — token
Secret Manager'da saqlanadi, deploy artefaktida emas.

## 3. Webhook'ni secret bilan qayta o'rnating

`webhook_secret` o'rnatilgan bo'lsa, funksiya `X-Telegram-Bot-Api-Secret-Token`
sarlavhasini tekshiradi va boshqa manbadan kelgan so'rovlarni rad etadi:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://<REGION>-<PROJECT>.cloudfunctions.net/telegramWebhook" \
  -d "secret_token=<WEBHOOK_SECRET>"
```

## 4. Admin chat ID

`/admin_info` buyrug'i endi **hech narsani o'zgartirmaydi** — u faqat chat ID ni
ko'rsatadi. Ilgari kim birinchi bo'lib shu buyruqni yozsa, barcha to'lov cheklari
va tasdiqlash tugmalari o'shanga o'tib ketardi.

Adminni almashtirish: `firebase functions:config:set telegram.admin_chat_id="<ID>"`
va qayta deploy.

## Deploy qilinadigan yangi funksiya

`expireSubscriptions` — har kuni 00:10 (Asia/Tashkent) da muddati o'tgan
obunalarni `public` tarifga tushiradi. Buning uchun loyihada
**Blaze** rejasi va Cloud Scheduler yoqilgan bo'lishi kerak.

```bash
firebase deploy --only functions,firestore:rules
```

## Muhim: rules bilan birga deploy qiling

`firestore.rules` endi `accountType`, `isPro`, `subscriptionEnd`, `mockTests`,
`assignedTests`, `role`, `groupId`, `teacherSubscription` maydonlarini klient
yozuvidan bloklaydi. Bu maydonlarni faqat Admin SDK (bot / Cloud Functions) yoki
admin foydalanuvchi o'zgartira oladi.
