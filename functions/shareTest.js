// functions/shareTest.js
const admin = require("firebase-admin");
const fetch = require("node-fetch");

// Helper to escape HTML characters for safe use in attributes
const escapeHtml = (str) => {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

// Helper to update or inject meta tags
const setMetaTag = (htmlContent, propertyOrName, value, isProperty = true) => {
    const attr = isProperty ? "property" : "name";
    const regex = new RegExp(`<meta[^>]*${attr}="${propertyOrName}"[^>]*>`, "i");
    const newTag = `<meta ${attr}="${propertyOrName}" content="${escapeHtml(value)}" />`;
    if (regex.test(htmlContent)) {
        return htmlContent.replace(regex, newTag);
    } else {
        return htmlContent.replace("</head>", `${newTag}\n</head>`);
    }
};

async function shareTest(req, res) {
    const originalUrl = req.originalUrl || req.url || "";
    const urlPath = originalUrl.split("?")[0];
    const pathParts = urlPath.split("/").filter(Boolean); // e.g., ["test", "testId"] or ["review", "resultId"]
    
    const routeType = pathParts[0];
    const resourceId = pathParts[1];

    console.log("shareTest debugging:", {
        originalUrl,
        urlPath,
        pathParts,
        routeType,
        resourceId
    });

    if (!resourceId || (routeType !== "test" && routeType !== "review")) {
        console.warn("Invalid path parts or missing resource ID. Redirecting to /");
        return res.redirect("/");
    }

    try {
        const db = admin.firestore();
        let title = "IELTS Test | ENGLEV";
        let description = "ENGLEV platformasida IELTS testlarini onlayn topshiring.";
        let thumbnail = "https://englev.uz/ielts_mock_showcase.png";

        if (routeType === "test") {
            // 1. Try to fetch from tests_metadata (lighter document)
            const metaSnap = await db.collection("tests_metadata").doc(resourceId).get();
            if (metaSnap.exists) {
                const meta = metaSnap.data();
                title = meta.title || "IELTS Test";
                const typeLabel = meta.type ? meta.type.charAt(0).toUpperCase() + meta.type.slice(1) : "";
                description = typeLabel 
                    ? `${typeLabel} testi. Ushbu IELTS testini ENGLEV platformasida onlayn topshiring.`
                    : "ENGLEV platformasida ushbu IELTS testini onlayn topshiring.";
                
                // Read image/thumbnail from metadata if available
                const metaImg = meta.image || meta.image_url || meta.imageUrl || meta.thumbnail;
                if (metaImg) {
                    thumbnail = metaImg;
                }
            } else {
                // Fallback to tests collection
                const testSnap = await db.collection("tests").doc(resourceId).get();
                if (testSnap.exists) {
                    const test = testSnap.data();
                    title = test.title || "IELTS Test";
                    const typeLabel = test.type ? test.type.charAt(0).toUpperCase() + test.type.slice(1) : "";
                    description = typeLabel 
                        ? `${typeLabel} testi. Ushbu IELTS testini ENGLEV platformasida onlayn topshiring.`
                        : "ENGLEV platformasida ushbu IELTS testini onlayn topshiring.";
                    
                    // Read image/thumbnail from full test doc
                    const testImg = test.image || test.image_url || test.imageUrl || test.thumbnail;
                    if (testImg) {
                        thumbnail = testImg;
                    }
                }
            }
        } else if (routeType === "review") {
            // 2. Fetch from results collection
            const resultSnap = await db.collection("results").doc(resourceId).get();
            if (resultSnap.exists) {
                const result = resultSnap.data();
                const testTitle = result.testTitle || "IELTS Test";
                const userName = result.userName || "Foydalanuvchi";
                title = `Natija sharhi: ${testTitle}`;
                description = `${userName}ning ENGLEV platformasidagi test natijalari tahlili va sharhi.`;
                
                // Read image/thumbnail from result doc if available
                const resultImg = result.image || result.image_url || result.imageUrl || result.thumbnail;
                if (resultImg) {
                    thumbnail = resultImg;
                }
            }
        }

        // Resolve correct public host domain to fetch index.html
        let host = req.headers["x-forwarded-host"] || req.headers.host || "englev.uz";
        if (host.includes("cloudfunctions.net") || host.includes("google.com")) {
            host = "englev.uz";
        }
        const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
        const indexUrl = `${protocol}://${host}/index.html`;

        console.log("Fetching index.html from:", indexUrl);
        const indexRes = await fetch(indexUrl);
        if (!indexRes.ok) {
            throw new Error(`Failed to fetch index.html: ${indexRes.statusText}`);
        }
        let html = await indexRes.text();

        // Inject dynamic meta tags
        html = setMetaTag(html, "og:title", title, true);
        html = setMetaTag(html, "og:description", description, true);
        html = setMetaTag(html, "og:image", thumbnail, true);
        html = setMetaTag(html, "twitter:title", title, false);
        html = setMetaTag(html, "twitter:description", description, false);
        html = setMetaTag(html, "twitter:image", thumbnail, false);

        // Update standard HTML <title> tag
        html = html.replace(/<title>[^<]*<\/title>/gi, `<title>${escapeHtml(title)}</title>`);

        // Set Cache-Control header: 10 mins browser cache, 1 hour CDN cache
        res.setHeader("Cache-Control", "public, max-age=600, s-maxage=3600");
        res.status(200).send(html);

    } catch (error) {
        console.error("Error in shareTest function:", error);
        // Fallback: redirect to landing or normal client page
        res.redirect("/");
    }
}

module.exports = { shareTest };
