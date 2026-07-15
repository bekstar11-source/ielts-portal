import React, { useState } from 'react';
import { useStories } from '../../hooks/dashboard/useStories';
import StoryViewerModal from './StoryViewerModal';
import { Plus } from 'lucide-react';

export default function StoriesContainer({ user, userData }) {
    const { stories, loading, viewedStoryIds, markStoryAsViewed, userVotes, submitVote } = useStories(user);
    const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);

    if (loading) {
        return (
            <div className="flex gap-4 p-4 overflow-x-auto scrollbar-none animate-pulse">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0">
                        <div className="w-[77px] h-[77px] rounded-full bg-gray-200 dark:bg-white/10" />
                        <div className="w-14 h-3 bg-gray-200 dark:bg-white/10 rounded mt-0.5" />
                    </div>
                ))}
            </div>
        );
    }

    if (stories.length === 0) return null;

    const handleOpenStory = (index) => {
        setSelectedStoryIndex(index);
        markStoryAsViewed(stories[index].id);
    };

    return (
        <div className="w-full bg-white dark:bg-[#18181b] py-4 transition-colors">
            <div className="flex gap-4 px-4 overflow-x-auto scrollbar-none">
                {stories.map((story, index) => {
                    const isViewed = viewedStoryIds.has(story.id);
                    return (
                        <button
                            key={story.id}
                            onClick={() => handleOpenStory(index)}
                            className="flex flex-col items-center gap-1.5 flex-shrink-0 focus:outline-none group"
                        >
                            {/* Glow-border container */}
                            <div className={`p-[2px] rounded-full transition-transform duration-300 group-hover:scale-105 ${
                                isViewed 
                                    ? 'bg-gray-200 dark:bg-zinc-800' 
                                    : 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
                            }`}>
                                <div className="p-[2.5px] rounded-full bg-white dark:bg-[#18181b]">
                                    {story.mediaType === 'text' ? (
                                        <div className="w-[68px] h-[68px] rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold p-2.5 text-center select-none overflow-hidden leading-tight">
                                            {story.text?.slice(0, 18)}...
                                        </div>
                                    ) : (
                                        <img
                                            src={story.mediaUrl}
                                            alt="Story preview"
                                            className="w-[68px] h-[68px] rounded-full object-cover select-none"
                                        />
                                    )}
                                </div>
                            </div>
                            
                            <span className="text-[11px] max-w-[78px] truncate text-gray-500 dark:text-zinc-400 font-medium select-none mt-0.5">
                                Admin
                            </span>
                        </button>
                    );
                })}
            </div>

            {selectedStoryIndex !== null && (
                <StoryViewerModal
                    stories={stories}
                    initialIndex={selectedStoryIndex}
                    onClose={() => setSelectedStoryIndex(null)}
                    viewedStoryIds={viewedStoryIds}
                    onStoryChange={(idx) => {
                        setSelectedStoryIndex(idx);
                        markStoryAsViewed(stories[idx].id);
                    }}
                    user={user}
                    userData={userData}
                    userVotes={userVotes}
                    submitVote={submitVote}
                />
            )}
        </div>
    );
}
