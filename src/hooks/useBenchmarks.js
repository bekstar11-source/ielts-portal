// src/hooks/useBenchmarks.js
//
// Anonim taqqoslash jadvali — `stats/benchmarks`.
//
// Bitta hujjat, HAMMA foydalanuvchi uchun bir xil. Ya'ni bu bo'lim
// foydalanuvchi boshiga bitta o'qish qo'shadi, kesh esa juda samarali
// ishlaydi: jadval kuniga bir marta yangilanadi.
//
// Guruh o'quvchining O'Z band darajasi bo'yicha tanlanadi — umumiy o'rtacha
// bilan taqqoslash zararli bo'lardi (`functions/buildBenchmarks.js` ga qarang).

import { useQuery } from '@tanstack/react-query';
import { doc, getDoc } from 'firebase/firestore';

import { db } from '../firebase/firebase';

/** Jadval kuniga bir marta yangilanadi — keshni uzoq ushlaymiz. */
const STALE_MS = 1000 * 60 * 60 * 6;
const GC_MS = 1000 * 60 * 60 * 12;

/** `functions/buildBenchmarks.js` dagi `bandBucket` bilan bir xil bo'lishi shart. */
export function bandBucket(band) {
  const value = Number(band) || 0;
  if (value <= 0) return null;
  if (value < 5) return '4';
  if (value >= 8) return '8';
  return String(Math.floor(value));
}

/**
 * @param {boolean} [enabled=true]
 * @returns {{buckets: object, loading: boolean}}
 */
export function useBenchmarks(enabled = true) {
  const query = useQuery({
    queryKey: ['benchmarks'],
    enabled,
    staleTime: STALE_MS,
    gcTime: GC_MS,
    // Jadval bo'lmasa bo'lim shunchaki ko'rsatilmaydi — qayta urinish behuda.
    retry: 0,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'stats', 'benchmarks'));
      return snap.exists() ? snap.data()?.buckets || {} : {};
    }
  });

  return { buckets: query.data || {}, loading: query.isLoading };
}

/**
 * O'quvchining darajasiga mos taqqoslash qatorini qaytaradi.
 *
 * @param {object} buckets
 * @param {number|null} band O'quvchining eng yaxshi bandi
 * @returns {{users: number, families: object}|null}
 */
export function bucketFor(buckets, band) {
  const key = bandBucket(band);
  if (!key || !buckets) return null;
  return Object.prototype.hasOwnProperty.call(buckets, key) ? buckets[key] : null;
}

export default useBenchmarks;
