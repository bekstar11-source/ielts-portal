// src/components/admin/keys/keyUtils.js
//
// Access-key boshqaruvining sof (UI'siz) mantiqi: kod generatsiyasi, sana
// normalizatsiyasi, clipboard, CSV va chop etish.

import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

export const KEY_LENGTH = 6;
// Chalkashadigan belgilar (0/O, 1/I) ataylab yo'q — kalit og'zaki ham aytiladi.
export const KEY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const MAX_BULK = 50;

/* --------------------------------- Sana --------------------------------- */

/** createdAt maydoni ISO satr, Date yoki Firestore Timestamp bo'lishi mumkin. */
export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "object") {
    if (typeof value.toDate === "function") {
      try {
        return value.toDate();
      } catch {
        return null;
      }
    }
    if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const formatDate = (value, opts = { day: "numeric", month: "short" }) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString(undefined, opts) : "—";
};

export const formatDateTime = (value) => {
  const d = toDate(value);
  if (!d) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
};

/** "2 daqiqa oldin" ko'rinishi — jonli ro'yxatda sana raqamidan foydaliroq. */
export const formatRelative = (value) => {
  const d = toDate(value);
  if (!d) return "—";
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  if (diffSec < 60) return "hozirgina";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)} daq oldin`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)} soat oldin`;
  if (diffSec < 604800) return `${Math.floor(diffSec / 86400)} kun oldin`;
  return formatDate(value);
};

export const sortByCreatedDesc = (a, b) =>
  (toDate(b?.createdAt)?.getTime() || 0) - (toDate(a?.createdAt)?.getTime() || 0);

/* ------------------------------ Kalit kodlari ---------------------------- */

export const randomCode = () => {
  let result = "";
  for (let i = 0; i < KEY_LENGTH; i++) {
    result += KEY_ALPHABET.charAt(Math.floor(Math.random() * KEY_ALPHABET.length));
  }
  return result;
};

/**
 * Takrorlanmas kodlar. Kodlar hech narsaga solishtirilmasa, ikki kalit bir xil
 * kodga tushishi mumkin — `verifyAccessKey` esa kalitni `.limit(1)` bilan
 * qidiradi, ya'ni ikkinchisi umrbod "noto'g'ri kalit" bo'lib qoladi.
 */
export const generateUniqueCodes = (count, takenCodes) => {
  const used = new Set(takenCodes);
  const out = [];
  let guard = 0;
  while (out.length < count && guard < count * 500) {
    guard += 1;
    const code = randomCode();
    if (used.has(code)) continue;
    used.add(code);
    out.push(code);
  }
  if (out.length < count) throw new Error("Noyob kalit kodini yaratib bo'lmadi. Qaytadan urinib ko'ring.");
  return out;
};

export const chunk = (arr, size) => {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
};

/** Bazada shu kodlar bormi — boshqa admin parallel yaratgan bo'lishi mumkin. */
export const findExistingCodes = async (codes) => {
  const found = new Set();
  // Firestore `in` operatori bir so'rovda 30 tagacha qiymat oladi.
  await Promise.all(
    chunk(codes, 30).map(async (part) => {
      const snap = await getDocs(query(collection(db, "accessKeys"), where("key", "in", part)));
      snap.docs.forEach((d) => found.add(d.data()?.key));
    })
  );
  return found;
};

/* ------------------------------- Clipboard ------------------------------- */

/** Clipboard API HTTPS bo'lmagan hostda yo'q — eski usulga tushamiz. */
export const writeClipboard = async (text) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* pastdagi fallback */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};

/* --------------------------------- CSV ----------------------------------- */

const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const buildKeysCsv = (rows) =>
  [
    ["key", "status", "mock", "collection", "created", "usedBy", "usedAt"],
    ...rows.map((k) => [
      k.key || "",
      k.isUsed ? "used" : "unused",
      k.mockName || "",
      k.collectionName || "",
      formatDateTime(k.createdAt),
      k.usedByName || "",
      k.usedAt ? formatDateTime(k.usedAt) : "",
    ]),
  ]
    .map((r) => r.map(csvCell).join(","))
    .join("\n");

export const downloadCsv = (csv, filename) => {
  // BOM — Excel lotin/kirill harflarni to'g'ri o'qishi uchun.
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/* ------------------------------ Chop etish ------------------------------- */

const escapeHtml = (str) =>
  String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/**
 * Kalitlarni qirqib beriladigan kartochkalar ko'rinishida chop etadi —
 * o'qituvchi ro'yxatni qo'lda ko'chirib o'tirmasligi uchun.
 */
export const printKeys = (rows, title) => {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return false;

  const cards = rows
    .map(
      (k) => `
      <div class="card">
        <div class="label">${escapeHtml(k.mockName || "Mock Exam")}</div>
        <div class="code">${escapeHtml(k.key || "")}</div>
        <div class="meta">${escapeHtml(formatDate(k.createdAt))}</div>
      </div>`
    )
    .join("");

  win.document.write(`<!doctype html>
<html lang="uz"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; margin: 24px; color: #18181b; }
  h1 { font-size: 16px; margin: 0 0 4px; }
  p.sub { font-size: 12px; color: #71717a; margin: 0 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .card { border: 1px dashed #a1a1aa; border-radius: 10px; padding: 14px; text-align: center; break-inside: avoid; }
  .label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #71717a; margin-bottom: 6px;
           white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .code { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 22px; font-weight: 800; letter-spacing: 4px; }
  .meta { font-size: 9px; color: #a1a1aa; margin-top: 6px; }
  @media print { body { margin: 10mm; } .no-print { display: none; } }
</style></head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="sub">${rows.length} ta kalit • ${escapeHtml(formatDateTime(new Date()))}</p>
  <div class="grid">${cards}</div>
  <script>window.onload = () => window.print();</scr${""}ipt>
</body></html>`);
  win.document.close();
  return true;
};
