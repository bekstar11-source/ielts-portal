export const getCdnUrl = (originalUrl) => {
  if (!originalUrl || typeof originalUrl !== "string") return originalUrl;
  
  // Cloudflare Worker manzilini shu yerda o'zgartirishingiz mumkin
  const CDN_DOMAIN = "https://firebase-cdn.bekstar11.workers.dev";
  
  return originalUrl.replace(
    "https://firebasestorage.googleapis.com", 
    CDN_DOMAIN
  );
};
