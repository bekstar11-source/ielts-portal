// src/components/common/SchemaMarkup.jsx
import React from 'react';
import { getPlanPrice } from '../../utils/pricing';

/**
 * SchemaMarkup Component
 * Inject Structured Data (Schema.org) JSON-LD for "EducationalOrganization" and "Course"
 * to display Rich Snippets (stars, ratings, images, pricing) in search engine results.
 */
export default function SchemaMarkup() {
  // Dynamically resolve URL origin at runtime, or fallback to production domain
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://englev.uz';

  // 1. EducationalOrganization Schema (Tashkilot Sxemasi)
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": `${currentUrl}/#organization`,
    "name": "ENGLEV",
    "legalName": "Englev Inc.",
    "url": currentUrl,
    "logo": {
      "@type": "ImageObject",
      "url": `${currentUrl}/favicon.png`,
      "width": "512",
      "height": "512"
    },
    "image": `${currentUrl}/favicon.png`,
    "description": "IELTS dan yuqori ball olishning eng zamonaviy o'quv portali. Real imtihon muhiti, sun'iy intellekt yordamida chuqur tahlil va aniq natijalar.",
    "telephone": "+998-91-518-18-44",
    "address": {
      "@type": "PostalAddress",
      "addressCountry": "UZ",
      "addressLocality": "Tashkent"
    },
    "sameAs": [
      "https://t.me/englev",
      "https://instagram.com/englev"
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1280",
      "bestRating": "5",
      "worstRating": "1"
    }
  };

  // 2. Course Schema (Kurs Sxemasi) for IELTS Prep & Mock Exam
  const courseSchema = {
    "@context": "https://schema.org",
    "@type": "Course",
    "@id": `${currentUrl}/#course`,
    "name": "IELTS Mock Exam Prep Course (Online Simulyatsiya)",
    "description": "Haqiqiy imtihon muhitida IELTS testlarini topshirish va sun'iy intellekt (AI) yordamida tezkor Speaking hamda Writing baholash xizmati.",
    "provider": {
      "@type": "EducationalOrganization",
      "name": "ENGLEV",
      "sameAs": currentUrl
    },
    "offers": [
      {
        "@type": "Offer",
        "category": "Free",
        "name": "Diagnostic & Demo Test",
        "price": "0",
        "priceCurrency": "UZS",
        "url": `${currentUrl}/login`
      },
      {
        "@type": "Offer",
        "category": "Paid",
        "name": "Standard Plan (monthly)",
        // ⚠️ Narx `src/utils/pricing.js` dagi `PLAN_PRICES` dan olinadi.
        // Ilgari bu yerda 149 000 qotib turardi — ya'ni Google natijalarida
        // haqiqiy narxdan (35 000) 4 baravar yuqori summa ko'rinardi.
        "price": String(getPlanPrice('standard', 'monthly')),
        "priceCurrency": "UZS",
        "url": `${currentUrl}/pricing`
      },
      {
        "@type": "Offer",
        "category": "Paid",
        "name": "Pro Plan (monthly)",
        "price": String(getPlanPrice('pro', 'monthly')),
        "priceCurrency": "UZS",
        "url": `${currentUrl}/pricing`
      }
    ],
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "ratingCount": "1280",
      "bestRating": "5",
      "worstRating": "1"
    },
    "educationalLevel": "Intermediate to Advanced",
    "about": [
      {
        "@type": "Thing",
        "name": "IELTS Academic"
      },
      {
        "@type": "Thing",
        "name": "English Language Learning"
      }
    ]
  };

  return (
    <>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(courseSchema)}
      </script>
    </>
  );
}
