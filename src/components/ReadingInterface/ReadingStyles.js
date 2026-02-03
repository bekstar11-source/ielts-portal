// src/components/ReadingInterface/ReadingStyles.js

export const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root { 
    --ielts-blue: #2563eb; 
    --ielts-bg: #f3f4f6;
    --text-primary: #000000;
    --text-secondary: #374151;
    --border-color: #e5e7eb;
    --highlight-yellow: #fef08a;
    --footer-height: 50px; 
  }
  
  /* =========================================
     1. GLOBAL LAYOUT
     ========================================= */
  .ielts-container { 
      display: flex; 
      flex-direction: column;
      height: 100vh; 
      width: 100vw;
      font-family: 'Inter', sans-serif; 
      background: var(--ielts-bg); 
      color: var(--text-primary);
      position: relative;
      overflow: hidden;
      padding-bottom: var(--footer-height); 
  }
  
  /* =========================================
     2. SELECTION RULES (CRITICAL FOR HIGHLIGHTING)
     ========================================= */
  .passage-content, .q-area, .q-group, .q-item, .instruction, .static-options-box, label, span, div, p, strong, em, li {
      -webkit-user-select: text !important;
      -moz-user-select: text !important;
      -ms-user-select: text !important;
      user-select: text !important;
      cursor: text;
  }
  
  button, input, select, .nav-btn, .fullscreen-btn, .q-num, .inline-q-num {
      user-select: none !important;
  }

  ::selection { background: #bfdbfe; color: #1e3a8a; }

  /* =========================================
     3. SPLIT PANELS
     ========================================= */
  .split-pane { 
      display: flex; 
      width: 100%;
      height: 100%;       
      overflow: hidden;   
      position: relative;
  }
  
  .pane-left { 
      background: white; 
      display: flex; 
      flex-direction: column; 
      border-right: 1px solid var(--border-color); 
      position: relative; 
      height: 100%; 
      overflow-y: auto; 
  }
  
  .pane-right { 
      flex: 1; 
      background: #f8fafc; 
      display: flex; 
      flex-direction: column; 
      overflow-y: auto; 
      position: relative; 
      height: 100%;
  }
  
  .resizer { 
      width: 6px; 
      background: #f3f4f6; 
      cursor: col-resize; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      border-left: 1px solid #e5e7eb; 
      border-right: 1px solid #e5e7eb; 
      z-index: 10; 
      transition: background 0.2s; 
      flex-shrink: 0;
      user-select: none;
  }
  .resizer:hover { background: #d1d5db; }
  
  /* =========================================
     4. TEXT SIZES & CONTENT
     ========================================= */
  .text-sm { font-size: 14px !important; line-height: 1.6 !important; }
  .text-md { font-size: 16px !important; line-height: 1.8 !important; }
  .text-lg { font-size: 18px !important; line-height: 2.0 !important; }
  .text-xl { font-size: 20px !important; line-height: 2.2 !important; }

  .passage-content { 
      flex: 1; padding: 65px; overflow-y: auto; color: #000000;
      outline: none; scroll-behavior: smooth; font-size: 16px; 
  }

  /* 🔥 O'ZGARTIRILDI: SARLAVHA KATTALASHTIRILDI */
  .passage-content h1 { 
      font-size: 32px !important;  /* Oldin 24px edi */
      font-weight: 900 !important; /* Juda qalin (Extra Bold) */
      margin-bottom: 20px; 
      line-height: 1.3;
      color: #111827;
      letter-spacing: -0.03em;
  }

  /* 🔥 Kichik sarlavhalar ham kattalashtirildi */
  .passage-content h2 { 
      font-size: 24px !important; 
      font-weight: 800 !important; 
      margin-top: 30px; 
      margin-bottom: 15px; 
      color: #374151;
  }

  .passage-content p { margin-bottom: 1em; } 

  .q-area { 
      padding: 32px; 
      background: #fff; 
      color: #000000; 
      font-size: 16px; 
      min-height: 100%; 
      padding-bottom: 120px !important;
  }
  .q-group { margin-bottom: 32px; border-bottom: 1px solid #f3f4f6; padding-bottom: 80px; }
  .instruction { background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px 16px; margin-bottom: 20px; border-radius: 8px; font-weight: 600; font-size: 0.9em; }
  
  /* =========================================
     5. COMPONENTS (YANGILANGAN DIZAYN)
     ========================================= */
  
  /* Savol qatori */
  .q-item { 
      display: flex; 
      gap: 6px; /* Raqam va matn orasidagi masofa juda yaqin */
      margin-bottom: 16px; 
      align-items: flex-start; 
  }
  
  /* Savol Raqami (Chapdagi) - OQ FON, KVADRAT */
  .q-num { 
      width: 26px; 
      height: 26px; 
      border-radius: 4px; 
      background: #fff; /* Oq fon */
      border: 1px solid #d1d5db; /* Oddiy kulrang ramka */
      display: flex; 
      align-items: center; 
      justify-content: center; 
      font-weight: 600; 
      font-size: 13px; 
      color: #374151; 
      flex-shrink: 0; 
      cursor: pointer; 
      transition: all 0.2s;
      margin-top: 2px; /* Matn bilan to'g'rilash uchun ozgina pastga */
  }
  .q-num:hover { border-color: #2563eb; color: #2563eb; }

  /* Input (Yozadigan joy) */
  .ielts-input { 
      border: 1px solid #d1d5db; 
      padding: 4px 8px; 
      width: 140px; 
      font-weight: 600; 
      color: #000000; 
      font-size: 14px; 
      border-radius: 4px; 
      height: 30px; 
      margin: 0 4px 0 2px; /* Chapdagi margin minimal (2px) */
      background: #fff; 
      vertical-align: middle;
  }
  .ielts-input:focus { border-color: #2563eb; outline: none; }

  /* Dropdown (Select) */
  .ielts-select {
      appearance: none; border: 1px solid #d1d5db; padding: 4px 30px 4px 10px;
      font-size: 14px; font-weight: 600; color: #000000; background-color: #fff;
      border-radius: 4px; cursor: pointer; min-width: 80px; max-width: 100%;
      height: 30px; margin: 2px; vertical-align: middle;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23111827%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat; background-position: right 8px top 50%; background-size: 8px auto; 
  }
  
  /* Inline Savol Raqami (Inputni yonidagisi) - .q-num BILAN BIR XIL */
  .inline-q-num {
      display: inline-flex; 
      align-items: center; 
      justify-content: center;
      width: 26px; height: 26px; 
      background: #fff; /* Oq fon */
      border: 1px solid #d1d5db; 
      border-radius: 4px; 
      font-size: 13px; font-weight: 600; color: #374151;
      margin-right: 4px; /* Inputga juda yaqin */
      vertical-align: middle; cursor: pointer;
      user-select: none; transition: all 0.2s;
  }
  .inline-q-num:hover { border-color: #2563eb; color: #2563eb; }

  /* Options Box (Matching Heading va boshqalar uchun) */
  .static-options-box { margin-bottom: 24px; padding: 10px 0; }
  .static-option-item { font-size: 0.9em; font-weight: 500; color: #374151; line-height: 1.4; margin-bottom: 4px; display: block; }
  
  /* Highlight Tools */
  .highlight-span { background-color: var(--highlight-yellow); cursor: pointer; mix-blend-mode: multiply; border-radius: 2px; }
  .evidence-highlight { background-color: #86efac; transition: background 0.5s; padding: 2px 0; }

  .floating-menu { 
      position: fixed; background: #1f2937; padding: 6px; border-radius: 8px; 
      display: flex; gap: 8px; z-index: 9999; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); 
      transform: translateX(-50%);
  }
  .float-btn { background: none; border: none; color: white; cursor: pointer; font-size: 12px; font-weight: 600; padding: 4px 8px; }

  .resume-overlay {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: rgba(255, 255, 255, 0.95); z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(5px);
  }
  .resume-card {
      background: white; padding: 40px; border-radius: 16px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      border: 1px solid #e5e7eb; text-align: center; max-width: 400px; width: 90%;
  }
  .resume-btn {
      width: 100%; padding: 12px; margin-top: 12px; border-radius: 8px;
      font-weight: 600; cursor: pointer; transition: all 0.2s;
  }
  .btn-primary { background: #2563eb; color: white; border: none; }
  .btn-primary:hover { background: #1d4ed8; }
  .btn-outline { background: white; color: #ef4444; border: 1px solid #fca5a5; }
  .btn-outline:hover { background: #fef2f2; }

  .fullscreen-btn { 
      position: absolute; top: 15px; right: 20px; z-index: 50; 
      background: white; border: 1px solid #e5e7eb; padding: 6px 12px; 
      border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 600; 
      color: #4b5563; display: flex; align-items: center; gap: 6px; 
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  /* =========================================
     6. FOOTER STYLES (FIXED 50px)
     ========================================= */
  .ielts-footer {
    position: fixed; 
    bottom: 0;
    left: 0;
    width: 100%;
    height: var(--footer-height); /* 50px */
    background: #fff;
    border-top: 1px solid #e5e7eb;
    display: flex;
    align-items: center;
    padding: 0;
    box-sizing: border-box;
    z-index: 2000;
    box-shadow: 0 -4px 6px -1px rgba(0, 0, 0, 0.05);
  }

  .footer-tabs { display: flex; width: 100%; height: 100%; }

  .footer-passage-block {
    display: flex; align-items: center; padding: 0 16px; cursor: pointer;
    border-right: 1px solid #e5e7eb; transition: all 0.2s;
    background: #f9fafb; opacity: 0.7; height: 100%; min-width: fit-content;
  }
  .footer-passage-block:hover { opacity: 0.9; background: #f3f4f6; }
  .footer-passage-block.active {
    opacity: 1; background: #fff; flex: 1; border-top: 3px solid #2563eb; margin-top: -1px;
  }

  .passage-label { display: flex; flex-direction: column; margin-right: 16px; justify-content: center; }
  .passage-label span { font-weight: 700; font-size: 13px; color: #111827; line-height: 1.1; }
  .passage-label small { font-size: 10px; color: #6b7280; font-weight: 500; }

  .questions-grid {
    display: flex; gap: 4px; height: 100%; align-items: center;
    overflow-x: auto; padding: 0 8px; scrollbar-width: none;
  }
  .questions-grid::-webkit-scrollbar { display: none; }

  .q-nav-btn {
    width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;
    border: 1px solid #d1d5db; background: #fff; border-radius: 4px;
    font-size: 11px; font-weight: 600; color: #374151; cursor: pointer; flex-shrink: 0;
  }
  .q-nav-btn:hover { border-color: #2563eb; color: #2563eb; transform: translateY(-1px); }
  .q-nav-btn.answered { background: #2563eb; color: #fff; border-color: #2563eb; }
`;