import { useState, useEffect, useCallback } from "react";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firebase";

// In-memory cache to avoid redundant calls
const podcastCache = {
    podcasts: null,
    collections: null,
    albums: {},
    episodes: {}
};

/**
 * Hook to fetch all published podcasts (Spotify mode)
 */
export const usePodcastsList = () => {
    const [podcasts, setPodcasts] = useState(podcastCache.podcasts || []);
    const [loading, setLoading] = useState(!podcastCache.podcasts);
    const [error, setError] = useState(null);

    const fetchPodcasts = useCallback(async (force = false) => {
        if (!force && podcastCache.podcasts) {
            setPodcasts(podcastCache.podcasts);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const q = query(
                collection(db, "podcasts"), 
                where("status", "==", "published"),
                where("mode", "==", "spotify"),
                orderBy("createdAt", "desc")
            );
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            podcastCache.podcasts = data;
            setPodcasts(data);
        } catch (err) {
            console.error("Error fetching podcasts:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPodcasts();
    }, [fetchPodcasts]);

    return { podcasts, loading, error, retry: () => fetchPodcasts(true) };
};

/**
 * Hook to fetch all podcast collections (albums)
 */
export const usePodcastCollections = () => {
    const [collections, setCollections] = useState(podcastCache.collections || []);
    const [loading, setLoading] = useState(!podcastCache.collections);
    const [error, setError] = useState(null);

    const fetchCollections = useCallback(async (force = false) => {
        if (!force && podcastCache.collections) {
            setCollections(podcastCache.collections);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const q = query(collection(db, "podcast_collections"));
            const snap = await getDocs(q);
            const data = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            podcastCache.collections = data;
            setCollections(data);
        } catch (err) {
            console.error("Error fetching collections:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCollections();
    }, [fetchCollections]);

    return { collections, loading, error, retry: () => fetchCollections(true) };
};

/**
 * Hook to fetch specific album and its podcasts
 */
export const useAlbumData = (albumId) => {
    const [album, setAlbum] = useState(podcastCache.albums[albumId]?.album || null);
    const [podcasts, setPodcasts] = useState(podcastCache.albums[albumId]?.podcasts || []);
    const [loading, setLoading] = useState(!podcastCache.albums[albumId]);
    const [error, setError] = useState(null);

    const fetchAlbumData = useCallback(async (force = false) => {
        if (!albumId) return;
        
        if (!force && podcastCache.albums[albumId]) {
            setAlbum(podcastCache.albums[albumId].album);
            setPodcasts(podcastCache.albums[albumId].podcasts);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            // Fetch Album
            const albumSnap = await getDoc(doc(db, "podcast_collections", albumId));
            let albumData = null;
            if (albumSnap.exists()) {
                albumData = { id: albumSnap.id, ...albumSnap.data() };
                setAlbum(albumData);
            }

            // Fetch Podcasts in collection
            const q = query(
                collection(db, "podcasts"), 
                where("status", "==", "published"),
                where("mode", "==", "spotify"),
                where("collectionId", "==", albumId)
            );
            const snap = await getDocs(q);
            const podcastData = snap.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            
            podcastCache.albums[albumId] = { album: albumData, podcasts: podcastData };
            setPodcasts(podcastData);
        } catch (err) {
            console.error("Error fetching album data:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [albumId]);

    useEffect(() => {
        fetchAlbumData();
    }, [fetchAlbumData]);

    return { album, podcasts, loading, error, retry: () => fetchAlbumData(true) };
};

/**
 * Hook to fetch single episode and its parent collection
 */
export const useEpisodeDetails = (episodeId) => {
    const [podcast, setPodcast] = useState(podcastCache.episodes[episodeId]?.podcast || null);
    const [album, setAlbum] = useState(podcastCache.episodes[episodeId]?.album || null);
    const [loading, setLoading] = useState(!podcastCache.episodes[episodeId]);
    const [error, setError] = useState(null);

    const fetchDetails = useCallback(async (force = false) => {
        if (!episodeId) return;

        if (!force && podcastCache.episodes[episodeId]) {
            setPodcast(podcastCache.episodes[episodeId].podcast);
            setAlbum(podcastCache.episodes[episodeId].album);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const podSnap = await getDoc(doc(db, "podcasts", episodeId));
            if (podSnap.exists()) {
                const podData = { id: podSnap.id, ...podSnap.data() };
                setPodcast(podData);
                
                let albumData = null;
                if (podData.collectionId && podData.collectionId !== "None") {
                    const albumSnap = await getDoc(doc(db, "podcast_collections", podData.collectionId));
                    if (albumSnap.exists()) {
                        albumData = albumSnap.data();
                        setAlbum(albumData);
                    }
                }
                podcastCache.episodes[episodeId] = { podcast: podData, album: albumData };
            }
        } catch (err) {
            console.error("Error fetching episode details:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    }, [episodeId]);

    useEffect(() => {
        fetchDetails();
    }, [fetchDetails]);

    return { podcast, album, loading, error, retry: () => fetchDetails(true) };
};
