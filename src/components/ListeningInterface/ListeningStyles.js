export const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root { 
    --ielts-blue: #2563eb; 
    --ielts-bg: #ffffff; 
    --text-primary: #000000; 
    --text-secondary: #000000;
    --border-color: #e5e7eb;
    --highlight-yellow: #fef08a;
  }
  
  .text-small { --dynamic-font: 14px; }
  .text-medium { --dynamic-font: 16px; }
  .text-large { --dynamic-font: 18px; }

  .ielts-container { position: absolute; top: 0; left: 0; right: 0; bottom: 0; width: 100%; height: 100%; z-index: 10; display: flex; flex-direction: column; font-family: 'Inter', sans-serif; background: var(--ielts-bg); overflow: hidden; }
  .fullscreen-btn { position: absolute; top: 10px; right: 20px; z-index: 60; background: white; border: 1px solid #e5e7eb; padding: 4px 10px; border-radius: 20px; cursor: pointer; font-size: 11px; font-weight: 600; color: #000000; box-shadow: 0 2px 4px rgba(0,0,0,0.05); display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
  .fullscreen-btn:hover { background: #f9fafb; transform: translateY(-1px); }
  .layout-test { flex: 1; overflow-y: auto; background: #fff; width: 100%; display: block; padding-bottom: 60px; }
  .test-wrapper { width: 100%; max-width: 100%; margin: 0; padding: 20px 40px; box-sizing: border-box; text-align: left; user-select: text !important; }
  .layout-review { display: flex; flex: 1; overflow: hidden; position: relative; width: 100%; }
  .review-left { background: white; display: flex; flex-direction: column; border-right: 1px solid #e5e7eb; overflow-y: auto; padding: 15px; position: relative; }
  .review-right { flex: 1; display: flex; flex-direction: column; overflow-y: auto; position: relative; background: #ffffff; }
  .review-wrapper { padding: 15px; text-align: left; user-select: text !important; }
  .resizer { width: 6px; background: #f3f4f6; cursor: col-resize; display: flex; justify-content: center; align-items: center; z-index: 10; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; transition: background 0.2s; }
  .resizer:hover { background: #d1d5db; }
  
  /* Transcript Styles */
  .transcript-content { font-family: 'Georgia', serif; line-height: 1.6; font-size: 15px; color: #000000; user-select: text; }
  .transcript-header { font-weight: 700; color: #000000; margin-bottom: 10px; text-transform: uppercase; font-size: 11px; letter-spacing: 1px; padding-bottom: 8px; border-bottom: 1px solid #eee; }
  
  .section-header { font-size: 18px; font-weight: 800; color: #000000; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #f3f4f6; letter-spacing: -0.02em; }
  .q-block { margin-bottom: 15px; animation: fadeIn 0.3s ease-in; width: 100%; }
  .instruction-box { background: #eff6ff; border: 1px solid #dbeafe; color: #1e40af; padding: 8px 12px; margin-bottom: 10px; font-weight: 600; border-radius: 6px; font-size: 14px; width: 100%; box-sizing: border-box; user-select: text; }
  .question-row { margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px dashed #f3f4f6; width: 100%; }
  .question-row:last-child { border-bottom: none; }
  
  /* INPUT & NUMBERS */
  .q-num-inline { display: inline-flex; align-items: center; justify-content: center; background: #f3f4f6; color: #000000; border: 1px solid #e5e7eb; min-width: 20px; height: 20px; padding: 0 4px; border-radius: 4px; font-weight: 700; font-size: 11px; margin-right: 3px; cursor: pointer; vertical-align: middle; user-select: none; flex-shrink: 0; }
  .q-num-inline:hover { background: #000000; color: #fff; border-color: #000000; }
  .q-content { line-height: 1.6; font-size: var(--dynamic-font); color: #000000; font-weight: 500; width: 100%; user-select: text; }
  input.ielts-input { border: 1px solid #9ca3af; background: #fff; color: #000000; padding: 4px 8px; font-size: var(--dynamic-font); border-radius: 4px; font-weight: 700; width: 150px; height: 34px; margin: 0 6px; transition: all 0.2s; vertical-align: middle; }
  input.ielts-input:focus { border-color: #000000; outline: none; box-shadow: 0 0 0 2px rgba(0,0,0,0.1); }
  .correct-input { border-color: #16a34a !important; background: #f0fdf4 !important; color: #15803d !important; }
  .wrong-input { border-color: #dc2626 !important; background: #fef2f2 !important; color: #b91c1c !important; }
  
  /* CHOICES */
  .option-row { display: flex; align-items: start; gap: 10px; padding: 6px 10px; border-radius: 6px; border: 1px solid transparent; transition: all 0.2s; margin-bottom: 4px; font-size: var(--dynamic-font); width: 100%; color: #000000; font-weight: 500; }
  .option-row:hover { background: #f9fafb; border-color: #e5e7eb; }
  .option-input { margin-top: 4px; accent-color: #000000; width: 16px; height: 16px; cursor: pointer; flex-shrink: 0; }
  .option-text { cursor: text; user-select: text; flex: 1; }
  .correct-option { background-color: #f0fdf4; border: 1px solid #16a34a; }
  
  /* IMAGES & MAPS */
  .map-container { text-align: center; margin-bottom: 15px; border: 1px solid #e5e7eb; padding: 10px; border-radius: 8px; background: #f9fafb; display: flex; justify-content: center; }
  .map-image { max-width: 100%; height: auto; max-height: 350px; object-fit: contain; border-radius: 4px; }
  
  /* Dropdown (Select) */
  .ielts-select {
      appearance: none; border: 1px solid #d1d5db; padding: 4px 30px 4px 10px; font-size: 14px; font-weight: 700; color: #000000; background-color: #fff; border-radius: 6px; cursor: pointer; height: 32px; margin-left: 6px; vertical-align: middle; min-width: 80px;
      background-image: url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23111827%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E");
      background-repeat: no-repeat; background-position: right 10px top 50%; background-size: 10px auto; transition: border-color 0.2s;
  }
  .ielts-select:focus { border-color: #2563eb; outline: none; }
  .ielts-select:disabled { background-color: #f3f4f6; color: #9ca3af; }
  
  /* Matching Box */
  .static-options-box { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; padding: 15px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; }
  .static-option-item { background: white; border: 1px solid #e2e8f0; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 600; color: #334155; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }

  /* Table */
  .table-wrapper { overflow-x: auto; margin-bottom: 20px; border: 1px solid #000000; border-radius: 0; background: #fff; width: 100%; }
  .ielts-table { width: 100%; border-collapse: collapse; font-size: var(--dynamic-font); min-width: 600px; }
  .ielts-table th { background: #f3f4f6; color: #000000; padding: 12px 15px; text-align: left; font-weight: 800; border: 1px solid #000000; }
  .ielts-table td { border: 1px solid #000000; padding: 12px 15px; vertical-align: top; color: #000000; line-height: 1.6; }
  .ielts-table tr:hover td { background-color: #f9fafb; }

  /* Footer */
  footer { height: 50px; background: white; border-top: 1px solid #e5e7eb; display: flex; align-items: center; padding: 0 20px; flex-shrink: 0; justify-content: space-between; gap: 16px; z-index: 50; position: absolute; bottom: 0; left: 0; right: 0; }
  .part-switcher { display: flex; gap: 4px; background: #f3f4f6; padding: 2px; border-radius: 6px; }
  .part-btn { padding: 5px 12px; background: transparent; border: none; color: #6b7280; font-weight: 600; font-size: 12px; cursor: pointer; border-radius: 4px; transition: all 0.2s; }
  .part-btn:hover { color: #000000; background: rgba(255,255,255,0.8); }
  .part-btn.active { background: white; color: #000000; box-shadow: 0 1px 2px rgba(0,0,0,0.1); }
  .nav-questions { display: flex; gap: 3px; overflow-x: auto; padding: 2px; scrollbar-width: none; }
  .nav-btn { width: 28px; height: 28px; background: white; color: #6b7280; border: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: center; cursor: pointer; border-radius: 4px; font-weight: 700; font-size: 11px; flex-shrink: 0; transition: all 0.2s; }
  .nav-btn:hover { border-color: #000000; color: #000000; }
  .nav-btn.answered { background: #000000; color: white; border-color: #000000; }
  .nav-btn.flagged { border-color: #f59e0b; color: #f59e0b; background: #fffbeb; }
  
  /* Highlight */
  .test-wrapper, .review-wrapper, .q-content, .question-row { user-select: text !important; -webkit-user-select: text !important; -moz-user-select: text !important; -ms-user-select: text !important; }
  .highlight-span { background-color: #fef08a; border-bottom: 2px solid #facc15; cursor: pointer; padding: 1px 0; }
  .highlight-span:hover { background-color: #fde047; }
  .evidence-highlight { background-color: #86efac; transition: background 0.5s; padding: 2px 0; }
  .floating-menu { position: absolute; background: #1f2937; padding: 4px; border-radius: 6px; display: flex; gap: 6px; z-index: 999999; transform: translateX(-50%); box-shadow: 0 4px 6px rgba(0,0,0,0.3); pointer-events: auto; user-select: none; }
  .float-btn { background: none; border: none; color: white; cursor: pointer; font-size: 11px; font-weight: 600; padding: 4px 8px; display: inline-block; }
  .float-btn:hover { background-color: rgba(255,255,255,0.1); border-radius: 4px; }
`;