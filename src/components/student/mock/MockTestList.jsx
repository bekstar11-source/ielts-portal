import React from 'react';
import { FileText, Loader2 } from 'lucide-react';
import MockTestCard from './MockTestCard';

export default function MockTestList({ 
    t, activeTab, setActiveTab, filteredMocks, navigate, userData, fetchingMocks, lang
}) {
    return (
                <section className="space-y-8">
                    <div className="flex items-center gap-12 border-b border-gray-200">
                        <button 
                            onClick={() => setActiveTab('upcoming')}
                            className={`pb-4 text-[17px] font-bold transition-all relative ${activeTab === 'upcoming' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('mock.upcomingTests')}
                            {activeTab === 'upcoming' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#e31b23]" />}
                        </button>
                        <button 
                            onClick={() => setActiveTab('past')}
                            className={`pb-4 text-[17px] font-bold transition-all relative ${activeTab === 'past' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {t('mock.pastTests')}
                            {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#e31b23]" />}
                        </button>
                    </div>
                    
                    {activeTab === 'past' && filteredMocks.length > 0 && (
                        <p className="text-sm font-bold text-gray-900 mb-6 mt-8">
                            {lang === 'uz' ? (
                                <>
                                    Sizda <span className="text-[#e31b23]">{filteredMocks.length}</span> ta o'tgan test mavjud
                                </>
                            ) : (
                                <>
                                    Showing <span className="text-[#e31b23]">{filteredMocks.length}</span> past test{filteredMocks.length > 1 ? 's' : ''}
                                </>
                            )}
                        </p>
                    )}

                    <div className="space-y-6">
                        {fetchingMocks ? (
                            <div className="py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                                <Loader2 className="animate-spin mx-auto mb-4 opacity-30" size={32} /> 
                                {t('mock.authenticating')}
                            </div>
                        ) : filteredMocks.length > 0 ? (
                            filteredMocks.map((test, index) => (
                                <MockTestCard key={index} test={test} tab={activeTab} navigate={navigate} userData={userData} />
                            ))
                        ) : (
                            <div className="border border-dashed border-gray-300 rounded-md py-20 text-center bg-gray-50/50">
                                <FileText size={40} className="mx-auto mb-4 text-gray-200" />
                                <p className="text-gray-400 text-sm font-medium italic">
                                    {activeTab === 'upcoming' ? t('mock.noUpcoming') : t('mock.noPast')}
                                </p>
                            </div>
                        )}
                    </div>
                </section>
    );
}