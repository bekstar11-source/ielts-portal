// Imtihon audiosi uchun yaratilgan blob URL'lar reyestri.
//
// Blob'lar test obyektiga berilgani uchun ularni yaratgan komponent unmount
// bo'lganda revoke QILIB BO'LMAYDI — audio ijro paytida uzilib qolardi.
// Buning o'rniga listening moduli tugagach `revokeMockAudioBlobs()` chaqiriladi.
// Usiz 3 modul davomida o'nlab MB blob xotirada qolib, mobil brauzer
// (ayniqsa iOS Safari) tab'ni o'ldirishi mumkin.

const registry = new Set();

export function registerAudioBlob(url) {
    registry.add(url);
    return url;
}

export function revokeMockAudioBlobs() {
    registry.forEach(url => {
        try { URL.revokeObjectURL(url); } catch { /* allaqachon revoke qilingan */ }
    });
    registry.clear();
}
