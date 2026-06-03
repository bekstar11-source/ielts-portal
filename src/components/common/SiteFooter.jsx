import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../context/LanguageContext';

const SiteFooter = () => {
  const { t, lang, setLang } = useTranslation();

  return (
    <footer className="bg-[#f5f5f7] dark:bg-[#09090b] border-t border-[#d2d2d7] dark:border-zinc-800/80 text-[#424245] dark:text-[#a1a1a6] text-[12px] font-sans pt-10 pb-6 w-full transition-colors duration-200">
      <style>{`
        .dark footer h3, .dark footer .font-semibold {
          color: #f5f5f7 !important;
        }
        .dark footer a, .dark footer span, .dark footer button {
          color: #a1a1a6 !important;
          transition: color 0.2s ease;
        }
        .dark footer a:hover, .dark footer span:hover, .dark footer button:hover {
          color: #f5f5f7 !important;
        }
        .dark footer p, .dark footer div {
          color: #86868b;
        }
        .dark footer .border-t, .dark footer .border-b, .dark footer .border-l {
          border-color: #333336 !important;
        }
      `}</style>
      <div className="max-w-[980px] mx-auto px-4 md:px-6">

        {/* Footnotes / Top info */}
        <div className="border-b border-[#d2d2d7] pb-4 mb-5 text-[11px] leading-snug text-[#6e6e73]">
          <p>
            {t('footer.footnote')}
          </p>
        </div>

        {/* Desktop Columns */}
        <div className="hidden md:flex flex-wrap justify-between pb-4">
          {/* Column 1 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.learnAndPractice')}</h3>
            <ul className="space-y-2 mb-6">
              <li><Link to="/reading" className="hover:text-[#1d1d1f] hover:underline">Reading</Link></li>
              <li><Link to="/listening" className="hover:text-[#1d1d1f] hover:underline">Listening</Link></li>
              <li><Link to="/practice?tab=writing" className="hover:text-[#1d1d1f] hover:underline">Writing</Link></li>
              <li><Link to="/practice?tab=speaking" className="hover:text-[#1d1d1f] hover:underline">Speaking</Link></li>
              <li><Link to="/vocabulary" className="hover:text-[#1d1d1f] hover:underline">WordBank</Link></li>
              <li><Link to="/practice?tab=mock" className="hover:text-[#1d1d1f] hover:underline">Mock Exams</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#1d1d1f] hover:underline">Podcasts</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.account')}</h3>
            <ul className="space-y-2 mb-6">
              <li><Link to="/settings" className="hover:text-[#1d1d1f] hover:underline">{t('footer.settings')}</Link></li>
              <li><Link to="/my-results" className="hover:text-[#1d1d1f] hover:underline">{t('footer.myResults')}</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#1d1d1f] hover:underline">{t('footer.favorites')}</Link></li>
              {/* <li><Link to="/leaderboard" className="hover:text-[#1d1d1f] hover:underline">{t('footer.ranking')}</Link></li> */}
            </ul>

            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.premium')}</h3>
            <ul className="space-y-2">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.upgradeSubscription')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.enterKey')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.pricing')}</span></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.resources')}</h3>
            <ul className="space-y-2 mb-6">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.blog')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.videos')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.readingTips')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.successStories')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.calculator')}</span></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.forTeachers')}</h3>
            <ul className="space-y-2 mb-6">
              <li><Link to="/teacher" className="hover:text-[#1d1d1f] hover:underline">{t('footer.teacherPortal')}</Link></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.groupStats')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.createTasks')}</span></li>
            </ul>

            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.forInstitutions')}</h3>
            <ul className="space-y-2">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.englevForSchools')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.partnership')}</span></li>
            </ul>
          </div>

          {/* Column 5 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.values')}</h3>
            <ul className="space-y-2 mb-6">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.accessibility')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.educationFirst')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.privacy')}</span></li>
            </ul>

            <h3 className="text-[#1d1d1f] font-semibold mb-2">{t('footer.about')}</h3>
            <ul className="space-y-2">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.newsroom')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.leadership')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.careers')}</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">{t('footer.contact')}</span></li>
            </ul>
          </div>
        </div>

        {/* Mobile Accordion Placeholder */}
        <div className="md:hidden flex flex-col gap-2 pb-5 border-b border-[#d2d2d7]">
          <p className="text-[#1d1d1f] font-semibold">{t('footer.quickLinks')}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/practice" className="hover:underline">{t('footer.practice')}</Link>
            <Link to="/my-results" className="hover:underline">{t('footer.results')}</Link>
            <Link to="/vocabulary" className="hover:underline">{t('footer.wordbank')}</Link>
            <Link to="/settings" className="hover:underline">{t('footer.settings')}</Link>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[#6e6e73]">
          <div>
            {t('footer.contactInfo')}
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#d2d2d7] flex flex-col md:flex-row md:items-center justify-between gap-3 text-[#6e6e73]">
          <p>Copyright © 2026 Englev Inc. {t('footer.rightsReserved')}</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="hover:text-[#1d1d1f] cursor-pointer hover:underline">{t('footer.privacyPolicy')}</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">{t('footer.termsOfUse')}</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">{t('footer.salesAndPayments')}</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">{t('footer.legalInfo')}</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">{t('footer.sitemap')}</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setLang(lang === 'uz' ? 'en' : 'uz')} 
              className="hover:text-[#1d1d1f] cursor-pointer hover:underline text-left font-semibold"
            >
              {lang === 'uz' ? 'English' : "O'zbekcha"}
            </button>
            <span className="text-[#d2d2d7]">|</span>
            <p className="hover:text-[#1d1d1f] cursor-pointer hover:underline">{t('footer.country')}</p>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default SiteFooter;
