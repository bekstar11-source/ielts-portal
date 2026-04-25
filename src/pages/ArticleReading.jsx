import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, BookMarked, Share2, 
  Type, MessageSquare, CheckCircle2,
  ArrowRight, ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import { useAuth } from '../context/AuthContext';

export default function ArticleReading() {
  const { user, userData } = useAuth();
  const navigate = useNavigate();
  const [textSize, setTextSize] = useState('text-lg'); // text-base, text-lg, text-xl
  const [completed, setCompleted] = useState(false);

  // Sample Article Data
  const article = {
    category: "Science & Environment",
    title: "The Future of Sustainable Urban Development",
    author: "National Geographic Society",
    date: "April 25, 2024",
    readTime: "8 min read",
    content: [
      {
        type: 'heading',
        text: "The Rise of Eco-Cities"
      },
      {
        type: 'paragraph',
        text: "As the global population continues to urbanize, the challenge of creating sustainable environments becomes increasingly critical. Eco-cities represent a bold step toward a future where urban living and environmental stewardship are not mutually exclusive. These cities are designed to minimize their environmental impact by reducing waste, lowering carbon emissions, and preserving natural resources."
      },
      {
        type: 'paragraph',
        text: "One of the key pillars of sustainable urbanism is efficient public transportation. By prioritizing pedestrians and cyclists over cars, cities can significantly reduce air pollution and improve the overall quality of life for their residents. For instance, cities like Copenhagen and Amsterdam have set the gold standard for urban mobility, showing that a shift away from fossil-fuel-dependent transport is not only possible but beneficial."
      },
      {
        type: 'heading',
        text: "Innovative Architecture"
      },
      {
        type: 'paragraph',
        text: "Modern architecture is also playing a pivotal role. The use of 'green roofs' and vertical gardens helps mitigate the urban heat island effect while providing much-needed greenery in concrete jungles. Furthermore, smart building technologies are optimizing energy consumption in real-time, ensuring that resources are used only when and where they are needed."
      }
    ],
    quiz: [
      {
        question: "What is the primary goal of eco-cities mentioned in the text?",
        options: [
          "To increase urban population",
          "To minimize environmental impact",
          "To build more highways",
          "To expand industrial zones"
        ],
        correct: 1
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1D1D1F] font-sans antialiased">
      <DashboardHeader user={user} userData={userData} activeTab="practice" />
      
      {/* Sub Header / Action Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.05] py-3">
        <div className="max-w-4xl mx-auto px-6 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 text-sm font-semibold text-[#0066CC] hover:opacity-70 transition-all"
          >
            <ChevronLeft size={18} /> Orqaga
          </button>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setTextSize(prev => prev === 'text-base' ? 'text-lg' : prev === 'text-lg' ? 'text-xl' : 'text-base')}
              className="p-2 hover:bg-[#F5F5F7] rounded-full transition-all text-[#86868B]"
              title="Shrift o'lchami"
            >
              <Type size={20} />
            </button>
            <button className="p-2 hover:bg-[#F5F5F7] rounded-full transition-all text-[#86868B]">
              <BookMarked size={20} />
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Article Meta */}
        <div className="space-y-4 mb-12">
          <span className="text-[#0066CC] font-bold text-sm uppercase tracking-widest">
            {article.category}
          </span>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            {article.title}
          </h1>
          <div className="flex items-center gap-4 text-[#86868B] text-sm pt-4 border-t border-black/[0.05]">
            <span className="font-semibold text-[#1D1D1F]">{article.author}</span>
            <span>•</span>
            <span>{article.date}</span>
            <span>•</span>
            <span>{article.readTime}</span>
          </div>
        </div>

        {/* Article Body */}
        <article className={`${textSize} leading-relaxed text-[#424245] space-y-8`}>
          {article.content.map((block, i) => (
            block.type === 'heading' ? (
              <h2 key={i} className="text-2xl font-bold text-[#1D1D1F] mt-12 mb-4">{block.text}</h2>
            ) : (
              <p key={i} className="font-medium">{block.text}</p>
            )
          ))}
        </article>

        {/* Quiz Section */}
        {!completed ? (
          <div className="mt-20 p-8 rounded-3xl bg-[#F5F5F7] border border-black/[0.02]">
            <h3 className="text-xl font-bold mb-2">Comprehension Check</h3>
            <p className="text-[#86868B] text-sm mb-8">Maqola yuzasidan kichik testni yeching.</p>
            
            <div className="space-y-4">
              {article.quiz.map((q, i) => (
                <div key={i} className="space-y-6">
                  <p className="font-bold text-lg">{q.question}</p>
                  <div className="grid grid-cols-1 gap-3">
                    {q.options.map((opt, optIdx) => (
                      <button 
                        key={optIdx}
                        onClick={() => setCompleted(true)}
                        className="w-full text-left p-4 rounded-2xl bg-white border border-black/[0.03] hover:border-[#0071E3] hover:bg-blue-50/30 transition-all flex items-center justify-between group"
                      >
                        <span className="font-medium">{opt}</span>
                        <ArrowRight size={18} className="text-[#0071E3] opacity-0 group-hover:opacity-100 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-20 p-10 rounded-3xl bg-green-50 border border-green-100 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="text-2xl font-bold text-green-900 mb-2">Barakalla!</h3>
            <p className="text-green-700 mb-8 font-medium">Siz bugungi maqolani muvaffaqiyatli o'qib chiqdingiz.</p>
            <button 
              onClick={() => navigate('/roadmap')}
              className="px-8 py-4 bg-green-600 text-white rounded-full font-bold shadow-lg shadow-green-600/20 hover:scale-105 transition-all"
            >
              Marshrutga qaytish
            </button>
          </motion.div>
        )}
      </main>

      <footer className="bg-[#F5F5F7] py-20 mt-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-[#86868B] text-sm mb-6">Mavzuga oid ko'proq maqolalar bilan tanishing</p>
          <button className="flex items-center gap-2 mx-auto font-bold text-[#0066CC] hover:underline">
            Explore more topics <ExternalLink size={18} />
          </button>
        </div>
      </footer>
    </div>
  );
}
