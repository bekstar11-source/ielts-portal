import { useState, useEffect } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

/**
 * Hook to fetch all published podcasts (Spotify mode)
 */
export const usePodcastsList = () => {
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPodcasts = async () => {
            try {
                const q = query(
                    collection(db, "podcasts"), 
                    where("status", "==", "published"),
                    where("mode", "==", "spotify"),
                    orderBy("createdAt", "desc")
                );
                const snap = await getDocs(q);
                setPodcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Error fetching podcasts:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPodcasts();
    }, []);

    return { podcasts, loading, error };
};

/**
 * Hook to fetch all podcast collections (albums)
 */
export const usePodcastCollections = () => {
    const [collections, setCollections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const q = query(collection(db, "podcast_collections"), orderBy("createdAt", "asc"));
                const snap = await getDocs(q);
                setCollections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Error fetching collections:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchCollections();
    }, []);

    return { collections, loading, error };
};

/**
 * Hook to fetch specific album and its podcasts
 */
export const useAlbumData = (albumId) => {
    const [album, setAlbum] = useState(null);
    const [podcasts, setPodcasts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!albumId) return;

        const fetchAlbumData = async () => {
            try {
                // Fetch Album
                const albumSnap = await getDoc(doc(db, "podcast_collections", albumId));
                if (albumSnap.exists()) {
                    setAlbum({ id: albumSnap.id, ...albumSnap.data() });
                }

                // Fetch Podcasts in collection
                const q = query(
                    collection(db, "podcasts"), 
                    where("status", "==", "published"),
                    where("mode", "==", "spotify"),
                    where("collectionId", "==", albumId)
                );
                const snap = await getDocs(q);
                setPodcasts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            } catch (err) {
                console.error("Error fetching album data:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchAlbumData();
    }, [albumId]);

    return { album, podcasts, loading, error };
};

/**
 * Hook to fetch single episode and its parent collection
 */
export const useEpisodeDetails = (episodeId) => {
    const [podcast, setPodcast] = useState(null);
    const [album, setAlbum] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!episodeId) return;

        const fetchDetails = async () => {
            try {
                const podSnap = await getDoc(doc(db, "podcasts", episodeId));
                if (podSnap.exists()) {
                    const podData = { id: podSnap.id, ...podSnap.data() };
                    setPodcast(podData);
                    
                    if (podData.collectionId && podData.collectionId !== "None") {
                        const albumSnap = await getDoc(doc(db, "podcast_collections", podData.collectionId));
                        if (albumSnap.exists()) {
                            setAlbum(albumSnap.data());
                        }
                    }
                }
            } catch (err) {
                console.error("Error fetching episode details:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDetails();
    }, [episodeId]);

    return { podcast, album, loading, error };
};
