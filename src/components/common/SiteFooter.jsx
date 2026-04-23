import React from 'react';
import { Link } from 'react-router-dom';

const SiteFooter = () => {
  return (
    <footer className="bg-[#f5f5f7] border-t border-[#d2d2d7] text-[#424245] text-[12px] font-sans pt-10 pb-6 w-full">
      <div className="max-w-[980px] mx-auto px-4 md:px-6">

        {/* Footnotes / Top info */}
        <div className="border-b border-[#d2d2d7] pb-4 mb-5 text-[11px] leading-snug text-[#6e6e73]">
          <p>
            Englev Premium obunasi orqali siz barcha Mock testlar va ilg'or tahlillarga ega bo'lasiz. Narxlar va shartlar o'zgarishi mumkin.
          </p>
        </div>

        {/* Desktop Columns */}
        <div className="hidden md:flex flex-wrap justify-between pb-4">
          {/* Column 1 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">O'rganish va Mashq</h3>
            <ul className="space-y-2 mb-6">
              <li><Link to="/practice?tab=reading" className="hover:text-[#1d1d1f] hover:underline">Reading</Link></li>
              <li><Link to="/practice?tab=listening" className="hover:text-[#1d1d1f] hover:underline">Listening</Link></li>
              <li><Link to="/practice?tab=writing" className="hover:text-[#1d1d1f] hover:underline">Writing</Link></li>
              <li><Link to="/practice?tab=speaking" className="hover:text-[#1d1d1f] hover:underline">Speaking</Link></li>
              <li><Link to="/vocabulary" className="hover:text-[#1d1d1f] hover:underline">WordBank</Link></li>
              <li><Link to="/practice?tab=mock" className="hover:text-[#1d1d1f] hover:underline">Mock Exams</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#1d1d1f] hover:underline">Podcasts</Link></li>
            </ul>
          </div>

          {/* Column 2 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">Hisob</h3>
            <ul className="space-y-2 mb-6">
              <li><Link to="/settings" className="hover:text-[#1d1d1f] hover:underline">Sozlamalar</Link></li>
              <li><Link to="/my-results" className="hover:text-[#1d1d1f] hover:underline">Mening natijalarim</Link></li>
              <li><Link to="/dashboard" className="hover:text-[#1d1d1f] hover:underline">Sevimlilar</Link></li>
              <li><Link to="/leaderboard" className="hover:text-[#1d1d1f] hover:underline">Reyting</Link></li>
            </ul>

            <h3 className="text-[#1d1d1f] font-semibold mb-2">Premium</h3>
            <ul className="space-y-2">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Obunani yangilash</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Ruxsat kalitini kiritish</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Narxlar</span></li>
            </ul>
          </div>

          {/* Column 3 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">Manbalar</h3>
            <ul className="space-y-2 mb-6">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Blog</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Video darslar</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">O'qish bo'yicha maslahatlar</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Muvaffaqiyat tarixi</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">IELTS kalkulyatori</span></li>
            </ul>
          </div>

          {/* Column 4 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">O'qituvchilar uchun</h3>
            <ul className="space-y-2 mb-6">
              <li><Link to="/teacher" className="hover:text-[#1d1d1f] hover:underline">O'qituvchi portali</Link></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Guruh statistikasi</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Vazifalar yaratish</span></li>
            </ul>

            <h3 className="text-[#1d1d1f] font-semibold mb-2">Muassasalar uchun</h3>
            <ul className="space-y-2">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Maktablar uchun Englev</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Hamkorlik dasturi</span></li>
            </ul>
          </div>

          {/* Column 5 */}
          <div className="w-[18%]">
            <h3 className="text-[#1d1d1f] font-semibold mb-2">Englev Qadriyatlari</h3>
            <ul className="space-y-2 mb-6">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Foydalanish imkoniyati</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Ta'lim birinchi o'rinda</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Maxfiylik</span></li>
            </ul>

            <h3 className="text-[#1d1d1f] font-semibold mb-2">Englev Haqida</h3>
            <ul className="space-y-2">
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Yangiliklar xonasi</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Rahbariyat</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Karyera imkoniyatlari</span></li>
              <li><span className="cursor-pointer hover:text-[#1d1d1f] hover:underline">Bog'lanish</span></li>
            </ul>
          </div>
        </div>

        {/* Mobile Accordion Placeholder (Simplified for demonstration) */}
        <div className="md:hidden flex flex-col gap-2 pb-5 border-b border-[#d2d2d7]">
          {/* In a real Apple footer, these are accordions. For brevity, displaying inline list or simplified */}
          <p className="text-[#1d1d1f] font-semibold">Tezkor havolalar</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/practice" className="hover:underline">Amaliyot</Link>
            <Link to="/my-results" className="hover:underline">Natijalar</Link>
            <Link to="/vocabulary" className="hover:underline">WordBank</Link>
            <Link to="/settings" className="hover:underline">Sozlamalar</Link>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="pt-4 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[#6e6e73]">
          <div>
            Biz bilan bog'lanish uchun: <span className="text-[#0066cc] cursor-pointer hover:underline">O'quv markaz topish</span> yoki qo'ng'iroq qiling <span className="text-[#1d1d1f]">+998 91 518 18 44</span>.
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-[#d2d2d7] flex flex-col md:flex-row md:items-center justify-between gap-3 text-[#6e6e73]">
          <p>Copyright © 2026 Englev Inc. Barcha huquqlar himoyalangan.</p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            <span className="hover:text-[#1d1d1f] cursor-pointer hover:underline">Maxfiylik siyosati</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">Foydalanish shartlari</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">Savdo va to'lovlar</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">Yuridik ma'lumotlar</span>
            <span className="border-l border-[#d2d2d7] pl-3 hover:text-[#1d1d1f] cursor-pointer hover:underline">Sayt xaritasi</span>
          </div>
          <p className="hover:text-[#1d1d1f] cursor-pointer hover:underline">O'zbekiston</p>
        </div>

      </div>
    </footer>
  );
};

export default SiteFooter;
