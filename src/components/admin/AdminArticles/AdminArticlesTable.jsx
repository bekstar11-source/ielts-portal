import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ImageIcon, Star, Edit2, Trash2, MessageSquare } from 'lucide-react';

const AdminArticlesTable = ({ articles, loading, onEdit, onDelete }) => {
    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="h-[320px] bg-white dark:bg-[#1E1E1E] rounded-[32px] border border-black/[0.03] dark:border-white/5 animate-pulse" />
                ))}
            </div>
        );
    }

    if (articles.length === 0) {
        return (
            <div className="py-20 text-center space-y-4">
                <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-400">
                    <BookOpen size={48} />
                </div>
                <h3 className="text-xl font-bold">Maqolalar topilmadi</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Yangi maqola yaratish uchun yuqoridagi tugmani bosing.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence>
                {articles.map((article) => (
                    <motion.div 
                        key={article.id}
                        layout
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group bg-white dark:bg-[#1E1E1E] rounded-[40px] border border-black/[0.03] dark:border-white/5 overflow-hidden hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-500 flex flex-col relative"
                    >
                        <div className="h-40 w-full relative overflow-hidden bg-gray-100 dark:bg-white/5">
                            {article.imageUrl ? (
                                <img src={article.imageUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" alt="" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    <ImageIcon size={40} />
                                </div>
                            )}
                            <div className="absolute top-4 left-4 flex gap-2">
                                <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-[10px] font-bold rounded-full uppercase tracking-wider text-black shadow-sm">
                                    {article.category}
                                </span>
                                {article.isMemberOnly && (
                                    <span className="px-3 py-1 bg-yellow-400 text-black text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                                        <Star size={10} className="fill-black" /> Pro
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="p-6 flex-1 flex flex-col">
                            <h3 className="text-xl font-bold leading-tight mb-3 group-hover:text-blue-600 transition-colors line-clamp-2">
                                {article.title}
                            </h3>
                            
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-gray-400 overflow-hidden">
                                    {article.authorAvatar ? (
                                        <img src={article.authorAvatar} className="w-full h-full object-cover" />
                                    ) : article.author?.charAt(0)}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-[#242424] dark:text-white/80">{article.author}</span>
                                    <span className="text-[10px] text-gray-400">{article.readTime}</span>
                                </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-black/[0.03] dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-3 text-gray-400">
                                    <div className="flex items-center gap-1">
                                        <MessageSquare size={14} />
                                        <span className="text-[11px] font-bold">{article.quiz?.length || 0}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span>👏</span>
                                        <span className="text-[11px] font-bold">{article.claps || 0}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onEdit(article)} className="p-2.5 bg-gray-50 dark:bg-white/5 hover:bg-blue-500 hover:text-white rounded-xl transition-all"><Edit2 size={16} /></button>
                                    <button onClick={() => onDelete(article.id)} className="p-2.5 bg-gray-50 dark:bg-white/5 hover:bg-red-500 hover:text-white rounded-xl transition-all text-red-500 group-hover:text-white"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
};

export default AdminArticlesTable;
