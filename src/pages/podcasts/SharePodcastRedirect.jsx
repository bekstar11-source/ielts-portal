import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/firebase';

export default function SharePodcastRedirect() {
  const { podcastId } = useParams();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!podcastId) {
      navigate('/podcasts', { replace: true });
      return;
    }

    const checkPodcastType = async () => {
      try {
        const snap = await getDoc(doc(db, 'podcasts', podcastId));
        if (snap.exists()) {
          const data = snap.data();
          if (data.mode === 'spotify' || data.type === 'spotify') {
            navigate(`/podcast/spotify/${podcastId}`, { replace: true });
          } else {
            navigate(`/podcast/${podcastId}`, { replace: true });
          }
        } else {
          setError('Podcast topilmadi.');
          setTimeout(() => navigate('/podcasts', { replace: true }), 2000);
        }
      } catch (err) {
        console.error('Error checking podcast type:', err);
        setError('Yuklashda xatolik yuz berdi.');
        setTimeout(() => navigate('/podcasts', { replace: true }), 2000);
      }
    };

    checkPodcastType();
  }, [podcastId, navigate]);

  return (
    <div className="h-screen w-full bg-zinc-950 flex flex-col items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4">
        {error ? (
          <p className="text-red-500 font-semibold">{error}</p>
        ) : (
          <>
            <div className="w-12 h-12 border-4 border-white/5 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-zinc-400 text-sm">Podcast yuklanmoqda...</p>
          </>
        )}
      </div>
    </div>
  );
}
