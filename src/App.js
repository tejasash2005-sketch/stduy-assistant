import { useState, useEffect, useRef, useCallback, useMemo } from "react";

// ── Ollama AI ──────────────────────────────────────────────────────────────────
async function callAI(systemPrompt, userMessage, history = [], stream = false, onChunk = null) {
  const msgs = [];

  for (const h of history) {
    msgs.push({
      role: h.role === "assistant" ? "assistant" : "user",
      content: h.content,
    });
  }

  msgs.push({ role: "user", content: userMessage });

  try {
    const res = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3.1:8b", // ✅ FIXED MODEL
        stream: !!onChunk,
        messages: [
          { role: "system", content: systemPrompt || "You are a helpful AI assistant." },
          ...msgs,
        ],
        options: {
          temperature: 0.3,
          num_predict: 200,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    // 🔥 STREAM MODE
    if (onChunk) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split("\n").filter(Boolean);

        for (const line of lines) {
          try {
            const json = JSON.parse(line);
            const chunk = json.message?.content || "";
            full += chunk;
            onChunk(full);
          } catch (e) {
            console.warn("Chunk parse error:", e);
          }
        }
      }

      return full;
    }

    // 🔥 NORMAL MODE
    const data = await res.json();

    if (!data || !data.message || !data.message.content) {
      return "⚠️ Empty response from model";
    }

    return data.message.content.trim();

  } catch (e) {
    console.error("AI ERROR:", e);

    return `⚠️ Cannot reach Ollama or model issue.

Make sure:
1. Ollama is running → run: ollama serve
2. Model exists → run: ollama list
3. Using correct model (llama3.1:8b)

Error: ${e.message}`;
  }
}

// ── CSS ────────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --bg:#060811;--bg2:#0b0d1a;--bg3:#10121f;--surface:#161826;--surface2:#1c1e2f;
  --border:rgba(255,255,255,0.06);--border2:rgba(255,255,255,0.12);
  --accent:#7c5cfc;--accent2:#a78bfa;--accent3:#06d6a0;
  --gold:#fbbf24;--green:#22c55e;--red:#f43f5e;--blue:#38bdf8;--pink:#f472b6;
  --text:#f0f1fc;--text2:#8b8da8;--text3:#3f4060;
  --r:14px;--r2:8px;--r3:20px;
}
html,body,#root{height:100%;}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);font-size:13.5px;line-height:1.6;overflow:hidden;}
h1,h2,h3,h4,h5{font-family:'Syne',sans-serif;line-height:1.2;}
::-webkit-scrollbar{width:3px;}::-webkit-scrollbar-thumb{background:var(--surface2);border-radius:2px;}

/* ── LAYOUT ── */
.app{display:flex;height:100vh;overflow:hidden;}
.sidebar{width:226px;min-width:226px;background:var(--bg2);border-right:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;}
.sidebar-inner{padding:16px 0;display:flex;flex-direction:column;min-height:100%;}
.logo{padding:0 16px 18px;border-bottom:1px solid var(--border);margin-bottom:10px;}
.logo-mark{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;background:linear-gradient(135deg,var(--accent2),var(--accent3));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.logo-sub{font-size:8.5px;color:var(--text3);letter-spacing:2.5px;text-transform:uppercase;font-family:'JetBrains Mono',monospace;}
.nav-section{padding:0 8px;margin-bottom:4px;}
.nav-label{font-size:8px;letter-spacing:2.5px;text-transform:uppercase;color:var(--text3);padding:0 8px;margin-bottom:4px;font-family:'JetBrains Mono',monospace;}
.nav-item{display:flex;align-items:center;gap:8px;padding:7px 9px;border-radius:var(--r2);cursor:pointer;color:var(--text2);font-size:12.5px;font-weight:500;transition:all .15s;}
.nav-item:hover{background:var(--surface);color:var(--text);}
.nav-item.active{background:linear-gradient(135deg,rgba(124,92,252,0.2),rgba(6,214,160,0.06));color:var(--accent2);border:1px solid rgba(124,92,252,0.25);}
.nav-item .icon{font-size:14px;width:17px;text-align:center;}
.badge{margin-left:auto;background:var(--accent);color:#fff;font-size:7.5px;font-weight:700;padding:1px 6px;border-radius:10px;font-family:'JetBrains Mono',monospace;}
.badge-new{background:var(--red);}
.sidebar-footer{margin-top:auto;padding:12px 14px 0;border-top:1px solid var(--border);}
.user-pill{display:flex;align-items:center;gap:8px;background:var(--surface);border-radius:var(--r2);padding:8px 9px;cursor:pointer;border:1px solid var(--border);transition:all .15s;}
.user-pill:hover{border-color:var(--border2);}
.avatar{width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent3));display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;flex-shrink:0;font-family:'JetBrains Mono',monospace;}
.user-name{font-size:12px;font-weight:600;}
.user-role{font-size:9.5px;color:var(--text3);font-family:'JetBrains Mono',monospace;}

.main{flex:1;overflow:hidden;display:flex;flex-direction:column;}
.topbar{display:flex;align-items:center;justify-content:space-between;padding:11px 22px;border-bottom:1px solid var(--border);background:rgba(6,8,17,0.92);position:sticky;top:0;z-index:10;backdrop-filter:blur(20px);flex-shrink:0;}
.topbar-left{display:flex;align-items:center;gap:12px;}
.topbar-title{font-size:14.5px;font-weight:700;font-family:'Syne',sans-serif;}
.topbar-actions{display:flex;align-items:center;gap:7px;}
.page-scroll{flex:1;overflow-y:auto;}
.page-content{padding:20px 22px;}

/* ── BUTTONS ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:var(--r2);border:none;cursor:pointer;font-family:'Inter',sans-serif;font-size:12.5px;font-weight:500;transition:all .15s;}
.btn-primary{background:var(--accent);color:#fff;box-shadow:0 0 20px rgba(124,92,252,0.3);}
.btn-primary:hover{background:#8b6afd;transform:translateY(-1px);box-shadow:0 4px 24px rgba(124,92,252,0.45);}
.btn-secondary{background:var(--surface);color:var(--text);border:1px solid var(--border2);}
.btn-secondary:hover{background:var(--surface2);}
.btn-ghost{background:transparent;color:var(--text2);}
.btn-ghost:hover{color:var(--text);background:var(--surface);}
.btn-gold{background:rgba(251,191,36,0.1);color:var(--gold);border:1px solid rgba(251,191,36,0.25);}
.btn-green{background:rgba(34,197,94,0.1);color:var(--green);border:1px solid rgba(34,197,94,0.25);}
.btn-red{background:rgba(244,63,94,0.1);color:var(--red);border:1px solid rgba(244,63,94,0.25);}
.btn-sm{padding:5px 10px;font-size:11.5px;}
.btn-xs{padding:3px 8px;font-size:10.5px;}
.btn:disabled{opacity:.4;cursor:not-allowed;transform:none!important;}
.w-full{width:100%;}

/* ── CARDS ── */
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:16px;transition:border-color .2s;}
.card:hover{border-color:var(--border2);}
.card-accent{border-left:3px solid var(--accent);}

/* ── TAGS ── */
.tag{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:16px;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;}
.tag-purple{background:rgba(124,92,252,0.12);color:var(--accent2);}
.tag-blue{background:rgba(56,189,248,0.12);color:var(--blue);}
.tag-green{background:rgba(34,197,94,0.12);color:var(--green);}
.tag-gold{background:rgba(251,191,36,0.12);color:var(--gold);}
.tag-red{background:rgba(244,63,94,0.12);color:var(--red);}
.tag-pink{background:rgba(244,114,182,0.12);color:var(--pink);}
.tag-teal{background:rgba(6,214,160,0.12);color:var(--accent3);}

/* ── FORMS ── */
.input-group{margin-bottom:12px;}
.input-label{font-size:10.5px;color:var(--text2);margin-bottom:4px;display:block;font-weight:500;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1px;}
.input{width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:var(--r2);padding:9px 11px;color:var(--text);font-family:'Inter',sans-serif;font-size:13px;outline:none;transition:border-color .15s;}
.input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(124,92,252,0.1);}
select.input{cursor:pointer;}

/* ── PROGRESS ── */
.progress-bar{height:4px;background:var(--bg3);border-radius:3px;overflow:hidden;margin-top:5px;}
.progress-fill{height:100%;border-radius:3px;transition:width .7s ease;}

/* ── SPINNER ── */
.spinner{width:13px;height:13px;border:2px solid rgba(255,255,255,0.15);border-top-color:currentColor;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── ALERTS ── */
.alert{padding:10px 13px;border-radius:var(--r2);font-size:12.5px;margin-bottom:12px;display:flex;align-items:flex-start;gap:8px;}
.alert-info{background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);color:var(--blue);}
.alert-warn{background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.2);color:var(--gold);}
.alert-success{background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);color:var(--green);}
.alert-error{background:rgba(244,63,94,0.08);border:1px solid rgba(244,63,94,0.2);color:var(--red);}

/* ── TOAST ── */
.toast-container{position:fixed;bottom:18px;right:18px;z-index:999;display:flex;flex-direction:column;gap:7px;pointer-events:none;}
.toast{background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r2);padding:10px 14px;min-width:220px;font-size:12.5px;display:flex;align-items:center;gap:7px;animation:slideIn .3s ease;box-shadow:0 8px 28px rgba(0,0,0,0.5);}
@keyframes slideIn{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}
@keyframes fadeOut{to{transform:translateX(40px);opacity:0}}
.toast.hiding{animation:fadeOut .3s ease forwards;}

/* ── AI CONTENT ── */
.ai-content{font-size:13px;line-height:1.8;}
.ai-content p{margin-bottom:9px;}.ai-content p:last-child{margin-bottom:0;}
.ai-content strong{color:var(--accent2);font-weight:600;}
.ai-content ul,.ai-content ol{padding-left:18px;margin-bottom:9px;}
.ai-content li{margin-bottom:4px;}
.ai-content code{background:var(--bg3);padding:1px 5px;border-radius:4px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--accent3);}
.ai-content h3{font-size:14px;margin-bottom:6px;color:var(--accent2);font-family:'Syne',sans-serif;}
.ai-content blockquote{border-left:3px solid var(--accent);padding-left:10px;color:var(--text2);margin:8px 0;}

/* ── CHAT ── */
.chat-container{display:flex;flex-direction:column;height:calc(100vh - 57px);}
.chat-messages{flex:1;overflow-y:auto;padding:14px 22px;display:flex;flex-direction:column;gap:12px;}
.chat-input-area{padding:10px 22px 12px;border-top:1px solid var(--border);background:var(--bg);display:flex;gap:8px;align-items:flex-end;flex-shrink:0;}
.chat-textarea{flex:1;background:var(--surface);border:1px solid var(--border2);border-radius:10px;padding:9px 13px;color:var(--text);font-family:'Inter',sans-serif;font-size:13.5px;resize:none;min-height:40px;max-height:130px;outline:none;transition:border-color .15s;line-height:1.5;}
.chat-textarea:focus{border-color:var(--accent);}
.chat-textarea::placeholder{color:var(--text3);}
.msg{display:flex;gap:9px;max-width:86%;}
.msg.user{align-self:flex-end;flex-direction:row-reverse;}
.msg-av{width:28px;height:28px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:12px;}
.msg-av.ai{background:linear-gradient(135deg,var(--accent),var(--accent3));}
.msg-av.user{background:linear-gradient(135deg,#f59e0b,#ef4444);}
.msg-bubble{padding:9px 13px;border-radius:14px;font-size:13px;line-height:1.65;}
.msg.ai .msg-bubble{background:var(--surface2);border:1px solid var(--border);border-bottom-left-radius:3px;}
.msg.user .msg-bubble{background:var(--accent);color:#fff;border-bottom-right-radius:3px;}
.typing-dots{display:flex;gap:4px;padding:4px 0;}
.typing-dots span{width:5px;height:5px;border-radius:50%;background:var(--text3);display:block;animation:bounce 1.2s infinite;}
.typing-dots span:nth-child(2){animation-delay:.2s;}
.typing-dots span:nth-child(3){animation-delay:.4s;}
@keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-6px)}}

/* ── STATS ── */
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;position:relative;overflow:hidden;transition:all .2s;}
.stat-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:var(--accent-color,var(--accent));}
.stat-card:hover{transform:translateY(-1px);border-color:var(--border2);}
.stat-label{font-size:9.5px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;font-family:'JetBrains Mono',monospace;margin-bottom:7px;}
.stat-value{font-size:24px;font-weight:800;font-family:'Syne',sans-serif;line-height:1;}
.stat-change{font-size:10px;color:var(--green);margin-top:4px;font-family:'JetBrains Mono',monospace;}

/* ── UPLOAD ── */
.upload-zone{border:1.5px dashed var(--border2);border-radius:var(--r);padding:28px 20px;text-align:center;cursor:pointer;transition:all .2s;background:var(--bg3);}
.upload-zone:hover,.upload-zone.drag-over{border-color:var(--accent);background:rgba(124,92,252,0.05);}
.file-item{display:flex;align-items:center;gap:10px;padding:10px;background:var(--bg3);border-radius:var(--r2);border:1px solid var(--border);margin-bottom:7px;}
.file-meta{flex:1;min-width:0;}
.file-name{font-size:12.5px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.file-size{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;}
.file-status{font-size:10px;padding:2px 7px;border-radius:8px;font-weight:600;font-family:'JetBrains Mono',monospace;}
.status-processed{background:rgba(34,197,94,0.12);color:var(--green);}
.status-processing{background:rgba(251,191,36,0.12);color:var(--gold);}

/* ── TABS ── */
.tabs{display:flex;gap:2px;background:var(--bg3);padding:3px;border-radius:var(--r2);margin-bottom:16px;width:fit-content;flex-wrap:wrap;}
.tab{padding:6px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:500;color:var(--text2);transition:all .15s;white-space:nowrap;}
.tab.active{background:var(--surface2);color:var(--text);}
.tab:hover:not(.active){color:var(--text);}

/* ── GRIDS ── */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.grid-3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
.grid-4{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;}
.dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.dash-grid-3{display:grid;grid-template-columns:1.3fr 1fr 1fr;gap:12px;margin-bottom:12px;}
.flex{display:flex;}.items-center{align-items:center;}.gap-2{gap:8px;}.gap-1{gap:5px;}
.mb-1{margin-bottom:5px;}.mb-2{margin-bottom:10px;}.mb-3{margin-bottom:14px;}.mb-4{margin-bottom:18px;}
.mt-auto{margin-top:auto;}
.text-sm{font-size:12px;}.text-xs{font-size:10.5px;}
.text-muted{color:var(--text2);}.text-dim{color:var(--text3);}
.text-accent{color:var(--accent2);}.text-green{color:var(--green);}.text-gold{color:var(--gold);}.text-red{color:var(--red);}
.font-bold{font-weight:700;}.font-mono{font-family:'JetBrains Mono',monospace;}
.truncate{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* ── TEST ── */
.test-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);margin-bottom:16px;}
.timer{font-family:'JetBrains Mono',monospace;font-size:20px;font-weight:500;color:var(--gold);letter-spacing:2px;}
.q-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:20px;margin-bottom:12px;}
.q-text{font-size:14px;font-weight:500;margin-bottom:16px;line-height:1.7;}
.option{display:flex;align-items:center;gap:10px;padding:10px 13px;border:1px solid var(--border);border-radius:var(--r2);cursor:pointer;margin-bottom:6px;transition:all .15s;font-size:13px;}
.option:hover{border-color:var(--accent);background:rgba(124,92,252,0.05);}
.option.selected{border-color:var(--accent);background:rgba(124,92,252,0.1);color:var(--accent2);}
.option.correct{border-color:var(--green);background:rgba(34,197,94,0.08);color:var(--green);}
.option.wrong{border-color:var(--red);background:rgba(244,63,94,0.08);color:var(--red);}
.option-letter{width:22px;height:22px;border-radius:50%;background:var(--bg3);border:1px solid var(--border2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;flex-shrink:0;}

/* ── HOMEPAGE — SCROLLABLE ── */
.home-screen{height:100vh;overflow-y:auto;background:var(--bg);position:relative;}
.home-bg-fixed{position:fixed;inset:0;pointer-events:none;z-index:0;
  background:radial-gradient(ellipse at 15% 20%,rgba(124,92,252,0.14) 0%,transparent 55%),
             radial-gradient(ellipse at 85% 70%,rgba(6,214,160,0.09) 0%,transparent 50%),
             radial-gradient(ellipse at 50% 100%,rgba(124,92,252,0.06) 0%,transparent 40%);}
.home-nav{display:flex;align-items:center;justify-content:space-between;padding:16px 52px;position:sticky;top:0;z-index:100;background:rgba(6,8,17,0.88);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);}
.home-nav-links{display:flex;gap:28px;font-size:13.5px;color:var(--text2);}
.home-nav-links span{cursor:pointer;transition:color .15s;}
.home-nav-links span:hover{color:var(--text);}
.home-hero{position:relative;z-index:1;padding:80px 52px 60px;text-align:center;}
.home-badge{display:inline-flex;align-items:center;gap:7px;background:rgba(124,92,252,0.1);border:1px solid rgba(124,92,252,0.25);border-radius:20px;padding:5px 16px;font-size:11.5px;color:var(--accent2);font-family:'JetBrains Mono',monospace;margin-bottom:24px;}
.home-badge-dot{width:6px;height:6px;border-radius:50%;background:var(--accent3);animation:blink2 1.5s ease-in-out infinite;}
@keyframes blink2{0%,100%{opacity:1}50%{opacity:0.4}}
.home-title{font-family:'Syne',sans-serif;font-size:58px;font-weight:800;line-height:1.08;margin-bottom:20px;letter-spacing:-1px;}
.home-title .grad{background:linear-gradient(135deg,var(--accent2) 0%,var(--accent3) 60%,var(--blue) 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.home-subtitle{font-size:16.5px;color:var(--text2);max-width:560px;margin:0 auto 36px;line-height:1.75;}
.home-cta-row{display:flex;gap:12px;justify-content:center;margin-bottom:16px;}
.btn-hp{padding:13px 30px;border-radius:10px;font-size:14.5px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;border:none;transition:all .2s;}
.btn-hp-primary{background:var(--accent);color:#fff;box-shadow:0 0 36px rgba(124,92,252,0.4);}
.btn-hp-primary:hover{background:#8b6afd;transform:translateY(-2px);box-shadow:0 8px 48px rgba(124,92,252,0.55);}
.btn-hp-secondary{background:transparent;color:var(--text);border:1px solid var(--border2);}
.btn-hp-secondary:hover{border-color:var(--accent2);color:var(--accent2);}
.home-section{position:relative;z-index:1;padding:60px 52px;}
.home-section-label{font-size:9.5px;letter-spacing:3px;text-transform:uppercase;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-bottom:10px;}
.home-section-title{font-family:'Syne',sans-serif;font-size:36px;font-weight:700;margin-bottom:44px;text-align:center;}
.home-stats-bar{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:var(--border);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;position:relative;z-index:1;margin:0 52px 0;}
.home-stat-cell{background:var(--bg2);padding:28px 20px;text-align:center;}
.home-stat-num{font-family:'Syne',sans-serif;font-size:38px;font-weight:800;background:linear-gradient(135deg,var(--accent2),var(--accent3));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
.home-stat-label{font-size:12px;color:var(--text3);margin-top:5px;}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.feature-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:22px;transition:all .25s;position:relative;overflow:hidden;}
.feature-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--accent),var(--accent3));transform:scaleX(0);transform-origin:left;transition:transform .3s;}
.feature-card:hover{border-color:rgba(124,92,252,0.3);transform:translateY(-4px);box-shadow:0 16px 48px rgba(0,0,0,0.35);}
.feature-card:hover::before{transform:scaleX(1);}
.feature-icon{font-size:26px;margin-bottom:12px;}
.feature-name{font-size:14.5px;font-weight:700;font-family:'Syne',sans-serif;margin-bottom:6px;}
.feature-desc{font-size:12.5px;color:var(--text2);line-height:1.65;}
.modules-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px;}
.module-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:18px 14px;text-align:center;cursor:pointer;transition:all .2s;}
.module-card:hover{border-color:rgba(124,92,252,0.35);transform:translateY(-3px);box-shadow:0 10px 32px rgba(0,0,0,0.3);}
.module-icon{font-size:24px;margin-bottom:9px;}
.module-name{font-size:12px;font-weight:600;font-family:'Syne',sans-serif;margin-bottom:3px;}
.module-desc{font-size:10.5px;color:var(--text3);}
.testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
.t-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:20px;}
.t-stars{color:var(--gold);font-size:12px;margin-bottom:10px;}
.t-text{font-size:13px;color:var(--text2);line-height:1.7;margin-bottom:14px;font-style:italic;}
.t-author{display:flex;align-items:center;gap:10px;}
.t-av{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:#fff;}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;max-width:860px;margin:0 auto;}
.pricing-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:24px;transition:all .2s;}
.pricing-card.featured{border-color:rgba(124,92,252,0.4);background:linear-gradient(135deg,rgba(124,92,252,0.08),rgba(6,214,160,0.04));}
.pricing-card:hover{transform:translateY(-3px);}
.pricing-name{font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--text2);margin-bottom:12px;}
.pricing-price{font-family:'Syne',sans-serif;font-size:36px;font-weight:800;margin-bottom:4px;}
.pricing-period{font-size:11px;color:var(--text3);margin-bottom:18px;}
.pricing-feat{font-size:12.5px;color:var(--text2);padding:6px 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;}
.pricing-feat:last-of-type{border-bottom:none;}
.home-footer{position:relative;z-index:1;padding:28px 52px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;}
.ollama-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(6,214,160,0.1);border:1px solid rgba(6,214,160,0.25);border-radius:20px;padding:4px 12px;font-size:11px;color:var(--accent3);font-family:'JetBrains Mono',monospace;}

/* ── AUTH ── */
.auth-screen{height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);position:relative;overflow:hidden;}
.auth-bg{position:absolute;inset:0;background:radial-gradient(ellipse at 30% 40%,rgba(124,92,252,0.12) 0%,transparent 60%),radial-gradient(ellipse at 70% 60%,rgba(6,214,160,0.07) 0%,transparent 50%);}
.auth-card{background:var(--bg2);border:1px solid var(--border2);border-radius:18px;padding:36px 32px;width:390px;position:relative;z-index:1;box-shadow:0 24px 80px rgba(0,0,0,0.5);}
.auth-title{font-size:22px;font-weight:800;font-family:'Syne',sans-serif;text-align:center;margin-bottom:4px;}
.auth-sub{font-size:12px;color:var(--text3);text-align:center;margin-bottom:22px;}
.auth-switch{text-align:center;margin-top:14px;font-size:12px;color:var(--text3);}
.auth-switch a{color:var(--accent2);cursor:pointer;}

/* ── DASHBOARD SPECIFIC ── */
.hero-section{position:relative;padding:0 22px 20px;background:var(--bg);}
.hero-grid-bg{position:absolute;inset:0;pointer-events:none;background-image:linear-gradient(rgba(124,92,252,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(124,92,252,0.04) 1px,transparent 1px);background-size:30px 30px;mask-image:radial-gradient(ellipse 80% 60% at 50% 50%,black 0%,transparent 100%);}
.hero-content{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;padding-top:20px;}
.exam-countdown{display:inline-flex;align-items:center;gap:6px;background:rgba(244,63,94,0.1);border:1px solid rgba(244,63,94,0.22);border-radius:20px;padding:3px 11px;font-size:10.5px;color:var(--red);font-family:'JetBrains Mono',monospace;margin-bottom:10px;animation:pulseBorder 2s ease-in-out infinite;}
@keyframes pulseBorder{0%,100%{border-color:rgba(244,63,94,0.22)}50%{border-color:rgba(244,63,94,0.5)}}
.countdown-dot{width:5px;height:5px;border-radius:50%;background:var(--red);animation:blink 1s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}
.hero-greeting{font-family:'Syne',sans-serif;font-size:22px;font-weight:800;line-height:1.2;margin-bottom:7px;}
.hero-greeting span{color:var(--accent2);}
.hero-subtitle{font-size:12.5px;color:var(--text2);margin-bottom:14px;line-height:1.6;}
.hero-cta-row{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:12px;}
.score-ticker{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 14px;margin-bottom:9px;position:relative;overflow:hidden;}
.score-ticker::before{content:'';position:absolute;top:0;left:0;bottom:0;width:3px;background:var(--accent);}
.ticker-label{font-size:9px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:5px;}
.ticker-score{font-family:'Syne',sans-serif;font-size:30px;font-weight:800;color:var(--accent2);line-height:1;}
.ticker-bar-track{height:3px;background:var(--bg3);border-radius:2px;overflow:hidden;margin-top:7px;}
.ticker-bar{height:100%;border-radius:2px;background:linear-gradient(90deg,var(--accent),var(--accent3));transition:width .8s ease;}
.streak-card{background:linear-gradient(135deg,rgba(251,191,36,0.1),rgba(251,191,36,0.04));border:1px solid rgba(251,191,36,0.2);border-radius:var(--r);padding:12px 14px;display:flex;align-items:center;gap:10px;}
.streak-flame{font-size:26px;animation:flicker 1.5s ease-in-out infinite;}
@keyframes flicker{0%,100%{transform:scaleY(1) rotate(-1deg)}25%{transform:scaleY(1.05) rotate(1deg)}75%{transform:scaleY(0.96) rotate(-2deg)}}
.quick-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:9px;margin-bottom:14px;}
.quick-action{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:12px 10px;cursor:pointer;transition:all .2s;text-align:center;}
.quick-action:hover{border-color:var(--accent);background:rgba(124,92,252,0.06);transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,92,252,0.15);}
.qa-icon{font-size:20px;margin-bottom:5px;}
.qa-label{font-size:11px;font-weight:600;margin-bottom:1px;}
.qa-sub{font-size:9.5px;color:var(--text3);font-family:'JetBrains Mono',monospace;}
.ai-insight{background:linear-gradient(135deg,rgba(124,92,252,0.08),rgba(6,214,160,0.05));border:1px solid rgba(124,92,252,0.18);border-radius:var(--r);padding:12px 14px;display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;}
.insight-label{font-size:8.5px;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1.5px;color:var(--accent2);margin-bottom:2px;}
.mini-bar{display:flex;align-items:flex-end;gap:3px;height:56px;}
.bar{flex:1;background:var(--accent);border-radius:3px 3px 0 0;min-width:7px;}
.progress-wheel-wrap{display:flex;flex-direction:column;align-items:center;background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;text-align:center;}
.wheel-title{font-size:9.5px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:9px;}
.wheel-svg{position:relative;display:inline-block;}
.wheel-center{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;}
.wheel-pct{font-family:'Syne',sans-serif;font-size:20px;font-weight:800;color:var(--accent2);line-height:1;}
.wheel-label{font-size:8.5px;color:var(--text3);font-family:'JetBrains Mono',monospace;}
.heatmap-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:13px 14px;}
.heatmap-title{font-size:9.5px;color:var(--text3);font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:9px;}
.heatmap-grid{display:grid;grid-template-columns:repeat(12,1fr);gap:3px;}
.heatmap-cell{aspect-ratio:1;border-radius:2px;cursor:pointer;}
.radar-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:13px 14px;}
.activity-item{display:flex;align-items:flex-start;gap:9px;padding:8px 0;border-bottom:1px solid var(--border);}
.activity-item:last-child{border-bottom:none;}
.activity-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0;margin-top:5px;}
.activity-title{font-size:12.5px;margin-bottom:1px;}
.activity-time{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;}

/* ── FLASHCARD ── */
.flashcard-wrap{perspective:1000px;cursor:pointer;height:185px;}
.flashcard-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s;}
.flashcard-inner.flipped{transform:rotateY(180deg);}
.flashcard-face{position:absolute;inset:0;background:var(--surface2);border:1px solid var(--border2);border-radius:var(--r);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;backface-visibility:hidden;text-align:center;}
.flashcard-back{transform:rotateY(180deg);background:linear-gradient(135deg,rgba(124,92,252,0.12),rgba(6,214,160,0.08));border-color:rgba(124,92,252,0.3);}
.fc-label{font-size:8px;text-transform:uppercase;letter-spacing:2px;color:var(--text3);font-family:'JetBrains Mono',monospace;margin-bottom:9px;}

/* ── PLANNER ── */
.planner-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px;}
.day-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r2);padding:9px 5px;text-align:center;cursor:pointer;transition:all .15s;}
.day-card:hover{border-color:var(--accent);}
.day-card.today{border-color:var(--accent);background:rgba(124,92,252,0.08);}
.day-card.has-task::after{content:'';display:block;width:4px;height:4px;border-radius:50%;background:var(--accent);margin:3px auto 0;}
.day-name{font-size:8px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;font-family:'JetBrains Mono',monospace;}
.day-num{font-size:16px;font-weight:800;font-family:'Syne',sans-serif;margin:3px 0;}
.task-item{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);}
.task-item:last-child{border-bottom:none;}
.task-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);margin-top:6px;flex-shrink:0;}
.crash-day{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:8px;}
.crash-day-header{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--bg3);border-bottom:1px solid var(--border);cursor:pointer;}
.day-badge{width:28px;height:28px;border-radius:6px;background:linear-gradient(135deg,var(--accent),var(--accent3));display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;color:#fff;}
.crash-day-body{padding:12px 14px;}

/* ── SPECIAL MODULES ── */
.formula-search{position:relative;}
.formula-item{background:var(--bg3);border:1px solid var(--border);border-radius:var(--r2);padding:12px 14px;margin-bottom:8px;cursor:pointer;transition:border-color .15s;}
.formula-item:hover{border-color:var(--accent);}
.formula-name{font-size:13px;font-weight:600;margin-bottom:4px;}
.formula-eq{font-family:'JetBrains Mono',monospace;font-size:13.5px;color:var(--accent2);margin-bottom:4px;}
.formula-desc{font-size:11.5px;color:var(--text2);}
.pomodoro-circle{position:relative;display:inline-flex;align-items:center;justify-content:center;}
.pomodoro-time{position:absolute;text-align:center;}
.pomodoro-min{font-family:'Syne',sans-serif;font-size:36px;font-weight:800;line-height:1;color:var(--text);}
.pomodoro-lbl{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace;}
.concept-map-node{position:absolute;background:var(--surface2);border:1px solid var(--border2);border-radius:8px;padding:6px 10px;font-size:11.5px;font-weight:600;cursor:pointer;transition:all .15s;white-space:nowrap;}
.concept-map-node:hover{border-color:var(--accent);background:rgba(124,92,252,0.1);}
.concept-map-node.center{background:linear-gradient(135deg,rgba(124,92,252,0.2),rgba(6,214,160,0.1));border-color:rgba(124,92,252,0.4);font-size:13px;}
.pyq-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:8px;}
.syllabus-topic{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);}
.syllabus-topic:last-child{border-bottom:none;}
.revision-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);padding:14px;margin-bottom:8px;cursor:pointer;transition:all .2s;}
.revision-card:hover{border-color:var(--accent);transform:translateX(3px);}
.notif-item{display:flex;align-items:flex-start;gap:9px;padding:10px;border-bottom:1px solid var(--border);}
.notif-item:last-child{border-bottom:none;}
.table-wrap{background:var(--surface);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;}
table{width:100%;border-collapse:collapse;}
th{text-align:left;font-size:9.5px;color:var(--text3);text-transform:uppercase;letter-spacing:1.5px;font-family:'JetBrains Mono',monospace;padding:9px 11px;border-bottom:1px solid var(--border);font-weight:500;}
td{padding:9px 11px;border-bottom:1px solid var(--border);font-size:12.5px;}
tr:last-child td{border-bottom:none;}
tr:hover td{background:rgba(255,255,255,0.02);}
`;

// ── Data ──────────────────────────────────────────────────────────────────────
const STUDENT = {
  name:"Arjun Sharma",role:"student",initials:"AS",streak:12,testsTaken:47,avgScore:74,studyHours:186,
  topicScores:[
    {name:"Thermodynamics",score:88,color:"#7c5cfc"},{name:"Org.Chem",score:61,color:"#f43f5e"},
    {name:"Calculus",score:79,color:"#22c55e"},{name:"Electrostatics",score:55,color:"#f43f5e"},
    {name:"Mechanics",score:82,color:"#22c55e"},{name:"Wave Optics",score:68,color:"#fbbf24"},
  ],
  weekScores:[65,70,68,74,80,78,82],
  dailyGoalPct:68,questionsToday:34,goalQuestions:50,
};

const FORMULAS = [
  {subject:"Physics",name:"Newton's 2nd Law",eq:"F = ma",desc:"Force equals mass times acceleration"},
  {subject:"Physics",name:"Work-Energy Theorem",eq:"W = ΔKE = ½mv² - ½mu²",desc:"Net work done equals change in kinetic energy"},
  {subject:"Physics",name:"Coulomb's Law",eq:"F = kq₁q₂/r²",desc:"Force between two point charges; k = 9×10⁹ Nm²/C²"},
  {subject:"Physics",name:"Electric Field",eq:"E = F/q = kQ/r²",desc:"Force per unit charge at a point in space"},
  {subject:"Physics",name:"Ohm's Law",eq:"V = IR",desc:"Voltage equals current times resistance"},
  {subject:"Physics",name:"Young's Double Slit",eq:"β = λD/d",desc:"Fringe width where D=distance, d=slit separation"},
  {subject:"Physics",name:"Kinetic Energy",eq:"KE = ½mv²",desc:"Energy of motion"},
  {subject:"Physics",name:"Gravitational PE",eq:"U = mgh",desc:"Potential energy in gravitational field"},
  {subject:"Chemistry",name:"Ideal Gas Law",eq:"PV = nRT",desc:"R = 8.314 J/mol·K for ideal gas behavior"},
  {subject:"Chemistry",name:"Henderson-Hasselbalch",eq:"pH = pKa + log([A⁻]/[HA])",desc:"pH of a buffer solution"},
  {subject:"Chemistry",name:"Nernst Equation",eq:"E = E° - (RT/nF)lnQ",desc:"Cell potential under non-standard conditions"},
  {subject:"Chemistry",name:"Rate Law",eq:"r = k[A]ᵐ[B]ⁿ",desc:"Reaction rate as function of concentrations"},
  {subject:"Math",name:"Quadratic Formula",eq:"x = (-b ± √(b²-4ac))/2a",desc:"Roots of ax² + bx + c = 0"},
  {subject:"Math",name:"Integration by Parts",eq:"∫udv = uv - ∫vdu",desc:"Fundamental integral technique"},
  {subject:"Math",name:"Taylor Series",eq:"f(x) = Σ f⁽ⁿ⁾(a)/n! · (x-a)ⁿ",desc:"Power series expansion around point a"},
  {subject:"Math",name:"Chain Rule",eq:"d/dx[f(g(x))] = f'(g(x))·g'(x)",desc:"Derivative of composite function"},
];

const FLASHCARDS = [
  {q:"State Newton's Second Law",a:"F = ma — net force equals mass times acceleration in the direction of force.",topic:"Mechanics"},
  {q:"Avogadro's Number",a:"6.022 × 10²³ particles per mole. Number of atoms in 12g of Carbon-12.",topic:"Chemistry"},
  {q:"Work-Energy Theorem",a:"W_net = ΔKE = ½mv² - ½mu². Net work equals change in kinetic energy.",topic:"Mechanics"},
  {q:"Faraday's Law of Induction",a:"EMF = -dΦ/dt. Induced EMF equals rate of change of magnetic flux.",topic:"Electromagnetism"},
  {q:"Ideal Gas Law",a:"PV = nRT where R = 8.314 J/mol·K. Applies to gases at low pressure.",topic:"Thermodynamics"},
  {q:"Hund's Rule",a:"Electrons occupy orbitals singly before pairing. Maximizes spin multiplicity.",topic:"Chemistry"},
  {q:"Snell's Law",a:"n₁sinθ₁ = n₂sinθ₂. Relates angles of refraction at interface between media.",topic:"Wave Optics"},
  {q:"1st Law of Thermodynamics",a:"ΔU = Q - W. Change in internal energy = heat added minus work done by system.",topic:"Thermodynamics"},
];

const QUESTIONS_BANK = [
  {id:1,q:"A 2 kg block on frictionless surface, F=8N applied horizontally. Acceleration:",opts:["2 m/s²","4 m/s²","8 m/s²","16 m/s²"],correct:1,topic:"Mechanics",difficulty:"Easy"},
  {id:2,q:"Work done by F=(3î+4ĵ)N through d=(2î-3ĵ)m:",opts:["-6 J","6 J","18 J","-18 J"],correct:0,topic:"Mechanics",difficulty:"Medium"},
  {id:3,q:"Nucleophilic addition occurs in:",opts:["Halogenation of benzene","HCN + acetaldehyde","Nitration of toluene","Dehydration of alcohol"],correct:1,topic:"Org.Chem",difficulty:"Medium"},
  {id:4,q:"Entropy of an isolated system always:",opts:["Decreases","Stays constant","Increases or stays same","Fluctuates"],correct:2,topic:"Thermodynamics",difficulty:"Easy"},
  {id:5,q:"f(x)=x³-6x²+9x+1, critical points at x:",opts:["x=1,x=2","x=1,x=3","x=2,x=3","x=0,x=3"],correct:1,topic:"Calculus",difficulty:"Hard"},
  {id:6,q:"Electric field inside a conducting sphere:",opts:["Max at center","Zero everywhere inside","Equals surface field","Depends on radius"],correct:1,topic:"Electrostatics",difficulty:"Easy"},
  {id:7,q:"Young's DSE: if slit separation d is doubled, fringe width β:",opts:["Doubled","Halved","Unchanged","Quadrupled"],correct:1,topic:"Wave Optics",difficulty:"Medium"},
  {id:8,q:"Dimensional formula of Planck's constant h:",opts:["ML²T⁻¹","ML²T⁻²","MLT⁻¹","ML³T⁻²"],correct:0,topic:"Modern Physics",difficulty:"Medium"},
  {id:9,q:"Isothermal expansion of ideal gas: internal energy:",opts:["Increases","Decreases","Unchanged","Doubles"],correct:2,topic:"Thermodynamics",difficulty:"Easy"},
  {id:10,q:"IUPAC name of CH₃-CH(OH)-COOH:",opts:["Lactic acid","2-hydroxypropanoic acid","Propanoic acid","Acetic acid"],correct:1,topic:"Org.Chem",difficulty:"Easy"},
  {id:11,q:"∫(x²+1)dx from 0 to 1:",opts:["1","4/3","2/3","3/4"],correct:1,topic:"Calculus",difficulty:"Medium"},
  {id:12,q:"Centripetal acceleration of particle in circle of radius r:",opts:["v/r","v²/r","vr","v²r"],correct:1,topic:"Mechanics",difficulty:"Easy"},
  {id:13,q:"pH of 0.1 M HCl:",opts:["1","2","0.1","13"],correct:0,topic:"Chemistry",difficulty:"Easy"},
  {id:14,q:"de Broglie wavelength if velocity doubles:",opts:["Doubles","Halves","Quadruples","Unchanged"],correct:1,topic:"Modern Physics",difficulty:"Medium"},
  {id:15,q:"Magnetic field at centre of circular loop radius R, current I:",opts:["μ₀I/2R","μ₀I/R","μ₀I/4R","2μ₀I/R"],correct:0,topic:"Magnetism",difficulty:"Hard"},
  {id:16,q:"Which hybridisation does benzene have?",opts:["sp","sp²","sp³","sp³d"],correct:1,topic:"Org.Chem",difficulty:"Easy"},
  {id:17,q:"Angular momentum of electron in nth Bohr orbit:",opts:["nħ","n²ħ","ħ/n","nħ/2π"],correct:0,topic:"Modern Physics",difficulty:"Medium"},
  {id:18,q:"For adiabatic process, PVγ = const. For diatomic gas γ =",opts:["1.4","1.67","1.2","1"],correct:0,topic:"Thermodynamics",difficulty:"Hard"},
  {id:19,q:"Limiting reagent in 2H₂ + O₂ → 2H₂O using 5 mol H₂ and 2 mol O₂:",opts:["H₂","O₂","Neither","Both"],correct:1,topic:"Chemistry",difficulty:"Easy"},
  {id:20,q:"∫sin²x dx =",opts:["x/2 - sin2x/4 + C","x/2 + sin2x/4 + C","-cos2x/2 + C","sin2x/2 + C"],correct:0,topic:"Calculus",difficulty:"Hard"},
];

const PYQ_DATA = [
  {year:2024,exam:"JEE Main",topic:"Electrostatics",q:"Two charges +q and -q separated by distance d. Electric field at midpoint:",marks:4,difficulty:"Easy"},
  {year:2024,exam:"JEE Main",topic:"Calculus",q:"If f(x) = x³ - 3x² + 3x - 1, find f'''(x):",marks:4,difficulty:"Easy"},
  {year:2023,exam:"JEE Advanced",topic:"Thermodynamics",q:"One mole of ideal gas undergoes isothermal reversible expansion from V₁ to V₂. Work done:",marks:4,difficulty:"Medium"},
  {year:2023,exam:"JEE Main",topic:"Organic Chemistry",q:"Identify the major product of reaction between acetaldehyde and HCN:",marks:4,difficulty:"Medium"},
  {year:2022,exam:"JEE Advanced",topic:"Wave Optics",q:"In YDSE, if wavelength increased by 10%, fringe width changes by:",marks:4,difficulty:"Hard"},
  {year:2022,exam:"JEE Main",topic:"Mechanics",q:"A ball thrown upward from height h with velocity v. Time to reach max height:",marks:4,difficulty:"Easy"},
];

const SYLLABUS = [
  {subject:"Physics",topics:[{name:"Mechanics",done:85},{name:"Thermodynamics",done:92},{name:"Electrostatics",done:45},{name:"Magnetism",done:60},{name:"Wave Optics",done:55},{name:"Modern Physics",done:40}]},
  {subject:"Chemistry",topics:[{name:"Physical Chem",done:70},{name:"Organic Chem",done:55},{name:"Inorganic Chem",done:65},{name:"Electrochemistry",done:48},{name:"Chemical Kinetics",done:72}]},
  {subject:"Mathematics",topics:[{name:"Calculus",done:78},{name:"Algebra",done:82},{name:"Coordinate Geometry",done:75},{name:"Vectors",done:65},{name:"Statistics",done:88}]},
];

// ── Shared ────────────────────────────────────────────────────────────────────
function MiniBar({values}) {
  const max = Math.max(...values);
  return <div className="mini-bar">{values.map((v,i)=><div key={i} className="bar" style={{height:`${(v/max)*100}%`,opacity:i===values.length-1?1:0.35+(i/values.length)*0.55}}/>)}</div>;
}
function ProgressBar({value,color="var(--accent)"}) {
  return <div className="progress-bar"><div className="progress-fill" style={{width:`${value}%`,background:color}}/></div>;
}
function useToast() {
  const [toasts,setToasts] = useState([]);
  const show = useCallback((msg,icon="✨")=>{
    const id=Date.now();
    setToasts(t=>[...t,{id,msg,icon}]);
    setTimeout(()=>{setToasts(t=>t.map(x=>x.id===id?{...x,hiding:true}:x));setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),350);},3200);
  },[]);
  return {toasts,show};
}
function ToastContainer({toasts}) {
  return <div className="toast-container">{toasts.map(t=><div key={t.id} className={`toast ${t.hiding?"hiding":""}`}><span>{t.icon}</span><span>{t.msg}</span></div>)}</div>;
}
function RadarChart({data,size=114}) {
  const cx=size/2,cy=size/2,r=size*0.36,n=data.length;
  const angle=i=>(Math.PI*2*i)/n-Math.PI/2;
  const pt=(i,ratio)=>[cx+r*ratio*Math.cos(angle(i)),cy+r*ratio*Math.sin(angle(i))];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block",margin:"0 auto"}}>
      {[0.25,0.5,0.75,1].map((ratio,ri)=><polygon key={ri} points={data.map((_,i)=>pt(i,ratio).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="0.5"/>)}
      {data.map((_,i)=>{const[x,y]=pt(i,1);return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.06)" strokeWidth="0.5"/>;  })}
      <polygon points={data.map((d,i)=>pt(i,d.score/100).join(",")).join(" ")} fill="rgba(124,92,252,0.2)" stroke="#7c5cfc" strokeWidth="1.5"/>
      {data.map((d,i)=>{const[x,y]=pt(i,d.score/100);return <circle key={i} cx={x} cy={y} r="2.5" fill="#7c5cfc"/>;  })}
      {data.map((d,i)=>{const[lx,ly]=pt(i,1.25);return <text key={i} x={lx} y={ly+3} textAnchor="middle" style={{fontSize:6.5,fill:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>{d.name.split(" ")[0]}</text>;})}
    </svg>
  );
}
function ProgressWheel({pct,size=96}) {
  const r=34,cx=size/2,cy=size/2,circ=2*Math.PI*r,dash=(pct/100)*circ;
  return (
    <div className="wheel-svg">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg3)" strokeWidth="7"/>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#wg2)" strokeWidth="7" strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`} style={{transition:"stroke-dasharray 1s ease"}}/>
        <defs><linearGradient id="wg2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#7c5cfc"/><stop offset="100%" stopColor="#06d6a0"/></linearGradient></defs>
      </svg>
      <div className="wheel-center"><div className="wheel-pct">{pct}%</div><div className="wheel-label">done</div></div>
    </div>
  );
}
function ActivityHeatmap() {
  const cells = useMemo(()=>Array.from({length:84},()=>({intensity:Math.random(),active:Math.random()>0.35})),[]);
  const getColor=c=>{if(!c.active)return"var(--bg3)";if(c.intensity>0.75)return"rgba(124,92,252,0.9)";if(c.intensity>0.5)return"rgba(124,92,252,0.55)";if(c.intensity>0.25)return"rgba(124,92,252,0.3)";return"rgba(124,92,252,0.12)";};
  return <div className="heatmap-grid" style={{gridTemplateColumns:"repeat(12,1fr)"}}>{cells.map((c,i)=><div key={i} className="heatmap-cell" style={{background:getColor(c)}}/>)}</div>;
}

// ── HOMEPAGE ──────────────────────────────────────────────────────────────────
function HomePage({onGetStarted,onLogin}) {
  const features=[
    {icon:"🤖",name:"AI Study Tutor",desc:"Powered by local Ollama 318B. Reads ALL your PDFs, solves problems step-by-step, explains concepts like a 1:1 tutor."},
    {icon:"📄",name:"PDF Intelligence",desc:"Upload up to 400MB. Get full summaries, important questions, concept maps, and difficulty analysis automatically."},
    {icon:"🧪",name:"Adaptive Mock Tests",desc:"1–100 questions, any topic, any difficulty. AI generates fresh questions tailored to your weak areas in real time."},
    {icon:"🎯",name:"Pass Mode",desc:"Crash course engine: analyzes 47+ tests, predicts exam questions, builds day-by-day plan for maximum score gain."},
    {icon:"⏱️",name:"Pomodoro Focus Timer",desc:"Deep work sessions with break reminders. Track study time per topic and optimize when you study best."},
    {icon:"🗺️",name:"Concept Mapper",desc:"Visual knowledge graphs showing how topics connect. See the big picture and fill gaps intelligently."},
    {icon:"📐",name:"Formula Library",desc:"5,000+ searchable formulas across Physics, Chemistry, Math. One click to get derivation and examples."},
    {icon:"📅",name:"PYQ Bank",desc:"5 years of JEE/NEET past year questions with solutions, analysis by topic, and trend prediction."},
    {icon:"🏆",name:"Leaderboard",desc:"Compete with other students. Weekly contests, rank tracking, and achievement badges to stay motivated."},
    {icon:"📊",name:"Deep Analytics",desc:"Accuracy by topic, time-of-day performance, error pattern analysis, and AI-powered weekly reports."},
  ];
  const modules=[
    {icon:"⏱️",name:"Focus Timer",desc:"Pomodoro"},
    {icon:"🗺️",name:"Concept Maps",desc:"Visual graphs"},
    {icon:"📐",name:"Formulas",desc:"5000+ searchable"},
    {icon:"📅",name:"PYQ Bank",desc:"5yr analysis"},
    {icon:"🏆",name:"Leaderboard",desc:"Compete & win"},
    {icon:"📝",name:"Notes Maker",desc:"AI summaries"},
    {icon:"🌙",name:"Spaced Revision",desc:"Smart schedule"},
    {icon:"🎤",name:"Voice Tutor",desc:"Ask verbally"},
    {icon:"📖",name:"Syllabus Track",desc:"Coverage %"},
    {icon:"🧬",name:"Error Journal",desc:"Learn from mistakes"},
  ];
  return (
    <div className="home-screen">
      <div className="home-bg-fixed"/>
      <nav className="home-nav">
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span style={{fontSize:22}}>🎓</span>
          <div><div className="logo-mark" style={{fontSize:18}}>StudyAI</div><div className="logo-sub">Powered by Ollama 318B</div></div>
        </div>
        <div className="home-nav-links">
          {["Features","Modules","Pricing","About"].map(l=><span key={l}>{l}</span>)}
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <div className="ollama-pill">🟢 Ollama Local</div>
          <button className="btn btn-ghost btn-sm" onClick={onLogin}>Sign in</button>
          <button className="btn btn-primary btn-sm" onClick={onGetStarted}>Get Started Free</button>
        </div>
      </nav>

      <div className="home-hero">
        <div className="home-badge"><div className="home-badge-dot"/> Powered by Ollama 318B · Running 100% locally · Zero data sent to cloud</div>
        <h1 className="home-title">The <span className="grad">Ultimate</span> AI<br/>Study Assistant</h1>
        <p className="home-subtitle">Local AI that reads your PDFs, solves JEE/NEET problems, tracks your progress across 15 powerful modules, and builds a personalized crash course to maximize your score.</p>
        <div className="home-cta-row">
          <button className="btn-hp btn-hp-primary" onClick={onGetStarted}>🚀 Start Studying Free</button>
          <button className="btn-hp btn-hp-secondary" onClick={onLogin}>Sign in to account →</button>
        </div>
        <p style={{fontSize:11,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>No cloud API needed · All data stays on your machine · Free forever</p>
      </div>

      <div className="home-stats-bar">
        {[{num:"318B",label:"Parameter Local Model"},{num:"15",label:"Study Modules"},{num:"400MB",label:"PDF Upload Limit"},{num:"5,000+",label:"Formula Database"}].map((s,i)=>(
          <div key={i} className="home-stat-cell">
            <div className="home-stat-num">{s.num}</div>
            <div className="home-stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="home-section" style={{borderTop:"1px solid var(--border)"}}>
        <div style={{textAlign:"center"}}><div className="home-section-label">Core features</div><h2 className="home-section-title">Everything a JEE/NEET Student Needs</h2></div>
        <div className="features-grid">{features.map((f,i)=><div key={i} className="feature-card"><div className="feature-icon">{f.icon}</div><div className="feature-name">{f.name}</div><div className="feature-desc">{f.desc}</div></div>)}</div>
      </div>

      <div className="home-section" style={{borderTop:"1px solid var(--border)",paddingBottom:40}}>
        <div style={{textAlign:"center"}}><div className="home-section-label">10 New Modules</div><h2 className="home-section-title">Supercharge Your Preparation</h2></div>
        <div className="modules-grid">{modules.map((m,i)=><div key={i} className="module-card"><div className="module-icon">{m.icon}</div><div className="module-name">{m.name}</div><div className="module-desc">{m.desc}</div></div>)}</div>
      </div>

      <div className="home-section" style={{borderTop:"1px solid var(--border)"}}>
        <div style={{textAlign:"center"}}><div className="home-section-label">Student stories</div><h2 className="home-section-title">Real Results</h2></div>
        <div className="testimonials-grid">
          {[
            {text:'"The local Ollama model is INSANE. It reads my 400MB PDF notes and answers questions perfectly. Better than any cloud tool."',name:"Sneha P.",score:"JEE 2024 — AIR 1,240",c:"linear-gradient(135deg,#7c5cfc,#a78bfa)"},
            {text:'"The concept mapper showed me I had gaps in Wave Optics I never knew about. Fixed them in 3 days. Went from 68% to 85%."',name:"Rohan M.",score:"NEET 2024 — 680/720",c:"linear-gradient(135deg,#06d6a0,#38bdf8)"},
            {text:'"Pass Mode + Pomodoro Timer = insane productivity. I studied 8 hours daily without burnout. Cleared JEE Advanced."',name:"Priya V.",score:"JEE Advanced — IIT Bombay",c:"linear-gradient(135deg,#f59e0b,#f43f5e)"},
          ].map((t,i)=>(
            <div key={i} className="t-card">
              <div className="t-stars">★★★★★</div>
              <div className="t-text">{t.text}</div>
              <div className="t-author"><div className="t-av" style={{background:t.c}}>{t.name[0]}</div><div><div style={{fontSize:12.5,fontWeight:600}}>{t.name}</div><div style={{fontSize:11,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>{t.score}</div></div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="home-section" style={{borderTop:"1px solid var(--border)"}}>
        <div style={{textAlign:"center"}}><div className="home-section-label">Simple pricing</div><h2 className="home-section-title">Choose Your Plan</h2></div>
        <div className="pricing-grid">
          {[
            {name:"Free",price:"₹0",period:"/month",feats:["5 tests/month","Basic AI chat","2 PDF uploads (50MB)","5 modules"],cta:"Get Started"},
            {name:"Pro",price:"₹499",period:"/month",feats:["Unlimited tests","Ollama 318B AI chat","Unlimited PDFs (400MB)","All 15 modules","Pass Mode","PYQ Bank","Leaderboard","Priority support"],cta:"Start Free Trial",featured:true},
            {name:"Batch",price:"₹199",period:"/student/month",feats:["Everything in Pro","Admin dashboard","Student analytics","Bulk material upload","API access"],cta:"Contact Sales"},
          ].map((p,i)=>(
            <div key={i} className={`pricing-card ${p.featured?"featured":""}`}>
              {p.featured&&<div className="tag tag-purple" style={{marginBottom:10}}>Most Popular</div>}
              <div className="pricing-name">{p.name}</div>
              <div className="pricing-price">{p.price}</div>
              <div className="pricing-period">{p.period}</div>
              <div style={{marginBottom:16}}>{p.feats.map((f,j)=><div key={j} className="pricing-feat"><span style={{color:"var(--green)"}}>✓</span>{f}</div>)}</div>
              <button className={`btn w-full ${p.featured?"btn-primary":"btn-secondary"}`} onClick={onGetStarted}>{p.cta}</button>
            </div>
          ))}
        </div>
      </div>

      <footer className="home-footer">
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>🎓</span><span style={{fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:800,background:"linear-gradient(135deg,var(--accent2),var(--accent3))",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>StudyAI</span></div>
        <div style={{fontSize:12,color:"var(--text3)"}}>© 2025 StudyAI. Built with Ollama 318B. All data stays local.</div>
        <div style={{display:"flex",gap:18,fontSize:12.5,color:"var(--text3)"}}>{["Privacy","Terms","Support"].map(l=><span key={l} style={{cursor:"pointer"}}>{l}</span>)}</div>
      </footer>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({onLogin,onBack}) {
  const [isLogin,setIsLogin] = useState(true);
  const [role,setRole] = useState("student");
  const [name,setName] = useState("");
  return (
    <div className="auth-screen">
      <div className="auth-bg"/>
      <div className="auth-card">
        <div style={{textAlign:"center",marginBottom:20}}><div style={{fontSize:30,marginBottom:6}}>🎓</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,background:"linear-gradient(135deg,#a78bfa,#06d6a0)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>StudyAI</div><div className="ollama-pill" style={{margin:"6px auto 0",display:"inline-flex"}}>🤖 Ollama 318B</div></div>
        <div className="auth-title">{isLogin?"Welcome back":"Create account"}</div>
        <div className="auth-sub">{isLogin?"Sign in to continue your journey":"Join 50,000+ students acing their exams"}</div>
        {!isLogin&&<div className="input-group"><label className="input-label">Full Name</label><input className="input" type="text" placeholder="Arjun Sharma" value={name} onChange={e=>setName(e.target.value)}/></div>}
        <div className="input-group"><label className="input-label">Email</label><input className="input" type="email" placeholder="student@email.com"/></div>
        <div className="input-group"><label className="input-label">Password</label><input className="input" type="password" placeholder="••••••••"/></div>
        <div className="input-group"><label className="input-label">Login As</label><select className="input" value={role} onChange={e=>setRole(e.target.value)}><option value="student">🎓 Student</option><option value="admin">👨‍🏫 Admin</option></select></div>
        <button className="btn btn-primary w-full" style={{marginTop:4}} onClick={()=>onLogin(role==="admin"?{name:"Admin User",role:"admin",initials:"AU"}:STUDENT)}>
          {isLogin?"Sign In →":"Create Account →"}
        </button>
        <div className="auth-switch">{isLogin?<>No account? <a onClick={()=>setIsLogin(false)}>Sign up</a></>:<>Have account? <a onClick={()=>setIsLogin(true)}>Sign in</a></>}</div>
        <div style={{textAlign:"center",marginTop:12}}><span style={{fontSize:12,color:"var(--text3)",cursor:"pointer"}} onClick={onBack}>← Back to homepage</span></div>
      </div>
    </div>
  );
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
function DashboardPage({onNavigate,toast}) {
  const [aiInsight,setAiInsight]=useState(null);
  const [loadingInsight,setLoadingInsight]=useState(false);
  async function fetchInsight(){
    setLoadingInsight(true);
    const t=await callAI("You are an elite JEE study coach. Give ONE powerful, specific, actionable insight in 2 sentences. Be direct. No fluff.","Student stats: avg 74%, Electrostatics 55% (critical), Organic Chem 61% (weak), exam in 18 days, 12-day streak, 186h studied. What is the single highest-impact thing to do RIGHT NOW?");
    setAiInsight(t);setLoadingInsight(false);
  }
  const quickActions=[
    {icon:"🧪",label:"Mock Test",sub:"Custom questions",page:"test"},
    {icon:"🤖",label:"AI Tutor",sub:"318B local AI",page:"chat"},
    {icon:"📐",label:"Formulas",sub:"5000+ library",page:"formulas"},
    {icon:"🎯",label:"Pass Mode",sub:"Crash course",page:"pass"},
    {icon:"⏱️",label:"Focus Timer",sub:"Pomodoro",page:"pomodoro"},
    {icon:"🗺️",label:"Concept Map",sub:"Visual graphs",page:"concepts"},
    {icon:"📅",label:"PYQ Bank",sub:"5yr questions",page:"pyq"},
    {icon:"🧬",label:"Error Journal",sub:"Learn from mistakes",page:"errors"},
  ];
  return (
    <div>
      <div className="hero-section">
        <div className="hero-grid-bg"/>
        <div className="hero-content">
          <div>
            <div className="exam-countdown"><div className="countdown-dot"/><span>EXAM IN 18 DAYS</span></div>
            <div className="hero-greeting">Welcome back, <span>Arjun</span>.<br/>Let's crush it today.</div>
            <div className="hero-subtitle">12-day streak 🔥 · Electrostatics at 55% is your critical weak point. Focus there first.</div>
            <div className="hero-cta-row">
              <button className="btn btn-primary" onClick={()=>onNavigate("test")}>🚀 Start Mock Test</button>
              <button className="btn btn-secondary" onClick={()=>onNavigate("pass")}>⚡ Pass Mode</button>
              <button className="btn btn-ghost btn-sm" onClick={fetchInsight} disabled={loadingInsight}>
                {loadingInsight?<><div className="spinner"/>Thinking…</>:"🧠 AI Insight"}
              </button>
            </div>
            {aiInsight&&<div className="ai-insight"><span style={{fontSize:16,flexShrink:0}}>🤖</span><div><div className="insight-label">Ollama 318B Coach</div><div style={{fontSize:12.5,lineHeight:1.6}}>{aiInsight}</div></div></div>}
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            <div className="score-ticker">
              <div className="ticker-label">Current Average Score</div>
              <div style={{display:"flex",alignItems:"baseline",gap:9,marginBottom:3}}>
                <div className="ticker-score">74%</div>
                <div style={{fontSize:11,fontFamily:"'JetBrains Mono',monospace",color:"var(--green)"}}>↑ 6% this week</div>
              </div>
              <div style={{fontSize:10,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",marginBottom:5}}>Target: 85% · Need +11%</div>
              <div className="ticker-bar-track"><div className="ticker-bar" style={{width:"74%"}}/></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              <div className="progress-wheel-wrap"><div className="wheel-title">Daily Goal</div><ProgressWheel pct={68} size={92}/><div style={{fontSize:10,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",marginTop:5}}>34/50 Q</div></div>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <div className="streak-card"><div className="streak-flame">🔥</div><div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"var(--gold)",lineHeight:1}}>12</div><div style={{fontSize:10,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>day streak</div></div></div>
                <div className="card" style={{padding:"9px 11px",flex:1}}>
                  <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.5,marginBottom:4}}>Tests taken</div>
                  <div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:"var(--accent3)",lineHeight:1}}>47</div>
                  <div style={{fontSize:10,color:"var(--text3)",marginTop:2}}>186h studied</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="page-content" style={{paddingTop:0}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:8,marginBottom:14}}>
          {quickActions.map((qa,i)=>(
            <div key={i} className="quick-action" onClick={()=>{onNavigate(qa.page);toast(`Opening ${qa.label}…`,qa.icon);}}>
              <div className="qa-icon">{qa.icon}</div>
              <div className="qa-label">{qa.label}</div>
              <div className="qa-sub">{qa.sub}</div>
            </div>
          ))}
        </div>
        <div className="stats-grid mb-4">
          {[
            {label:"Avg. Score",value:"74%",change:"↑ 6% this week",color:"var(--accent)"},
            {label:"Tests Taken",value:"47",change:"4 this week",color:"var(--accent3)"},
            {label:"Study Streak",value:"12d 🔥",change:"Personal best!",color:"var(--gold)"},
            {label:"Study Hours",value:"186h",change:"↑ 12h this week",color:"var(--green)"},
          ].map((s,i)=><div key={i} className="stat-card" style={{"--accent-color":s.color}}><div className="stat-label">{s.label}</div><div className="stat-value" style={{color:s.color}}>{s.value}</div><div className="stat-change">{s.change}</div></div>)}
        </div>
        <div className="dash-grid-3">
          <div className="card"><div className="flex items-center gap-2 mb-3"><span>📈</span><span style={{fontSize:12.5,fontWeight:600}}>Weekly Performance</span></div><MiniBar values={STUDENT.weekScores}/><div className="flex" style={{justifyContent:"space-between",marginTop:5}}>{["M","T","W","T","F","S","S"].map((d,i)=><span key={i} style={{fontSize:9,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>{d}</span>)}</div></div>
          <div className="radar-wrap"><div className="heatmap-title">Topic Radar</div><RadarChart data={STUDENT.topicScores} size={110}/></div>
          <div className="heatmap-wrap"><div className="heatmap-title">Study Activity (12 weeks)</div><ActivityHeatmap/><div style={{display:"flex",gap:5,marginTop:7,alignItems:"center"}}><span style={{fontSize:9,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>Less</span>{[0.12,0.3,0.55,0.9].map((o,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:`rgba(124,92,252,${o})`}}/>)}<span style={{fontSize:9,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>More</span></div></div>
        </div>
        <div className="dash-grid" style={{marginTop:12}}>
          <div className="card"><div className="flex items-center gap-2 mb-3"><span>📊</span><span style={{fontSize:12.5,fontWeight:600}}>Topic Mastery</span></div>{STUDENT.topicScores.map((t,i)=><div key={i} style={{marginBottom:8}}><div className="flex items-center gap-2 mb-1"><span style={{flex:1,fontSize:12}}>{t.name}</span><span style={{fontSize:11,fontWeight:600,color:t.color,fontFamily:"'JetBrains Mono',monospace"}}>{t.score}%</span></div><ProgressBar value={t.score} color={t.color}/></div>)}</div>
          <div className="card"><div className="flex items-center gap-2 mb-3"><span>⚡</span><span style={{fontSize:12.5,fontWeight:600}}>Recent Activity</span></div>{[{title:"Completed Physics Mock #12",time:"2h ago",score:"82%",c:"var(--green)"},{title:"Organic Chemistry — Reactions session",time:"4h ago",score:null,c:"var(--accent)"},{title:"Chemistry Full Test",time:"Yesterday",score:"67%",c:"var(--gold)"},{title:"Flashcard session — Mechanics",time:"Yesterday",score:null,c:"var(--accent3)"},{title:"Math Speed Test",time:"3 days ago",score:"91%",c:"var(--green)"}].map((a,i)=><div key={i} className="activity-item"><div className="activity-dot" style={{background:a.c}}/><div style={{flex:1}}><div className="activity-title">{a.title}</div><div className="activity-time">{a.time}</div></div>{a.score&&<div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:500,color:parseInt(a.score)>=80?"var(--green)":parseInt(a.score)>=65?"var(--gold)":"var(--red)"}}>{a.score}</div>}</div>)}</div>
        </div>
      </div>
    </div>
  );
}

// ── AI TUTOR CHAT (Ollama streaming) ─────────────────────────────────────────
function ChatPage({uploadedFiles}) {
  const [messages,setMessages]=useState([{role:"ai",content:`🤖 **Ollama 318B AI Tutor** online!\n\nI have access to your ${uploadedFiles.length} uploaded study materials. I can:\n• Solve JEE/NEET problems step-by-step with full working\n• Explain any concept from your notes\n• Generate practice questions on any topic\n• Compare topics, derive formulas, predict exam questions\n\nWhat do you want to master today?`}]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [history,setHistory]=useState([]);
  const bottomRef=useRef(null);
  useEffect(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),[messages]);

  const fileCtx = uploadedFiles.length>0?`\n\nStudent has uploaded: ${uploadedFiles.map(f=>f.name).join(", ")}. You have full knowledge of these materials and reference them in answers. For Physics notes: mechanics, thermodynamics, optics, electrostatics. For Chemistry PYQ: organic reactions, electrochemistry, named reactions. For Math formula book: calculus, vectors, coordinate geometry.`:"";

  const SYSTEM = `You are an elite JEE/NEET AI Tutor powered by Ollama 318B. You are the best teacher in the world for competitive exam preparation. You:

1. SOLVE problems with complete step-by-step working, showing every step
2. EXPLAIN concepts with intuitive analogies and real examples
3. POINT OUT common mistakes and traps in questions
4. GENERATE practice problems when asked with detailed solutions
5. COMPARE topics to show relationships
6. PREDICT which topics are most likely to appear in exams based on trends
7. DERIVE formulas from first principles when helpful
8. Give MEMORY TRICKS for difficult concepts
9. Provide QUICK REVISION summaries when asked
10. Answer in a warm, encouraging, expert tone

Format responses clearly with **bold** for key terms, use numbered steps for solutions, use bullet points for lists. Keep answers thorough but focused.${fileCtx}`;

  async function send(){
    if(!input.trim()||loading)return;
    const q=input.trim();setInput("");
    const newHist=[...history,{role:"user",content:q}];
    setMessages(m=>[...m,{role:"user",content:q}]);
    setLoading(true);
    // streaming response
    const idx=Date.now();
    setMessages(m=>[...m,{role:"ai",content:"",id:idx,streaming:true}]);
    const reply=await callAI(SYSTEM,q,history,(full)=>{
      setMessages(m=>m.map(msg=>msg.id===idx?{...msg,content:full}:msg));
    });
    setMessages(m=>m.map(msg=>msg.id===idx?{...msg,streaming:false}:msg));
    setHistory([...newHist,{role:"assistant",content:reply}]);
    setLoading(false);
  }

  const SUGGESTIONS=["Solve: Two charges +2μC and -3μC at 30cm apart. Find electric field at midpoint.","Derive Newton's second law from first principles","Explain SN1 vs SN2 reactions with examples and when each occurs","Generate 5 hard questions on Thermodynamics for JEE Advanced","What are the most important topics in Organic Chemistry for JEE 2025?","Give me memory tricks for integration formulas"];

  const renderContent=(content)=>content.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/`([^`]+)`/g,"<code>$1</code>").replace(/^(\d+)\.\s/gm,(m,n)=>`<span style="color:var(--accent2);font-weight:600">${n}.</span> `);

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {uploadedFiles.length>0&&<div style={{display:"flex",gap:6,padding:"6px 8px",background:"var(--bg3)",borderRadius:"var(--r2)",border:"1px solid var(--border)",marginBottom:4,flexWrap:"wrap"}}><span style={{fontSize:9.5,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",alignSelf:"center"}}>CONTEXT FILES:</span>{uploadedFiles.map(f=><span key={f.id} className="tag tag-purple">{f.icon} {f.name.length>22?f.name.substring(0,19)+"…":f.name}</span>)}</div>}
        {messages.length===1&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:8}}>{SUGGESTIONS.map((s,i)=><div key={i} onClick={()=>setInput(s)} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:"var(--r2)",padding:"8px 11px",cursor:"pointer",fontSize:11.5,color:"var(--text2)",transition:"all .15s",lineHeight:1.4}} onMouseEnter={e=>e.currentTarget.style.borderColor="var(--accent)"} onMouseLeave={e=>e.currentTarget.style.borderColor="var(--border)"}><span style={{color:"var(--accent2)",marginRight:4}}>💡</span>{s}</div>)}</div>}
        {messages.map((m,i)=>(
          <div key={i} className={`msg ${m.role}`}>
            <div className={`msg-av ${m.role==="ai"?"ai":"user"}`}>{m.role==="ai"?"🤖":"A"}</div>
            <div className="msg-bubble">
              {m.streaming&&!m.content?<div className="typing-dots"><span/><span/><span/></div>:<div className="ai-content" dangerouslySetInnerHTML={{__html:renderContent(m.content)}}/>}
              {m.streaming&&m.content&&<span style={{display:"inline-block",width:8,height:14,background:"var(--accent)",marginLeft:2,animation:"blink 0.8s infinite",verticalAlign:"middle"}}/>}
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>
      <div className="chat-input-area">
        <textarea className="chat-textarea" placeholder="Ask anything — solve problems, explain concepts, generate questions…" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}} rows={1}/>
        <button className="btn btn-primary" onClick={send} disabled={loading||!input.trim()}>{loading?<div className="spinner"/>:"Send ↗"}</button>
      </div>
    </div>
  );
}

// ── MATERIALS ─────────────────────────────────────────────────────────────────
function MaterialsPage({uploadedFiles,setUploadedFiles}) {
  const [dragging,setDragging]=useState(false);
  const [processing,setProcessing]=useState(null);
  const [result,setResult]=useState(null);
  const fileRef=useRef(null);
  function fmtSize(b){return b>1024*1024?`${(b/1024/1024).toFixed(1)} MB`:`${(b/1024).toFixed(0)} KB`;}
  function getIcon(n){return n.endsWith(".pdf")?"📄":n.endsWith(".docx")||n.endsWith(".doc")?"📝":"📁";}
  function handleFiles(files){
    for(const f of Array.from(files)){
      if(f.size>400*1024*1024){alert(`${f.name} exceeds 400MB`);continue;}
      const entry={id:Date.now()+Math.random(),name:f.name,size:fmtSize(f.size),status:"processing",icon:getIcon(f.name),pages:"—",file:f};
      setUploadedFiles(p=>[...p,entry]);
      setTimeout(()=>setUploadedFiles(p=>p.map(x=>x.id===entry.id?{...x,status:"processed",pages:Math.floor(50+Math.random()*250)}:x)),2000);
    }
  }
  async function analyze(file,type){
    setProcessing(file.id+type);setResult(null);
    const prompts={
      summary:`Analyze study material titled "${file.name}" and provide:\n1. **Overview** - What this covers\n2. **Key Concepts** - 10 most important with explanations\n3. **Important Formulas/Reactions** - List all key ones\n4. **High-Priority Exam Topics** - What's most likely to appear in JEE/NEET\n5. **Common Mistakes** - What students get wrong\n6. **Quick Revision Points** - 5 bullet points to remember\nBe thorough and exam-focused.`,
      questions:`Generate exam-ready questions from "${file.name}":\n**5 MCQs** (with 4 options, mark correct with ✓, include brief explanation)\n**3 Short Answer Questions** (2-3 marks each)\n**2 Long Questions** (5 marks, conceptual depth)\n**3 Numerical Problems** (calculation-based)\nMake them JEE/NEET standard difficulty.`,
      concepts:`Create a concept map outline for "${file.name}":\n1. **Central Theme**\n2. **Major Branches** (5-7 main topics)\n3. **Key Connections** between topics\n4. **Prerequisites** for understanding\n5. **Applications** in real problems\n6. **Difficulty Hierarchy** - easy to hard learning order\nFormat clearly with relationships shown.`,
    };
    const t=await callAI("You are an expert JEE/NEET study assistant. Analyze study materials thoroughly and helpfully.",prompts[type]);
    setResult({fileId:file.id,content:t,type});setProcessing(null);
  }
  return (
    <div className="page-content">
      <div className="grid-2 mb-4">
        <div>
          <div className={`upload-zone ${dragging?"drag-over":""}`} onClick={()=>fileRef.current?.click()} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}}>
            <input ref={fileRef} type="file" multiple accept=".pdf,.doc,.docx" style={{display:"none"}} onChange={e=>handleFiles(e.target.files)}/>
            <div style={{fontSize:28,marginBottom:8}}>📤</div>
            <div style={{fontSize:13.5,fontWeight:600,marginBottom:4}}>Drop files or click to upload</div>
            <div style={{fontSize:11.5,color:"var(--text3)",marginBottom:10}}>PDF, DOC, DOCX · Up to <strong style={{color:"var(--accent2)"}}>400 MB</strong> per file</div>
            <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>Choose Files</button>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-2 mb-3"><span>📚</span><span style={{fontSize:12.5,fontWeight:600}}>Material Intelligence</span></div>
          {[{label:"Total Files",val:`${uploadedFiles.length} files`},{label:"Max Upload",val:"400 MB per file"},{label:"AI Analysis",val:"Summary + Questions + Concepts"},{label:"AI Chat",val:"Ask anything from your PDFs"}].map((s,i)=><div key={i} className="flex items-center gap-2" style={{padding:"6px 0",borderBottom:i<3?"1px solid var(--border)":"none"}}><span className="text-sm text-muted" style={{flex:1}}>{s.label}</span><span className="text-sm font-bold">{s.val}</span></div>)}
        </div>
      </div>
      <div className="card mb-4">
        <div className="flex items-center gap-2 mb-3"><span>📁</span><span style={{fontSize:13.5,fontWeight:600}}>Uploaded Materials</span><span className="badge">{uploadedFiles.length}</span></div>
        {uploadedFiles.length===0&&<div style={{textAlign:"center",padding:20,color:"var(--text3)",fontSize:12.5}}>No files yet. Upload your study materials above.</div>}
        {uploadedFiles.map(f=>(
          <div key={f.id} className="file-item">
            <div style={{fontSize:20}}>{f.icon}</div>
            <div className="file-meta"><div className="file-name">{f.name}</div><div className="file-size">{f.size}</div></div>
            <span className={`file-status status-${f.status}`}>{f.status}</span>
            {f.status==="processed"&&<div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
              <button className="btn btn-secondary btn-xs" onClick={()=>analyze(f,"summary")} disabled={!!processing}>{processing===f.id+"summary"?<><div className="spinner"/>…</>:"✨ Summary"}</button>
              <button className="btn btn-gold btn-xs" onClick={()=>analyze(f,"questions")} disabled={!!processing}>{processing===f.id+"questions"?<><div className="spinner"/>…</>:"❓ Questions"}</button>
              <button className="btn btn-green btn-xs" onClick={()=>analyze(f,"concepts")} disabled={!!processing}>{processing===f.id+"concepts"?<><div className="spinner"/>…</>:"🗺️ Concepts"}</button>
            </div>}
          </div>
        ))}
      </div>
      {result&&<div className="card"><div className="flex items-center gap-2 mb-3"><span>{result.type==="summary"?"✨":result.type==="questions"?"❓":"🗺️"}</span><span style={{fontSize:13.5,fontWeight:600}}>{result.type==="summary"?"AI Full Summary":result.type==="questions"?"AI-Generated Questions":"Concept Map Analysis"}</span><span className="tag tag-purple">Ollama 318B</span></div><div className="ai-content" dangerouslySetInnerHTML={{__html:result.content.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ").replace(/^#{1,3} /gm,"")}}/></div>}
    </div>
  );
}

// ── MOCK TEST ─────────────────────────────────────────────────────────────────
function MockTestPage() {
  const [phase,setPhase]=useState("setup");
  const [cfg,setCfg]=useState({subject:"Mixed",numQ:10,time:600,difficulty:"Mixed"});
  const [questions,setQuestions]=useState([]);
  const [currentQ,setCurrentQ]=useState(0);
  const [answers,setAnswers]=useState({});
  const [timeLeft,setTimeLeft]=useState(600);
  const [showAnswer,setShowAnswer]=useState(false);
  const [generating,setGenerating]=useState(false);
  const [aiQ,setAiQ]=useState(null);
  const timerRef=useRef(null);
  useEffect(()=>{if(phase==="test"){timerRef.current=setInterval(()=>{setTimeLeft(t=>{if(t<=1){clearInterval(timerRef.current);setPhase("result");return 0;}return t-1;});},1000);}return()=>clearInterval(timerRef.current);},[phase]);
  function startTest(){const pool=[...QUESTIONS_BANK];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}const selected=pool.slice(0,Math.min(cfg.numQ,pool.length));while(selected.length<cfg.numQ)selected.push({...pool[selected.length%pool.length],id:Date.now()+selected.length});setQuestions(selected);setAnswers({});setTimeLeft(cfg.time);setCurrentQ(0);setPhase("test");}
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const score=Object.entries(answers).reduce((acc,[qi,ans])=>acc+(questions[qi]?.correct===ans?1:0),0);
  const pct=questions.length>0?Math.round((score/questions.length)*100):0;
  async function genAIQ(){setGenerating(true);setAiQ(null);const t=await callAI("You are a JEE exam question generator. Generate ONE MCQ:\nQ: [question]\nA: [opt1]\nB: [opt2]\nC: [opt3]\nD: [opt4]\nANS: [A/B/C/D]\nEXPLAIN: [explanation]",`Generate a ${cfg.difficulty==="Mixed"?"medium":cfg.difficulty.toLowerCase()} difficulty JEE MCQ on ${cfg.subject==="Mixed"?"Mechanics, Electrostatics, Organic Chemistry, or Calculus":cfg.subject}.`);setAiQ(t);setGenerating(false);}
  const timeOpts=[{l:"10 min",v:600},{l:"20 min",v:1200},{l:"30 min",v:1800},{l:"60 min",v:3600},{l:"90 min",v:5400},{l:"180 min",v:10800}];
  if(phase==="setup")return(
    <div className="page-content"><div className="grid-2"><div><div className="card mb-4">
      <div className="flex items-center gap-2 mb-3"><span>⚙️</span><span style={{fontSize:13.5,fontWeight:600}}>Configure Mock Test</span></div>
      <div className="input-group"><label className="input-label">Subject</label><select className="input" onChange={e=>setCfg(c=>({...c,subject:e.target.value}))}>{["Mixed","Physics","Chemistry","Mathematics","Biology"].map(o=><option key={o}>{o}</option>)}</select></div>
      <div className="input-group">
        <label className="input-label">Questions (1–100, any number)</label>
        <div style={{display:"flex",gap:7,alignItems:"center"}}>
          <input className="input" type="number" min="1" max="100" value={cfg.numQ} onChange={e=>setCfg(c=>({...c,numQ:Math.max(1,Math.min(100,parseInt(e.target.value)||1))}))} style={{flex:1}}/>
          <div style={{display:"flex",gap:4}}>{[5,10,20,30,50,75,100].map(n=><button key={n} className={`btn btn-xs ${cfg.numQ===n?"btn-primary":"btn-ghost"}`} onClick={()=>setCfg(c=>({...c,numQ:n}))}>{n}</button>)}</div>
        </div>
      </div>
      <div className="input-group"><label className="input-label">Time Limit</label><select className="input" onChange={e=>setCfg(c=>({...c,time:parseInt(e.target.value)}))}>{ timeOpts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select></div>
      <div className="input-group"><label className="input-label">Difficulty</label><select className="input" onChange={e=>setCfg(c=>({...c,difficulty:e.target.value}))}>{["Mixed","Easy","Medium","Hard","JEE Advanced"].map(o=><option key={o}>{o}</option>)}</select></div>
      <div style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:"var(--r2)",padding:"10px 12px",marginBottom:14,fontSize:12.5,color:"var(--text2)"}}>📋 <strong style={{color:"var(--accent2)"}}>{cfg.numQ} questions</strong> · <strong style={{color:"var(--accent2)"}}>{timeOpts.find(o=>o.v===cfg.time)?.l}</strong> · {cfg.subject} · {cfg.difficulty}</div>
      <button className="btn btn-primary w-full" onClick={startTest}>🚀 Start Mock Test</button>
    </div></div>
    <div>
      <div className="card mb-3"><div className="flex items-center gap-2 mb-3"><span>🤖</span><span style={{fontSize:12.5,fontWeight:600}}>AI Question Generator</span><span className="tag tag-purple">Ollama</span></div><p className="text-sm text-muted mb-3">Generate a fresh AI question targeting your weak areas.</p><button className="btn btn-secondary w-full" onClick={genAIQ} disabled={generating}>{generating?<><div className="spinner"/>Generating…</>:"✨ Generate AI Question"}</button>{aiQ&&<div style={{marginTop:12,background:"var(--bg3)",borderRadius:"var(--r2)",padding:12,border:"1px solid var(--border2)"}}><div style={{fontSize:9,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:7}}>AI Question</div><div className="ai-content text-sm" dangerouslySetInnerHTML={{__html:aiQ.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")}}/></div>}</div>
      <div className="card"><div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>📊 Recent Tests</div>{STUDENT.recentTests?.slice?.(0,3).map((t,i)=><div key={i} className="flex items-center gap-3" style={{padding:"7px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}><div style={{flex:1}}><div className="text-sm">{t.name}</div><div className="text-xs text-dim">{t.date}</div></div><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:12,fontWeight:600,color:t.score>=80?"var(--green)":t.score>=65?"var(--gold)":"var(--red)"}}>{t.score}%</div></div>)||null}</div>
    </div></div></div>
  );
  if(phase==="result")return(
    <div className="page-content">
      <div style={{textAlign:"center",padding:"28px 20px",background:"linear-gradient(135deg,var(--surface2),var(--surface))",border:"1px solid var(--border2)",borderRadius:"var(--r)",marginBottom:16}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:54,fontWeight:800,color:pct>=80?"var(--green)":pct>=60?"var(--gold)":"var(--red)",marginBottom:8}}>{pct}%</div>
        <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:20,marginBottom:7}}>{pct>=80?"🏆 Excellent!":pct>=60?"👍 Good Effort!":"📚 Keep Going!"}</h2>
        <p className="text-muted text-sm">{score}/{questions.length} correct</p>
      </div>
      <div className="grid-2">
        <div className="card"><div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>Question Review</div><div style={{maxHeight:320,overflowY:"auto"}}>{questions.map((q,i)=>{const ok=answers[i]===q.correct;return<div key={i} style={{padding:"8px 0",borderBottom:i<questions.length-1?"1px solid var(--border)":"none"}}><div className="flex items-center gap-2 mb-1"><span>{ok?"✅":"❌"}</span><span className="text-sm" style={{flex:1}}>{q.topic}</span><span className="tag" style={{background:ok?"rgba(34,197,94,0.1)":"rgba(244,63,94,0.1)",color:ok?"var(--green)":"var(--red)"}}>{ok?"Correct":"Wrong"}</span></div><div className="text-xs text-dim">{q.q.substring(0,65)}…</div></div>;})} </div></div>
        <div><div className="card mb-3"><div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>📊 Results</div><div style={{display:"flex",gap:10,marginBottom:14}}>{[{l:"Score",v:`${pct}%`},{l:"Correct",v:score},{l:"Wrong",v:questions.length-score}].map((s,i)=><div key={i} style={{flex:1,textAlign:"center",background:"var(--bg3)",borderRadius:"var(--r2)",padding:"10px 5px"}}><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:i===0?pct>=80?"var(--green)":"var(--gold)":i===1?"var(--green)":"var(--red)"}}>{s.v}</div><div style={{fontSize:10,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>{s.l}</div></div>)}</div></div>
        <button className="btn btn-primary w-full mb-2" onClick={()=>{setPhase("setup");setAnswers({});setCurrentQ(0);}}>🔄 Take Another Test</button>
        <button className="btn btn-secondary w-full">📊 Full Analytics</button></div>
      </div>
    </div>
  );
  const q=questions[currentQ];if(!q)return null;
  return(
    <div className="page-content">
      <div className="test-header">
        <div><div className="text-xs text-dim mb-1" style={{fontFamily:"'JetBrains Mono',monospace"}}>Q {currentQ+1} of {questions.length}</div><div style={{display:"flex",gap:2,flexWrap:"wrap",maxWidth:280}}>{questions.map((_,i)=><div key={i} style={{width:Math.max(5,Math.min(20,260/questions.length)),height:3,borderRadius:2,background:answers[i]!==undefined?"var(--accent)":i===currentQ?"var(--accent2)":"var(--bg3)",transition:"background .3s"}}/>)}</div></div>
        <div className="timer">{fmt(timeLeft)}</div>
        <div style={{display:"flex",gap:5}}><span className="tag tag-blue">{q.topic}</span><span className="tag" style={{background:q.difficulty==="Easy"?"rgba(34,197,94,0.1)":q.difficulty==="Medium"?"rgba(251,191,36,0.1)":"rgba(244,63,94,0.1)",color:q.difficulty==="Easy"?"var(--green)":q.difficulty==="Medium"?"var(--gold)":"var(--red)"}}>{q.difficulty}</span></div>
      </div>
      <div className="q-card"><div style={{fontSize:9.5,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1.5,marginBottom:7}}>Question {currentQ+1}</div><div className="q-text">{q.q}</div>{q.opts.map((opt,i)=>{let cls="option";if(showAnswer){if(i===q.correct)cls+=" correct";else if(i===answers[currentQ]&&i!==q.correct)cls+=" wrong";}else if(answers[currentQ]===i)cls+=" selected";return<div key={i} className={cls} onClick={()=>!showAnswer&&setAnswers(a=>({...a,[currentQ]:i}))}><div className="option-letter">{String.fromCharCode(65+i)}</div>{opt}</div>;})}</div>
      <div className="flex gap-2" style={{justifyContent:"space-between"}}>
        <button className="btn btn-secondary" onClick={()=>setCurrentQ(q=>Math.max(0,q-1))} disabled={currentQ===0}>← Prev</button>
        <div className="flex gap-2"><button className="btn btn-ghost" onClick={()=>setShowAnswer(!showAnswer)}>{showAnswer?"Hide":"Show"} Answer</button>{currentQ<questions.length-1?<button className="btn btn-primary" onClick={()=>{setCurrentQ(q=>q+1);setShowAnswer(false);}}>Next →</button>:<button className="btn btn-primary" onClick={()=>{clearInterval(timerRef.current);setPhase("result");}}>Submit 🎯</button>}</div>
      </div>
    </div>
  );
}

// ── FORMULA LIBRARY ───────────────────────────────────────────────────────────
function FormulaLibrary() {
  const [search,setSearch]=useState("");
  const [subject,setSubject]=useState("All");
  const [selected,setSelected]=useState(null);
  const [aiExplain,setAiExplain]=useState(null);
  const [explaining,setExplaining]=useState(false);
  const filtered=FORMULAS.filter(f=>(subject==="All"||f.subject===subject)&&(f.name.toLowerCase().includes(search.toLowerCase())||f.eq.toLowerCase().includes(search.toLowerCase())||f.subject.toLowerCase().includes(search.toLowerCase())));
  async function explainFormula(f){
    setExplaining(true);setAiExplain(null);
    const t=await callAI("You are an expert JEE/NEET tutor. Explain formulas clearly and helpfully.",`Explain this formula in depth:\n${f.name}: ${f.eq}\n\nProvide:\n1. **Derivation** (brief, from first principles)\n2. **Variables explained** (what each symbol means with units)\n3. **When to use it** (conditions and applications)\n4. **Common mistakes** students make\n5. **JEE/NEET exam tricks** for this formula\n6. **Solved example** applying this formula`);
    setAiExplain(t);setExplaining(false);
  }
  return(
    <div className="page-content">
      <div className="flex items-center gap-2 mb-4" style={{flexWrap:"wrap"}}>
        <input className="input" placeholder="Search formulas…" value={search} onChange={e=>setSearch(e.target.value)} style={{flex:1,minWidth:200}}/>
        <div className="tabs" style={{marginBottom:0}}>
          {["All","Physics","Chemistry","Math"].map(s=><div key={s} className={`tab ${subject===s?"active":""}`} onClick={()=>setSubject(s)}>{s}</div>)}
        </div>
      </div>
      <div className="grid-2">
        <div>
          <div style={{fontSize:11,color:"var(--text3)",marginBottom:10,fontFamily:"'JetBrains Mono',monospace"}}>{filtered.length} formulas found</div>
          <div style={{maxHeight:"calc(100vh - 220px)",overflowY:"auto"}}>
            {filtered.map((f,i)=>(
              <div key={i} className="formula-item" style={{borderColor:selected?.name===f.name?"var(--accent)":"var(--border)"}} onClick={()=>{setSelected(f);setAiExplain(null);}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}><span className={`tag ${f.subject==="Physics"?"tag-blue":f.subject==="Chemistry"?"tag-green":"tag-purple"}`}>{f.subject}</span><div className="formula-name">{f.name}</div></div>
                <div className="formula-eq">{f.eq}</div>
                <div className="formula-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div>
          {selected?<div className="card">
            <div className="flex items-center gap-2 mb-3"><span className={`tag ${selected.subject==="Physics"?"tag-blue":selected.subject==="Chemistry"?"tag-green":"tag-purple"}`}>{selected.subject}</span><span style={{fontSize:13.5,fontWeight:600}}>{selected.name}</span></div>
            <div style={{background:"var(--bg3)",borderRadius:"var(--r2)",padding:"12px 14px",marginBottom:12,border:"1px solid var(--border2)"}}><div style={{fontFamily:"'JetBrains Mono',monospace",fontSize:16,color:"var(--accent2)",textAlign:"center",marginBottom:6}}>{selected.eq}</div><div style={{fontSize:12,color:"var(--text2)",textAlign:"center"}}>{selected.desc}</div></div>
            <button className="btn btn-primary w-full mb-3" onClick={()=>explainFormula(selected)} disabled={explaining}>{explaining?<><div className="spinner"/>Explaining with Ollama 318B…</>:"🤖 AI Deep Explanation"}</button>
            {aiExplain&&<div className="ai-content" dangerouslySetInnerHTML={{__html:aiExplain.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/>}
          </div>:<div className="card" style={{textAlign:"center",padding:"40px 20px",color:"var(--text3)"}}><div style={{fontSize:36,marginBottom:12}}>📐</div><div style={{fontSize:13.5,fontWeight:600,marginBottom:6}}>Select a formula</div><div style={{fontSize:12}}>Click any formula to see AI deep explanation with derivation and JEE tricks</div></div>}
        </div>
      </div>
    </div>
  );
}

// ── PYQ BANK ──────────────────────────────────────────────────────────────────
function PYQBank() {
  const [year,setYear]=useState("All");
  const [topic,setTopic]=useState("All");
  const [aiSolve,setAiSolve]=useState({});
  const [solving,setSolving]=useState(null);
  const filtered=PYQ_DATA.filter(q=>(year==="All"||q.year===parseInt(year))&&(topic==="All"||q.topic===topic));
  const years=["All",...[...new Set(PYQ_DATA.map(q=>q.year))].sort((a,b)=>b-a)];
  const topics=["All",...new Set(PYQ_DATA.map(q=>q.topic))];
  async function solve(q,i){
    setSolving(i);
    const t=await callAI("You are a JEE expert. Solve questions with complete step-by-step working.",`Solve this ${q.year} ${q.exam} question:\n${q.q}\n\nProvide: 1) Complete solution with steps 2) Key concepts used 3) Common traps 4) Similar questions to practice`);
    setAiSolve(prev=>({...prev,[i]:t}));setSolving(null);
  }
  return(
    <div className="page-content">
      <div className="flex items-center gap-2 mb-4">
        <div className="tabs" style={{marginBottom:0}}>
          {years.map(y=><div key={y} className={`tab ${year===String(y)?"active":""}`} onClick={()=>setYear(String(y))}>{y}</div>)}
        </div>
        <div className="tabs" style={{marginBottom:0}}>
          {topics.map(t=><div key={t} className={`tab ${topic===t?"active":""}`} onClick={()=>setTopic(t)}>{t}</div>)}
        </div>
      </div>
      <div style={{fontSize:11,color:"var(--text3)",marginBottom:12,fontFamily:"'JetBrains Mono',monospace"}}>{filtered.length} questions found</div>
      {filtered.map((q,i)=>(
        <div key={i} className="pyq-card">
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8,flexWrap:"wrap"}}>
            <span className="tag tag-purple">{q.year}</span>
            <span className="tag tag-blue">{q.exam}</span>
            <span className="tag tag-teal">{q.topic}</span>
            <span className="tag" style={{background:q.difficulty==="Easy"?"rgba(34,197,94,0.1)":"rgba(251,191,36,0.1)",color:q.difficulty==="Easy"?"var(--green)":"var(--gold)"}}>{q.difficulty}</span>
            <span className="tag tag-gold">{q.marks} marks</span>
          </div>
          <div style={{fontSize:13,fontWeight:500,marginBottom:10,lineHeight:1.65}}>{q.q}</div>
          <button className="btn btn-secondary btn-sm" onClick={()=>solve(q,i)} disabled={solving===i}>{solving===i?<><div className="spinner"/>Solving…</>:"🤖 AI Full Solution"}</button>
          {aiSolve[i]&&<div style={{marginTop:12,borderTop:"1px solid var(--border)",paddingTop:12}}><div style={{fontSize:9,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1,marginBottom:7}}>Ollama 318B Solution</div><div className="ai-content" dangerouslySetInnerHTML={{__html:aiSolve[i].replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/></div>}
        </div>
      ))}
    </div>
  );
}

// ── POMODORO TIMER ────────────────────────────────────────────────────────────
function PomodoroTimer() {
  const [mode,setMode]=useState("focus");
  const [timeLeft,setTimeLeft]=useState(25*60);
  const [running,setRunning]=useState(false);
  const [sessions,setSessions]=useState(0);
  const [topic,setTopic]=useState("Electrostatics");
  const [totalStudied,setTotalStudied]=useState(0);
  const intRef=useRef(null);
  const MODES={focus:{label:"Focus",time:25*60,color:"var(--accent)"},short:{label:"Short Break",time:5*60,color:"var(--green)"},long:{label:"Long Break",time:15*60,color:"var(--blue)"}};
  useEffect(()=>{if(running){intRef.current=setInterval(()=>{setTimeLeft(t=>{if(t<=1){clearInterval(intRef.current);setRunning(false);if(mode==="focus"){setSessions(s=>s+1);setTotalStudied(s=>s+25);}return MODES[mode].time;}return t-1;});},1000);}else clearInterval(intRef.current);return()=>clearInterval(intRef.current);},[running,mode]);
  function switchMode(m){setMode(m);setTimeLeft(MODES[m].time);setRunning(false);}
  const pct=((MODES[mode].time-timeLeft)/MODES[mode].time)*100;
  const r=90,circ=2*Math.PI*r,dash=(pct/100)*circ;
  const fmt=s=>`${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;
  const topics=["Electrostatics","Organic Chem","Calculus","Mechanics","Thermodynamics","Wave Optics","Modern Physics"];
  return(
    <div className="page-content">
      <div className="grid-2">
        <div className="card" style={{textAlign:"center",padding:30}}>
          <div style={{display:"flex",gap:6,justifyContent:"center",marginBottom:24}}>
            {Object.entries(MODES).map(([k,v])=><button key={k} className={`btn btn-sm ${mode===k?"btn-primary":"btn-ghost"}`} onClick={()=>switchMode(k)}>{v.label}</button>)}
          </div>
          <div className="pomodoro-circle" style={{marginBottom:20}}>
            <svg width={220} height={220} viewBox="0 0 220 220">
              <circle cx={110} cy={110} r={r} fill="none" stroke="var(--bg3)" strokeWidth={10}/>
              <circle cx={110} cy={110} r={r} fill="none" stroke={MODES[mode].color} strokeWidth={10} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 110 110)" style={{transition:"stroke-dasharray 0.5s ease"}}/>
            </svg>
            <div className="pomodoro-time" style={{position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)"}}>
              <div className="pomodoro-min">{fmt(timeLeft)}</div>
              <div className="pomodoro-lbl">{MODES[mode].label.toUpperCase()}</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:3,fontFamily:"'JetBrains Mono',monospace"}}>{topic}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:10,justifyContent:"center"}}>
            <button className={`btn ${running?"btn-red":"btn-primary"}`} onClick={()=>setRunning(r=>!r)} style={{padding:"10px 30px",fontSize:14,fontWeight:600}}>{running?"⏸ Pause":"▶ Start"}</button>
            <button className="btn btn-ghost" onClick={()=>{setRunning(false);setTimeLeft(MODES[mode].time);}}>↺ Reset</button>
          </div>
        </div>
        <div>
          <div className="card mb-3">
            <div style={{fontSize:12.5,fontWeight:600,marginBottom:12}}>⚙️ Session Settings</div>
            <div className="input-group"><label className="input-label">Studying Topic</label><select className="input" value={topic} onChange={e=>setTopic(e.target.value)}>{topics.map(t=><option key={t}>{t}</option>)}</select></div>
          </div>
          <div className="card mb-3">
            <div style={{fontSize:12.5,fontWeight:600,marginBottom:12}}>📊 Today's Stats</div>
            {[{l:"Sessions Completed",v:sessions},{l:"Total Time Studied",v:`${totalStudied} min`},{l:"Focus Score",v:`${Math.min(100,sessions*20)}%`}].map((s,i)=>(
              <div key={i} className="flex items-center gap-2" style={{padding:"7px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}>
                <span className="text-sm text-muted" style={{flex:1}}>{s.l}</span>
                <span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:"var(--accent2)"}}>{s.v}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>🏆 Session Badges</div>
            {[{min:1,icon:"🌱",label:"First Session"},{min:4,icon:"🔥",label:"On Fire (4 sessions)"},{min:8,icon:"⚡",label:"Power Study (8 sessions)"},{min:12,icon:"🏆",label:"Champion (12 sessions)"}].map((b,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<3?"1px solid var(--border)":"none",opacity:sessions>=b.min?1:0.35}}>
                <span style={{fontSize:20}}>{b.icon}</span>
                <div style={{flex:1,fontSize:12.5}}>{b.label}</div>
                {sessions>=b.min&&<span className="tag tag-green">Earned!</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── CONCEPT MAPPER ────────────────────────────────────────────────────────────
function ConceptMapper() {
  const [topic,setTopic]=useState("Electrostatics");
  const [map,setMap]=useState(null);
  const [generating,setGenerating]=useState(false);
  async function generate(){
    setGenerating(true);setMap(null);
    const t=await callAI("You are an expert concept map creator for JEE/NEET.",`Create a detailed concept map for "${topic}" with:\n1. **Central Concept**: Main idea\n2. **Core Subtopics** (6-8): Key areas with 2-3 key points each\n3. **Connections**: How subtopics relate to each other\n4. **Key Formulas**: Most important formulas for each subtopic\n5. **Common Applications**: Real exam problem types\n6. **Prerequisites**: What students need to know first\n7. **Advanced Topics**: What this leads to\n\nFormat clearly with **bold** headings.`);
    setMap(t);setGenerating(false);
  }
  const topics=["Electrostatics","Magnetism","Thermodynamics","Mechanics","Organic Chemistry","Wave Optics","Calculus","Vectors","Modern Physics","Chemical Bonding"];
  return(
    <div className="page-content">
      <div className="card mb-4">
        <div style={{fontSize:13.5,fontWeight:600,marginBottom:12}}>🗺️ Concept Map Generator</div>
        <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap"}}>
          {topics.map(t=><button key={t} className={`btn btn-sm ${topic===t?"btn-primary":"btn-ghost"}`} onClick={()=>setTopic(t)}>{t}</button>)}
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={generating}>{generating?<><div className="spinner"/>Generating concept map…</>:`🗺️ Generate Map for ${topic}`}</button>
      </div>
      {map&&<div className="card"><div className="flex items-center gap-2 mb-3"><span>🗺️</span><span style={{fontSize:13.5,fontWeight:600}}>Concept Map: {topic}</span><span className="tag tag-purple">Ollama 318B</span></div><div className="ai-content" dangerouslySetInnerHTML={{__html:map.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/></div>}
      {!map&&!generating&&<div className="grid-3">{topics.map((t,i)=><div key={i} className="card" style={{cursor:"pointer",textAlign:"center",padding:18}} onClick={()=>{setTopic(t);generate();}}><div style={{fontSize:24,marginBottom:8}}>{["⚡","🧲","🔥","⚙️","🧪","🌊","∫","➡️","⚛️","🔬"][i]}</div><div style={{fontSize:13,fontWeight:600,marginBottom:4}}>{t}</div><div style={{fontSize:10.5,color:"var(--text3)"}}>Click to generate map</div></div>)}</div>}
    </div>
  );
}

// ── SYLLABUS TRACKER ──────────────────────────────────────────────────────────
function SyllabusTracker() {
  const [data,setData]=useState(SYLLABUS);
  const [aiPlan,setAiPlan]=useState(null);
  const [generating,setGenerating]=useState(false);
  const overall=Math.round(data.flatMap(s=>s.topics).reduce((a,t)=>a+t.done,0)/data.flatMap(s=>s.topics).length);
  function updateTopic(si,ti,val){setData(d=>d.map((s,i)=>i===si?{...s,topics:s.topics.map((t,j)=>j===ti?{...t,done:parseInt(val)}:t)}:s));}
  async function getAiPlan(){
    setGenerating(true);
    const weakTopics=data.flatMap(s=>s.topics.filter(t=>t.done<70).map(t=>t.name));
    const t=await callAI("You are an expert JEE study planner.","Based on syllabus coverage, create a targeted study plan.\nWeak topics (< 70% done): "+weakTopics.join(", ")+"\nExam in 18 days. Provide specific daily plan for the next 7 days focusing on gaps.");
    setAiPlan(t);setGenerating(false);
  }
  return(
    <div className="page-content">
      <div className="stats-grid mb-4" style={{gridTemplateColumns:"repeat(4,1fr)"}}>
        <div className="stat-card" style={{"--accent-color":"var(--accent)"}}><div className="stat-label">Overall Coverage</div><div className="stat-value" style={{color:"var(--accent)"}}>{overall}%</div></div>
        {data.map((s,i)=>{const avg=Math.round(s.topics.reduce((a,t)=>a+t.done,0)/s.topics.length);return<div key={i} className="stat-card" style={{"--accent-color":avg>=70?"var(--green)":"var(--red)"}}><div className="stat-label">{s.subject}</div><div className="stat-value" style={{color:avg>=70?"var(--green)":"var(--red)"}}>{avg}%</div></div>;})}
      </div>
      <div className="grid-2 mb-4">
        {data.map((sub,si)=>(
          <div key={si} className="card">
            <div style={{fontSize:13.5,fontWeight:600,marginBottom:12}}>{sub.subject} Coverage</div>
            {sub.topics.map((t,ti)=>(
              <div key={ti} style={{marginBottom:10}}>
                <div className="flex items-center gap-2 mb-1">
                  <span style={{flex:1,fontSize:12.5}}>{t.name}</span>
                  <span style={{fontSize:11,fontWeight:600,color:t.done>=80?"var(--green)":t.done>=60?"var(--gold)":"var(--red)",fontFamily:"'JetBrains Mono',monospace"}}>{t.done}%</span>
                  <input type="range" min="0" max="100" value={t.done} onChange={e=>updateTopic(si,ti,e.target.value)} style={{width:60,accentColor:"var(--accent)"}}/>
                </div>
                <ProgressBar value={t.done} color={t.done>=80?"var(--green)":t.done>=60?"var(--gold)":"var(--red)"}/>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="card">
        <div className="flex items-center gap-2 mb-3"><span>🤖</span><span style={{fontSize:12.5,fontWeight:600}}>AI Gap Analysis & Study Plan</span></div>
        <button className="btn btn-primary mb-3" onClick={getAiPlan} disabled={generating}>{generating?<><div className="spinner"/>Analyzing gaps…</>:"🎯 Generate AI Gap-Filling Plan"}</button>
        {aiPlan&&<div className="ai-content" dangerouslySetInnerHTML={{__html:aiPlan.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/>}
      </div>
    </div>
  );
}

// ── ERROR JOURNAL ─────────────────────────────────────────────────────────────
function ErrorJournal() {
  const [errors,setErrors]=useState([
    {id:1,topic:"Electrostatics",question:"Electric field due to infinite line charge",mistake:"Forgot to account for 2π in the denominator",concept:"Gauss's Law",date:"May 1",fixed:false},
    {id:2,topic:"Org.Chem",question:"Mechanism of aldol condensation",mistake:"Confused enol with enolate ion",concept:"Carbonyl chemistry",date:"Apr 30",fixed:true},
    {id:3,topic:"Calculus",question:"∫x·sin(x)dx",mistake:"Wrong sign in integration by parts",concept:"Integration techniques",date:"Apr 28",fixed:false},
  ]);
  const [newErr,setNewErr]=useState({topic:"",question:"",mistake:"",concept:""});
  const [aiAnalysis,setAiAnalysis]=useState(null);
  const [analyzing,setAnalyzing]=useState(false);
  async function analyzeErrors(){
    setAnalyzing(true);
    const errList=errors.map(e=>`Topic: ${e.topic}, Mistake: ${e.mistake}`).join("\n");
    const t=await callAI("You are an expert JEE tutor analyzing student error patterns.",`Analyze these recurring mistakes:\n${errList}\n\nProvide:\n1. **Pattern Analysis** - What these mistakes reveal\n2. **Root Causes** - Why the student keeps making these errors\n3. **Specific Remedies** - Exact steps to fix each pattern\n4. **Practice Strategy** - What to practice to eliminate these errors\n5. **Memory Tricks** - To avoid these mistakes in future`);
    setAiAnalysis(t);setAnalyzing(false);
  }
  function addError(){
    if(!newErr.topic||!newErr.question)return;
    setErrors(e=>[...e,{...newErr,id:Date.now(),date:"Today",fixed:false}]);
    setNewErr({topic:"",question:"",mistake:"",concept:""});
  }
  return(
    <div className="page-content">
      <div className="grid-2 mb-4">
        <div className="card">
          <div style={{fontSize:13.5,fontWeight:600,marginBottom:12}}>➕ Log New Mistake</div>
          {[{l:"Topic",k:"topic",ph:"e.g. Electrostatics"},{l:"Question",k:"question",ph:"What was the question?"},{l:"My Mistake",k:"mistake",ph:"What did I do wrong?"},{l:"Correct Concept",k:"concept",ph:"What should I know?"}].map(f=><div key={f.k} className="input-group"><label className="input-label">{f.l}</label><input className="input" placeholder={f.ph} value={newErr[f.k]} onChange={e=>setNewErr(n=>({...n,[f.k]:e.target.value}))}/></div>)}
          <button className="btn btn-primary w-full" onClick={addError}>➕ Add to Error Journal</button>
        </div>
        <div className="card">
          <div style={{fontSize:13.5,fontWeight:600,marginBottom:12}}>📊 Error Stats</div>
          {[{l:"Total Errors Logged",v:errors.length},{l:"Fixed",v:errors.filter(e=>e.fixed).length},{l:"Still Pending",v:errors.filter(e=>!e.fixed).length},{l:"Most Problematic",v:errors[0]?.topic||"—"}].map((s,i)=><div key={i} className="flex items-center gap-2" style={{padding:"7px 0",borderBottom:i<3?"1px solid var(--border)":"none"}}><span className="text-sm text-muted" style={{flex:1}}>{s.l}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:"var(--accent2)"}}>{s.v}</span></div>)}
          <button className="btn btn-primary w-full mt-auto" style={{marginTop:14}} onClick={analyzeErrors} disabled={analyzing}>{analyzing?<><div className="spinner"/>Analyzing…</>:"🤖 AI Error Pattern Analysis"}</button>
        </div>
      </div>
      <div style={{marginBottom:12}}>
        {errors.map((e,i)=>(
          <div key={e.id} className="revision-card" style={{borderColor:e.fixed?"rgba(34,197,94,0.3)":"var(--border)",opacity:e.fixed?0.65:1}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
              <span className="tag tag-blue">{e.topic}</span>
              <span className="tag tag-gold">{e.concept}</span>
              <span style={{fontSize:10,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",marginLeft:"auto"}}>{e.date}</span>
              <button className={`btn btn-xs ${e.fixed?"btn-secondary":"btn-green"}`} onClick={()=>setErrors(es=>es.map(x=>x.id===e.id?{...x,fixed:!x.fixed}:x))}>{e.fixed?"↩ Reopen":"✓ Fixed"}</button>
            </div>
            <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{e.question}</div>
            <div style={{fontSize:12,color:"var(--red)"}}>❌ {e.mistake}</div>
          </div>
        ))}
      </div>
      {aiAnalysis&&<div className="card"><div className="flex items-center gap-2 mb-3"><span>🤖</span><span style={{fontSize:13.5,fontWeight:600}}>AI Error Pattern Analysis</span><span className="tag tag-purple">Ollama 318B</span></div><div className="ai-content" dangerouslySetInnerHTML={{__html:aiAnalysis.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/></div>}
    </div>
  );
}

// ── SPACED REVISION ───────────────────────────────────────────────────────────
function SpacedRevision() {
  const [flipped,setFlipped]=useState(null);
  const [ratings,setRatings]=useState({});
  const [aiRevision,setAiRevision]=useState(null);
  const [generating,setGenerating]=useState(false);
  const [topic,setTopic]=useState("All");
  const filtered=topic==="All"?FLASHCARDS:FLASHCARDS.filter(f=>f.topic===topic);
  const topics=["All",...new Set(FLASHCARDS.map(f=>f.topic))];
  const rateCard=(i,rating)=>{setRatings(r=>({...r,i:rating}));setFlipped(null);};
  async function genRevisionPlan(){
    setGenerating(true);
    const hardOnes=Object.entries(ratings).filter(([,v])=>v==="hard").map(([i])=>FLASHCARDS[i]?.q).filter(Boolean);
    const t=await callAI("You are a spaced repetition expert.","Create a 7-day spaced revision schedule. Hard topics needing more review: "+(hardOnes.length>0?hardOnes.join(", "):"None specified")+". Include: daily flashcard counts, topic priority order, when to revisit concepts, and memory palace techniques for difficult concepts.");
    setAiRevision(t);setGenerating(false);
  }
  return(
    <div className="page-content">
      <div className="alert alert-info mb-4"><span>💡</span><span>Flip cards, then rate how well you knew it. AI will generate an optimized revision schedule.</span></div>
      <div style={{display:"flex",gap:6,marginBottom:16,alignItems:"center"}}>
        <div className="tabs" style={{marginBottom:0}}>{topics.map(t=><div key={t} className={`tab ${topic===t?"active":""}`} onClick={()=>setTopic(t)}>{t}</div>)}</div>
        <div style={{marginLeft:"auto",display:"flex",gap:6}}>
          <span className="tag tag-green">✓ {Object.values(ratings).filter(r=>r==="easy").length} easy</span>
          <span className="tag tag-gold">~ {Object.values(ratings).filter(r=>r==="medium").length} medium</span>
          <span className="tag tag-red">✗ {Object.values(ratings).filter(r=>r==="hard").length} hard</span>
        </div>
      </div>
      <div className="grid-3 mb-4">
        {filtered.map((fc,i)=>(
          <div key={i}>
            <div className="flashcard-wrap" onClick={()=>setFlipped(flipped===i?null:i)}>
              <div className={`flashcard-inner ${flipped===i?"flipped":""}`}>
                <div className="flashcard-face"><div className="fc-label">Question · {fc.topic}</div><div style={{fontSize:13.5,fontWeight:500,lineHeight:1.4}}>{fc.q}</div><div style={{fontSize:10,color:"var(--text3)",marginTop:8}}>Tap to reveal</div></div>
                <div className="flashcard-face flashcard-back"><div className="fc-label">Answer</div><div style={{fontSize:13,lineHeight:1.6}}>{fc.a}</div></div>
              </div>
            </div>
            {flipped===i&&<div style={{display:"flex",gap:6,marginTop:6}}>{[{l:"Easy",c:"btn-green",v:"easy"},{l:"Medium",c:"btn-gold",v:"medium"},{l:"Hard",c:"btn-red",v:"hard"}].map(r=><button key={r.v} className={`btn ${r.c} btn-sm`} style={{flex:1}} onClick={()=>rateCard(i,r.v)}>{r.l}</button>)}</div>}
            {ratings[i]&&flipped!==i&&<div style={{textAlign:"center",marginTop:5}}><span className={`tag ${ratings[i]==="easy"?"tag-green":ratings[i]==="medium"?"tag-gold":"tag-red"}`}>{ratings[i]}</span></div>}
          </div>
        ))}
      </div>
      <button className="btn btn-primary mb-4" onClick={genRevisionPlan} disabled={generating}>{generating?<><div className="spinner"/>Generating schedule…</>:"🤖 Generate AI Spaced Revision Schedule"}</button>
      {aiRevision&&<div className="card"><div className="flex items-center gap-2 mb-3"><span>🌙</span><span style={{fontSize:13.5,fontWeight:600}}>Your Spaced Revision Schedule</span><span className="tag tag-purple">Ollama 318B</span></div><div className="ai-content" dangerouslySetInnerHTML={{__html:aiRevision.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/></div>}
    </div>
  );
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
function Leaderboard() {
  const students=[
    {rank:1,name:"Sneha Patel",score:88,tests:61,streak:21,badge:"🏆"},
    {rank:2,name:"Arjun Sharma",score:74,tests:47,streak:12,badge:"🥈",isYou:true},
    {rank:3,name:"Priya Verma",score:58,tests:32,streak:3,badge:"🥉"},
    {rank:4,name:"Amit Kumar",score:51,tests:15,streak:1,badge:""},
    {rank:5,name:"Rohan Mehta",score:42,tests:8,streak:0,badge:""},
    {rank:6,name:"Divya Nair",score:38,tests:5,streak:0,badge:""},
  ];
  const weeklyTopics=[{topic:"Thermodynamics",leader:"Sneha P.",score:94},{topic:"Mechanics",leader:"Arjun S.",score:88},{topic:"Calculus",leader:"Priya V.",score:82}];
  return(
    <div className="page-content">
      <div className="stats-grid mb-4">
        {[{l:"Your Rank",v:"#2",c:"var(--gold)"},{l:"Score This Week",v:"74%",c:"var(--accent)"},{l:"Tests Completed",v:"47",c:"var(--accent3)"},{l:"Points Earned",v:"2,840",c:"var(--green)"}].map((s,i)=><div key={i} className="stat-card" style={{"--accent-color":s.c}}><div className="stat-label">{s.l}</div><div className="stat-value" style={{color:s.c}}>{s.v}</div></div>)}
      </div>
      <div className="grid-2 mb-4">
        <div className="table-wrap">
          <div style={{padding:"11px 13px",borderBottom:"1px solid var(--border)",background:"var(--bg3)",display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:13}}>🏆</span><span style={{fontSize:13.5,fontWeight:600}}>Overall Leaderboard</span></div>
          <table>
            <thead><tr><th>Rank</th><th>Student</th><th>Avg Score</th><th>Tests</th><th>Streak</th></tr></thead>
            <tbody>
              {students.map((s,i)=>(
                <tr key={i} style={{background:s.isYou?"rgba(124,92,252,0.06)":""}}>
                  <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:700,color:i===0?"var(--gold)":i===1?"var(--text2)":i===2?"#cd7f32":"var(--text3)"}}>{s.badge||`#${s.rank}`}</span></td>
                  <td><div style={{display:"flex",alignItems:"center",gap:7}}><div className="avatar" style={{width:22,height:22,fontSize:9}}>{s.name.split(" ").map(w=>w[0]).join("")}</div><span style={{fontWeight:s.isYou?700:400}}>{s.name}{s.isYou&&" (You)"}</span></div></td>
                  <td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:s.score>=75?"var(--green)":s.score>=55?"var(--gold)":"var(--red)"}}>{s.score}%</span></td>
                  <td>{s.tests}</td>
                  <td>{s.streak>0?`🔥${s.streak}d`:"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="card mb-3">
            <div style={{fontSize:13.5,fontWeight:600,marginBottom:12}}>🥇 Topic Leaders This Week</div>
            {weeklyTopics.map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}><span style={{fontSize:18}}>{i===0?"🥇":i===1?"🥈":"🥉"}</span><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600}}>{t.topic}</div><div style={{fontSize:11,color:"var(--text3)"}}>{t.leader}</div></div><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:"var(--gold)"}}>{t.score}%</span></div>)}
          </div>
          <div className="card">
            <div style={{fontSize:13.5,fontWeight:600,marginBottom:12}}>🎖️ Your Achievements</div>
            {[{icon:"🔥",name:"12-Day Streak",desc:"Studied 12 days in a row",earned:true},{icon:"🧪",name:"Test Warrior",desc:"47 mock tests completed",earned:true},{icon:"📚",name:"Study Marathon",desc:"186 hours studied",earned:true},{icon:"🏆",name:"Top 10",desc:"Rank in top 10 for a week",earned:false}].map((a,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 0",borderBottom:i<3?"1px solid var(--border)":"none",opacity:a.earned?1:0.4}}><span style={{fontSize:20}}>{a.icon}</span><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:500}}>{a.name}</div><div style={{fontSize:10.5,color:"var(--text3)"}}>{a.desc}</div></div>{a.earned&&<span className="tag tag-gold">Earned</span>}</div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── PLANNER ───────────────────────────────────────────────────────────────────
function PlannerPage() {
  const [tab,setTab]=useState("schedule");
  const [plan,setPlan]=useState(null);
  const [generating,setGenerating]=useState(false);
  const today=new Date();
  const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(today.getDate()-today.getDay()+i);return d;});
  async function genPlan(){setGenerating(true);setPlan(null);const t=await callAI("You are an expert JEE study planner.","Create a detailed 7-day JEE study plan. Student: weak Electrostatics 55%, Organic Chem 61%. Strong: Thermodynamics 88%, Mechanics 82%. Exam in 18 days. Include specific topics, question counts, and time allocations for each day.");setPlan(t);setGenerating(false);}
  return(
    <div className="page-content">
      <div className="tabs">{["schedule","ai-plan"].map(t=><div key={t} className={`tab ${tab===t?"active":""}`} onClick={()=>setTab(t)}>{t==="schedule"?"📅 Schedule":"🤖 AI Plan"}</div>)}</div>
      {tab==="schedule"&&(<>
        <div className="planner-grid mb-4">{days.map((d,i)=>{const isT=d.toDateString()===today.toDateString();return<div key={i} className={`day-card ${isT?"today":""} ${i<5?"has-task":""}`}><div className="day-name">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]}</div><div className="day-num" style={{color:isT?"var(--accent2)":"var(--text)"}}>{d.getDate()}</div></div>;})}</div>
        <div className="card"><div style={{fontSize:13.5,fontWeight:600,marginBottom:10}}>📋 Today's Schedule</div>{[{time:"9:00 AM",task:"Electrostatics — Coulomb's Law & Field",duration:"90 min",done:true},{time:"11:00 AM",task:"Organic Chemistry — Named Reactions",duration:"60 min",done:true},{time:"2:00 PM",task:"Mock Test — Physics Chapter Test",duration:"45 min",done:false},{time:"4:00 PM",task:"Revision — Thermodynamics Formulas",duration:"30 min",done:false},{time:"6:00 PM",task:"PYQ — Chemistry 2022 paper",duration:"60 min",done:false}].map((item,i)=><div key={i} className="task-item"><div style={{color:item.done?"var(--green)":"var(--text3)",fontSize:14}}>{item.done?"✅":"⭕"}</div><div style={{flex:1}}><div style={{fontSize:12.5,textDecoration:item.done?"line-through":"none",opacity:item.done?0.5:1}}>{item.task}</div><div style={{fontSize:10,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>{item.time} · {item.duration}</div></div><span className="tag tag-purple">{item.duration}</span></div>)}</div>
      </>)}
      {tab==="ai-plan"&&(<>
        <div className="card mb-4"><div className="flex items-center gap-2 mb-3"><span>🤖</span><span style={{fontSize:13.5,fontWeight:600}}>AI Study Plan Generator</span><span className="tag tag-purple">Ollama 318B</span></div><p className="text-sm text-muted mb-3">Get a personalized 7-day study plan based on your performance and exam timeline.</p><button className="btn btn-primary" onClick={genPlan} disabled={generating}>{generating?<><div className="spinner"/>Generating…</>:"✨ Generate My Study Plan"}</button></div>
        {plan&&<div className="card"><div className="ai-content" dangerouslySetInnerHTML={{__html:plan.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/></div>}
      </>)}
    </div>
  );
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────
function AnalyticsPage() {
  return(
    <div className="page-content">
      <div className="stats-grid mb-4">{[{l:"Total Study Time",v:"186h",c:"var(--accent)"},{l:"Questions Attempted",v:"1,240",c:"var(--accent3)"},{l:"Accuracy Rate",v:"74%",c:"var(--green)"},{l:"Improvement",v:"+18%",c:"var(--gold)"}].map((s,i)=><div key={i} className="stat-card" style={{"--accent-color":s.c}}><div className="stat-label">{s.l}</div><div className="stat-value" style={{color:s.c}}>{s.v}</div></div>)}</div>
      <div className="grid-2 mb-4">
        <div className="card"><div style={{fontSize:12.5,fontWeight:600,marginBottom:14}}>📈 Score Trend (14 Tests)</div><div style={{display:"flex",alignItems:"flex-end",gap:4,height:90}}>{[65,70,68,74,80,72,78,75,82,79,84,80,86,82].map((v,i)=><div key={i} style={{flex:1,background:`hsl(${v*1.2},60%,55%)`,borderRadius:"3px 3px 0 0",height:`${v}%`,opacity:0.85,minWidth:7}}/>)}</div><div className="flex text-xs text-dim" style={{justifyContent:"space-between",marginTop:5}}><span>2 weeks ago</span><span>Today</span></div></div>
        <div className="card"><div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>🎯 Accuracy by Subject</div>{[{s:"Physics",a:78,c:"#7c5cfc"},{s:"Chemistry",a:62,c:"#06d6a0"},{s:"Mathematics",a:81,c:"#22c55e"}].map((s,i)=><div key={i} style={{marginBottom:11}}><div className="flex items-center gap-2 mb-1"><span className="text-sm" style={{flex:1,fontWeight:500}}>{s.s}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:s.c,fontSize:12}}>{s.a}%</span></div><ProgressBar value={s.a} color={s.c}/></div>)}</div>
      </div>
      <div className="card"><div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>📊 Detailed Topic Analysis</div><table><thead><tr><th>Topic</th><th>Attempted</th><th>Correct</th><th>Accuracy</th><th>Trend</th><th>Status</th></tr></thead><tbody>{[{t:"Thermodynamics",q:180,c:158,a:88,tr:"↑",s:"Strong"},{t:"Mechanics",q:220,c:180,a:82,tr:"→",s:"Good"},{t:"Calculus",q:160,c:126,a:79,tr:"↑",s:"Good"},{t:"Wave Optics",q:120,c:82,a:68,tr:"↑",s:"Improving"},{t:"Org.Chemistry",q:200,c:122,a:61,tr:"→",s:"Needs Work"},{t:"Electrostatics",q:150,c:83,a:55,tr:"↓",s:"Critical"}].map((r,i)=><tr key={i}><td style={{fontWeight:600}}>{r.t}</td><td className="text-muted">{r.q}</td><td className="text-muted">{r.c}</td><td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:r.a>=75?"var(--green)":r.a>=60?"var(--gold)":"var(--red)"}}>{r.a}%</span></td><td><span style={{color:r.tr==="↑"?"var(--green)":r.tr==="↓"?"var(--red)":"var(--text3)",fontSize:14}}>{r.tr}</span></td><td><span className={`tag ${r.s==="Strong"||r.s==="Good"?"tag-green":r.s==="Improving"?"tag-blue":r.s==="Needs Work"?"tag-gold":"tag-red"}`}>{r.s}</span></td></tr>)}</tbody></table></div>
    </div>
  );
}

// ── PASS ASSISTANT ────────────────────────────────────────────────────────────
function PassAssistantPage() {
  const [phase,setPhase]=useState("landing");
  const [plan,setPlan]=useState(null);
  const [expanded,setExpanded]=useState(0);
  async function activate(){setPhase("generating");const t=await callAI("You are a crash course exam specialist.","Create a 3-day JEE crash course. Weak: Electrostatics 55%, Organic Chem 61%, Wave Optics 68%. Strong: Thermodynamics 88%, Mechanics 82%. Avg 74%, exam in 18 days. Give: day-by-day hyper-focused plan, top 5 predicted exam topics with probability %, 5 most likely exam questions, memory tricks for weak areas.");setPlan(t);setPhase("active");}
  const DAYS=[{day:"1",title:"Critical Weak Areas — Foundation",tasks:[{text:"Electrostatics — Coulomb's Law, Electric Field, Potential, Capacitance",meta:"3h · CRITICAL"},{text:"Organic Chemistry — Named Reactions (Aldol, Cannizzaro, Kolbe, Sandmeyer)",meta:"2h · CRITICAL"},{text:"20 MCQs on Electrostatics from PYQ 2022-24",meta:"1h · Mandatory"},{text:"Formula sheet: Organic mechanisms & Electrostatics",meta:"30 min · Quick win"}]},{day:"2",title:"High-Yield Practice",tasks:[{text:"Wave Optics — YDSE, Diffraction, Polarization (complete chapter)",meta:"2h · Medium"},{text:"Organic Chemistry — Functional Groups, Tests, Conversions",meta:"2h · Critical"},{text:"Full chapter test: Electrostatics + Wave Optics combined",meta:"1.5h · Assessment"},{text:"Revise Thermodynamics — maintain strong topic",meta:"30 min"}]},{day:"3",title:"Full Mock & Final Revision",tasks:[{text:"Rapid revision: All weak topics with flashcards",meta:"2h · Spaced repetition"},{text:"Full mock: Physics+Chemistry+Math (30Q each)",meta:"2h · Exam simulation"},{text:"Error analysis — review every wrong answer",meta:"1h · Critical"},{text:"PYQ 2023 full paper timed",meta:"2h · Final drill"}]},];
  if(phase==="landing")return(<div className="page-content"><div style={{background:"linear-gradient(135deg,rgba(124,92,252,0.12),rgba(6,214,160,0.06))",border:"1px solid rgba(124,92,252,0.22)",borderRadius:"var(--r)",padding:28,textAlign:"center",marginBottom:18}}><div style={{fontSize:42,marginBottom:14}}>🎯</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,marginBottom:8}}>Pass Assistant Mode</div><div style={{fontSize:13,color:"var(--text2)",maxWidth:420,margin:"0 auto 20px",lineHeight:1.7}}>Ollama 318B analyzes all 47 of your tests, predicts exam questions, and builds the most efficient crash course to maximize your score in 18 days.</div><button className="btn btn-primary" style={{fontSize:14,padding:"11px 26px"}} onClick={activate}>🚀 Help Me Pass!</button></div><div className="grid-3">{[{icon:"🧠",t:"Smart Analysis",d:"Analyzes 47 tests to find exact weak spots"},{icon:"📋",t:"3-Day Crash Course",d:"Day-by-day hyper-focused plan"},{icon:"🎯",t:"Exam Prediction",d:"AI predicts high-probability questions"},{icon:"⚡",t:"Quick Revision",d:"Condensed notes for rapid refresh"},{icon:"🧩",t:"Memory Tricks",d:"AI-generated mnemonics for your weak areas"},{icon:"📈",t:"Score Boost",d:"Targeted to maximize your score fast"}].map((f,i)=><div key={i} className="card" style={{padding:14,textAlign:"center"}}><div style={{fontSize:22,marginBottom:7}}>{f.icon}</div><div style={{fontSize:12.5,fontWeight:600,marginBottom:4}}>{f.t}</div><div className="text-xs text-muted">{f.d}</div></div>)}</div></div>);
  if(phase==="generating")return(<div className="page-content" style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:350}}><div style={{fontSize:42,marginBottom:16}}>🤖</div><div style={{fontFamily:"'Syne',sans-serif",fontSize:20,fontWeight:700,marginBottom:8}}>Ollama 318B Analyzing…</div><div className="text-muted text-sm mb-4">Processing 47 tests · Building crash course · Predicting exam questions</div><div className="spinner" style={{width:26,height:26,borderWidth:3,color:"var(--accent)"}}/></div>);
  return(<div className="page-content"><div className="alert alert-warn mb-4"><span>⚡</span><span><strong>PASS MODE ACTIVE</strong> — 18 days to exam. Execute this plan exactly.</span></div><div className="grid-2 mb-4"><div className="card" style={{borderColor:"rgba(244,63,94,0.25)",background:"rgba(244,63,94,0.03)"}}><div style={{fontSize:12.5,fontWeight:600,color:"var(--red)",marginBottom:8}}>🎯 Critical Topics</div>{[{t:"Electrostatics",w:"~15% of exam"},{t:"Organic Chemistry Reactions",w:"~18% of exam"},{t:"Wave Optics",w:"~10% of exam"}].map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600}}>{t.t}</div><div style={{fontSize:10.5,color:"var(--text3)"}}>{t.w}</div></div><span className="tag tag-red">CRITICAL</span></div>)}</div><div className="card" style={{borderColor:"rgba(34,197,94,0.25)",background:"rgba(34,197,94,0.03)"}}><div style={{fontSize:12.5,fontWeight:600,color:"var(--green)",marginBottom:8}}>✅ Maintain Strengths</div>{[{t:"Thermodynamics",s:"88%"},{t:"Mechanics",s:"82%"},{t:"Calculus",s:"79%"}].map((t,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 0",borderBottom:i<2?"1px solid var(--border)":"none"}}><span style={{flex:1,fontSize:12.5}}>{t.t}</span><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:"var(--green)",fontSize:12}}>{t.s}</span></div>)}</div></div>
  <div style={{fontSize:14,fontWeight:600,marginBottom:10}}>📅 3-Day Crash Course</div>
  {DAYS.map((day,i)=><div key={i} className="crash-day"><div className="crash-day-header" onClick={()=>setExpanded(expanded===i?-1:i)}><div className="day-badge">D{day.day}</div><div style={{flex:1}}><div style={{fontSize:12.5,fontWeight:600}}>Day {day.day}: {day.title}</div><div style={{fontSize:10,color:"var(--text3)"}}>{day.tasks.length} tasks</div></div><span style={{color:"var(--text3)",transition:"transform .2s",transform:expanded===i?"rotate(90deg)":"none",display:"inline-block"}}>›</span></div>{expanded===i&&<div className="crash-day-body">{day.tasks.map((t,j)=><div key={j} className="task-item"><div className="task-dot"/><div><div style={{fontSize:12.5,lineHeight:1.5}}>{t.text}</div><div style={{fontSize:10,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace",marginTop:1}}>{t.meta}</div></div></div>)}</div>}</div>)}
  {plan&&<div className="card" style={{marginTop:14}}><div className="flex items-center gap-2 mb-3"><span>🤖</span><span style={{fontSize:13.5,fontWeight:600}}>Ollama 318B Analysis & Predictions</span></div><div className="ai-content" dangerouslySetInnerHTML={{__html:plan.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/></div>}
  </div>);
}

// ── SMART STUDY HUB ───────────────────────────────────────────────────────────
function SmartStudyHub({uploadedFiles,setUploadedFiles}) {
  const [tab,setTab]=useState("predict");
  const [pdfFile,setPdfFile]=useState(null);
  const [pdfProcessing,setPdfProcessing]=useState(false);
  const [pdfResult,setPdfResult]=useState(null);
  const [searchQuery,setSearchQuery]=useState("");
  const [searchResults,setSearchResults]=useState([]);
  const [searching,setSearching]=useState(false);
  const [predicting,setPredicting]=useState(false);
  const [predictions,setPredictions]=useState(null);
  const [predTopic,setPredTopic]=useState("Electrostatics");
  const [predExam,setPredExam]=useState("JEE Main");
  const [dragging,setDragging]=useState(false);
  const fileRef=useRef(null);
  const [uploadedHubFiles,setUploadedHubFiles]=useState([]);

  // PYQ Data for 5-year prediction analysis
  const PYQ_TRENDS={
    "Electrostatics":{years:[2020,2021,2022,2023,2024],freq:[3,4,2,5,4],avgMarks:14,trend:"↑ Increasing",hotTopics:["Gauss Law","Capacitors","Electric Field","Potential Energy"],realLifeExamples:["Thunderstorms (charge buildup)","Photocopiers","Touchscreens","Van de Graaff generator","Electrostatic precipitators in chimneys"]},
    "Mechanics":{years:[2020,2021,2022,2023,2024],freq:[6,5,7,6,5],avgMarks:20,trend:"→ Stable",hotTopics:["Rotational Motion","Work-Energy Theorem","Conservation Laws","SHM"],realLifeExamples:["Car braking distance (kinematics)","Cricket ball spin (angular momentum)","Roller coasters (energy conservation)","Pendulum clocks","Bridge oscillations"]},
    "Thermodynamics":{years:[2020,2021,2022,2023,2024],freq:[4,3,4,4,5],avgMarks:16,trend:"↑ Increasing",hotTopics:["Carnot Cycle","Entropy","PV Diagrams","Specific Heat"],realLifeExamples:["Car engines (heat to work)","Refrigerators (reverse Carnot)","Pressure cookers","Air conditioning","Steam turbines in power plants"]},
    "Organic Chemistry":{years:[2020,2021,2022,2023,2024],freq:[8,9,7,10,9],avgMarks:32,trend:"↑ High weight",hotTopics:["Named Reactions","Mechanism","IUPAC Nomenclature","Stereo Chemistry"],realLifeExamples:["Soap making (saponification)","Nylon production (polymerization)","Vinegar (acetic acid)","Aspirin synthesis","Fermentation (ethanol)"]},
    "Calculus":{years:[2020,2021,2022,2023,2024],freq:[7,8,8,7,9],avgMarks:28,trend:"↑ Rising",hotTopics:["Integration Techniques","Differential Equations","Application of Derivatives","Limits"],realLifeExamples:["Population growth models","Drug concentration in blood","Projectile path optimization","Area under curves (engineering design)","Rate of cooling"]},
    "Wave Optics":{years:[2020,2021,2022,2023,2024],freq:[2,3,3,4,4],avgMarks:14,trend:"↑ Rising",hotTopics:["YDSE","Diffraction","Polarization","Interference"],realLifeExamples:["CD/DVD rainbow colors","Anti-reflection coatings on glasses","Holography","Soap bubble colors","Laser surgery"]},
    "Modern Physics":{years:[2020,2021,2022,2023,2024],freq:[3,4,4,5,5],avgMarks:18,trend:"↑ Increasing",hotTopics:["Photoelectric Effect","Bohr Model","Nuclear Physics","De Broglie"],realLifeExamples:["Solar cells (photoelectric)","MRI scans (nuclear)","Radiocarbon dating","LED lights","X-ray imaging"]},
  };

  const GOOGLE_SEARCH_BASE = "https://www.google.com/search?q=";
  const GOOGLE_PDF_BASE = "https://www.google.com/search?q=filetype:pdf+";

  function openGoogleSearch(q,pdfOnly=false){
    const encoded=encodeURIComponent(q+" study material JEE NEET");
    window.open((pdfOnly?GOOGLE_PDF_BASE:GOOGLE_SEARCH_BASE)+encoded,"_blank");
  }

  function handlePdfFiles(files){
    for(const f of Array.from(files)){
      if(!f.name.endsWith(".pdf")){alert("Only PDF files accepted here.");continue;}
      if(f.size>400*1024*1024){alert(`${f.name} exceeds 400MB`);continue;}
      const entry={id:Date.now()+Math.random(),name:f.name,size:f.size>1048576?`${(f.size/1048576).toFixed(1)} MB`:`${(f.size/1024).toFixed(0)} KB`,status:"processing",pages:"—",file:f};
      setUploadedHubFiles(p=>[...p,entry]);
      setTimeout(()=>setUploadedHubFiles(p=>p.map(x=>x.id===entry.id?{...x,status:"ready",pages:Math.floor(40+Math.random()*300)}:x)),2200);
    }
  }

  async function analyzePdf(f){
    setPdfFile(f);setPdfProcessing(true);setPdfResult(null);
    const t=await callAI(
      "You are an elite JEE/NEET exam predictor AI with access to 5 years of pattern data. Analyze study material and extract maximum value for exam preparation.",
      `Analyze this study material PDF: "${f.name}"\n\nProvide:\n**1. TOPIC IDENTIFICATION** - What subject/topics are covered\n**2. KEY CONCEPTS EXTRACTED** - Top 10 must-know concepts\n**3. HIGH-YIELD FORMULAS** - All important formulas\n**4. 5-YEAR EXAM PATTERN ANALYSIS** - Based on this topic's exam history, what has appeared frequently\n**5. PREDICTED QUESTIONS FOR UPCOMING EXAM** - 5 specific questions likely to appear with reasoning\n**6. REAL-LIFE EXAMPLES** - How each concept connects to real-world phenomena\n**7. COMMON STUDENT MISTAKES** - What to avoid\n**8. CONFIDENCE SCORE** - Rate each topic's exam probability out of 10\n\nBe extremely specific and exam-focused.`
    );
    setPdfResult(t);setPdfProcessing(false);
  }

  async function predict(){
    setPredicting(true);setPredictions(null);
    const data=PYQ_TRENDS[predTopic];
    const freqStr=data?data.years.map((y,i)=>`${y}: ${data.freq[i]} questions`).join(", "):"Historical data analyzed";
    const realLife=data?data.realLifeExamples.join(", "):"Various applications";
    const t=await callAI(
      "You are an expert JEE/NEET question predictor with 10+ years of pattern analysis expertise. Use frequency data and real-world context to predict upcoming exam questions.",
      `Predict upcoming ${predExam} 2025 questions for topic: ${predTopic}\n\nHistorical frequency data: ${freqStr}\nTrend: ${data?.trend||"Stable"}\nRecent hot subtopics: ${data?.hotTopics?.join(", ")||"Various"}\nReal-life connections: ${realLife}\n\nProvide:\n**PREDICTION CONFIDENCE**: X/10\n**TREND ANALYSIS**: Why this topic is ${data?.trend||"stable"} with specific reasoning\n**TOP 5 PREDICTED QUESTIONS** with:\n  - The question itself (exam-ready format)\n  - Why this specific question is likely (based on 5-year pattern)\n  - Real-life context that makes it exam-relevant\n  - Similar question from past year if applicable\n\n**REAL-LIFE EXAMPLES TO REMEMBER**:\nFor each predicted question, give a real-world example students can use to remember the concept\n\n**MARKING SCHEME PREDICTION**: Expected marks distribution\n**LAST-MINUTE TIPS**: 3 specific things to focus on for this topic\n\nBe extremely specific, data-driven, and actionable.`
    );
    setPredictions(t);setPredicting(false);
  }

  const topics=Object.keys(PYQ_TRENDS);
  const exams=["JEE Main","JEE Advanced","NEET","BITSAT","MHT-CET"];
  const data=PYQ_TRENDS[predTopic];

  const quickSearches=[
    {label:"JEE Main 2024 Paper PDF",q:"JEE Main 2024 question paper with solutions",pdf:true},
    {label:"NEET 2024 Question Paper",q:"NEET 2024 question paper with answers",pdf:true},
    {label:"HC Verma Physics Solutions",q:"HC Verma concepts of physics solutions",pdf:false},
    {label:"NCERT Chemistry Notes",q:"NCERT chemistry class 11 12 notes",pdf:false},
    {label:"JEE Advanced PYQ 2019-24",q:"JEE Advanced previous year questions 2019 2020 2021 2022 2023 2024",pdf:true},
    {label:"Organic Chemistry Reactions PDF",q:"organic chemistry named reactions JEE",pdf:true},
    {label:"Math Formula Sheet",q:"JEE maths formula sheet all chapters",pdf:true},
    {label:"Physics Handwritten Notes",q:"physics handwritten notes JEE NEET",pdf:false},
  ];

  return(
    <div className="page-content">
      {/* Tabs */}
      <div style={{display:"flex",gap:6,marginBottom:18,flexWrap:"wrap"}}>
        {[{id:"predict",icon:"🔮",label:"5-Year Prediction"},
          {id:"pdfai",icon:"📄",label:"PDF AI Analysis"},
          {id:"search",icon:"🔍",label:"Find Study Materials"},
          {id:"trends",icon:"📈",label:"Topic Trends"}
        ].map(t=>(
          <button key={t.id} className={`btn btn-sm ${tab===t.id?"btn-primary":"btn-secondary"}`} onClick={()=>setTab(t.id)}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* ── 5-YEAR PREDICTION TAB ── */}
      {tab==="predict"&&(
        <div>
          <div className="card mb-4" style={{background:"linear-gradient(135deg,rgba(124,92,252,0.08),rgba(6,214,160,0.04))",border:"1px solid rgba(124,92,252,0.2)"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{fontSize:24}}>🔮</span>
              <div><div style={{fontSize:15,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>AI Exam Question Predictor</div><div style={{fontSize:11,color:"var(--text3)"}}>Analyzes 5 years of PYQ patterns + real-life examples to predict upcoming questions</div></div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10,alignItems:"end"}}>
              <div className="input-group" style={{marginBottom:0}}>
                <label className="input-label">Topic</label>
                <select className="input" value={predTopic} onChange={e=>setPredTopic(e.target.value)}>
                  {topics.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="input-group" style={{marginBottom:0}}>
                <label className="input-label">Exam</label>
                <select className="input" value={predExam} onChange={e=>setPredExam(e.target.value)}>
                  {exams.map(e=><option key={e}>{e}</option>)}
                </select>
              </div>
              <button className="btn btn-primary" onClick={predict} disabled={predicting}>
                {predicting?<><div className="spinner"/>Predicting…</>:"🔮 Predict Questions"}
              </button>
            </div>
          </div>

          {/* 5-year frequency visual */}
          {data&&(
            <div className="card mb-4">
              <div style={{fontSize:13,fontWeight:600,marginBottom:12}}>📊 5-Year Appearance Frequency — {predTopic}</div>
              <div style={{display:"flex",gap:8,alignItems:"flex-end",height:80,marginBottom:10}}>
                {data.years.map((y,i)=>(
                  <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <div style={{fontSize:10,color:"var(--accent2)",fontWeight:700,fontFamily:"'JetBrains Mono',monospace"}}>{data.freq[i]}Q</div>
                    <div style={{width:"100%",background:`rgba(124,92,252,${0.3+data.freq[i]*0.07})`,borderRadius:"4px 4px 0 0",height:`${(data.freq[i]/Math.max(...data.freq))*56}px`,border:"1px solid rgba(124,92,252,0.3)"}}/>
                    <div style={{fontSize:9,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>{y}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <span className="tag tag-purple">Trend: {data.trend}</span>
                <span className="tag tag-gold">~{data.avgMarks} marks/year</span>
                {data.hotTopics.map(h=><span key={h} className="tag tag-teal">{h}</span>)}
              </div>
              <div style={{marginTop:12,borderTop:"1px solid var(--border)",paddingTop:10}}>
                <div style={{fontSize:11,color:"var(--text3)",marginBottom:6,fontFamily:"'JetBrains Mono',monospace",textTransform:"uppercase",letterSpacing:1}}>Real-life connections (how this topic appears in context questions):</div>
                <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                  {data.realLifeExamples.map((ex,i)=>(
                    <div key={i} style={{background:"var(--bg3)",border:"1px solid var(--border)",borderRadius:6,padding:"5px 10px",fontSize:11.5,display:"flex",alignItems:"center",gap:6}}>
                      <span>🌍</span>{ex}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {predicting&&(
            <div className="card" style={{textAlign:"center",padding:30}}>
              <div className="spinner" style={{width:28,height:28,margin:"0 auto 12px",borderWidth:3}}/>
              <div style={{fontSize:13,color:"var(--text2)"}}>Analyzing 5 years of {predExam} patterns for {predTopic}…</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:6}}>Matching real-world contexts, frequency trends, and examiner preferences</div>
            </div>
          )}
          {predictions&&(
            <div className="card" style={{border:"1px solid rgba(124,92,252,0.3)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span style={{fontSize:18}}>🔮</span>
                <span style={{fontSize:13.5,fontWeight:600}}>Predicted Questions — {predTopic} · {predExam}</span>
                <span className="tag tag-purple">AI Powered</span>
              </div>
              <div className="ai-content" dangerouslySetInnerHTML={{__html:predictions.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/>
            </div>
          )}
        </div>
      )}

      {/* ── PDF AI ANALYSIS TAB ── */}
      {tab==="pdfai"&&(
        <div>
          <div className="card mb-4">
            <div style={{fontSize:13.5,fontWeight:600,marginBottom:4}}>📄 Upload PDF for AI Deep Analysis</div>
            <div style={{fontSize:11.5,color:"var(--text3)",marginBottom:14}}>Upload any study material, notes, or PYQ PDF — AI extracts key concepts, predicts exam questions, and connects to real-life examples</div>
            <div className={`upload-zone ${dragging?"drag-over":""}`}
              onClick={()=>fileRef.current?.click()}
              onDragOver={e=>{e.preventDefault();setDragging(true);}}
              onDragLeave={()=>setDragging(false)}
              onDrop={e=>{e.preventDefault();setDragging(false);handlePdfFiles(e.dataTransfer.files);}}>
              <input ref={fileRef} type="file" multiple accept=".pdf" style={{display:"none"}} onChange={e=>handlePdfFiles(e.target.files)}/>
              <div style={{fontSize:28,marginBottom:8}}>📤</div>
              <div style={{fontSize:13,fontWeight:600,marginBottom:4}}>Drop PDF or click to upload</div>
              <div style={{fontSize:11.5,color:"var(--text3)",marginBottom:10}}>PDF only · Up to 400 MB · AI extracts everything automatically</div>
              <button className="btn btn-primary btn-sm" onClick={e=>{e.stopPropagation();fileRef.current?.click();}}>Choose PDF</button>
            </div>
          </div>

          {uploadedHubFiles.length>0&&(
            <div className="card mb-4">
              <div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>📁 Uploaded PDFs</div>
              {uploadedHubFiles.map(f=>(
                <div key={f.id} className="file-item">
                  <span style={{fontSize:20}}>📄</span>
                  <div className="file-meta">
                    <div className="file-name">{f.name}</div>
                    <div className="file-size">{f.size} · {f.pages} pages</div>
                  </div>
                  <span className={`file-status status-${f.status}`}>{f.status}</span>
                  {f.status==="ready"&&(
                    <div style={{display:"flex",gap:5}}>
                      <button className="btn btn-primary btn-xs" onClick={()=>analyzePdf(f)} disabled={pdfProcessing}>
                        {pdfProcessing&&pdfFile?.id===f.id?<><div className="spinner"/>Analyzing…</>:"🔮 Deep Analyze"}
                      </button>
                      <button className="btn btn-secondary btn-xs" onClick={()=>openGoogleSearch(f.name.replace(".pdf",""))}>
                        🔍 Find More
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {pdfProcessing&&(
            <div className="card" style={{textAlign:"center",padding:28}}>
              <div className="spinner" style={{width:26,height:26,margin:"0 auto 12px",borderWidth:3}}/>
              <div style={{fontSize:13,color:"var(--text2)"}}>Deep-analyzing {pdfFile?.name}…</div>
              <div style={{fontSize:11,color:"var(--text3)",marginTop:5}}>Extracting concepts · Matching 5-year PYQ patterns · Finding real-life connections</div>
            </div>
          )}

          {pdfResult&&(
            <div className="card" style={{border:"1px solid rgba(6,214,160,0.25)"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span style={{fontSize:18}}>✨</span>
                <span style={{fontSize:13.5,fontWeight:600}}>AI Analysis — {pdfFile?.name}</span>
                <span className="tag tag-teal">Deep Analysis</span>
              </div>
              <div className="ai-content" dangerouslySetInnerHTML={{__html:pdfResult.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/>
            </div>
          )}

          {uploadedHubFiles.length===0&&!pdfProcessing&&!pdfResult&&(
            <div className="card" style={{background:"var(--bg3)",border:"1px dashed var(--border2)"}}>
              <div style={{fontSize:12.5,fontWeight:600,marginBottom:10}}>🚀 What AI Does With Your PDF:</div>
              {["Identifies all topics and subtopics covered","Extracts key formulas, reactions, and theorems","Matches content to 5-year JEE/NEET question patterns","Predicts which concepts are likely to appear in upcoming exam","Connects abstract concepts to real-life examples students can remember","Flags common mistakes students make on this topic","Generates ready-to-use practice questions from your material"].map((f,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,padding:"6px 0",borderBottom:i<6?"1px solid var(--border)":"none"}}>
                  <span style={{color:"var(--green)",fontWeight:700,flexShrink:0}}>✓</span>
                  <span style={{fontSize:12.5,color:"var(--text2)"}}>{f}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FIND STUDY MATERIALS TAB ── */}
      {tab==="search"&&(
        <div>
          <div className="card mb-4">
            <div style={{fontSize:13.5,fontWeight:600,marginBottom:10}}>🔍 Find Study Materials from the Web</div>
            <div style={{display:"flex",gap:8,marginBottom:4}}>
              <input className="input" style={{flex:1}} placeholder="Search e.g. 'JEE 2023 Electrostatics solved questions'…" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&searchQuery&&openGoogleSearch(searchQuery)}/>
              <button className="btn btn-primary" onClick={()=>searchQuery&&openGoogleSearch(searchQuery)}>🔍 Search Web</button>
              <button className="btn btn-secondary" onClick={()=>searchQuery&&openGoogleSearch(searchQuery,true)} title="Find PDF files">📄 PDF Only</button>
            </div>
            <div style={{fontSize:11,color:"var(--text3)"}}>Opens Google search in a new tab — access any study material, PDF, or resource from the internet</div>
          </div>

          <div style={{fontSize:12,color:"var(--text2)",marginBottom:10,fontWeight:600}}>⚡ Quick Access — Popular Study Resources</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
            {quickSearches.map((s,i)=>(
              <div key={i} className="card" style={{padding:"11px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .15s"}} onClick={()=>openGoogleSearch(s.q,s.pdf)}>
                <span style={{fontSize:18}}>{s.pdf?"📄":"📖"}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:12.5,fontWeight:600}}>{s.label}</div>
                  <div style={{fontSize:10.5,color:"var(--text3)"}}>{s.pdf?"PDF search":"Web search"} · Opens Google</div>
                </div>
                <span style={{color:"var(--text3)",fontSize:12}}>↗</span>
              </div>
            ))}
          </div>

          <div style={{fontSize:12,color:"var(--text2)",marginBottom:10,fontWeight:600}}>📚 Browse by Subject</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[
              {subject:"Physics",icon:"⚛️",searches:["Mechanics notes PDF","Electrostatics JEE questions","Wave Optics solved","Modern Physics concepts"]},
              {subject:"Chemistry",icon:"🧪",searches:["Organic reactions named","Physical chemistry formulas","Inorganic chemistry NCERT","Electrochemistry JEE"]},
              {subject:"Mathematics",icon:"📐",searches:["Integration techniques PDF","Coordinate geometry notes","Differential equations JEE","Algebra formulas sheet"]},
            ].map((sub,i)=>(
              <div key={i} className="card">
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                  <span style={{fontSize:20}}>{sub.icon}</span>
                  <span style={{fontSize:13,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{sub.subject}</span>
                </div>
                {sub.searches.map((s,j)=>(
                  <div key={j} style={{padding:"6px 0",borderBottom:j<sub.searches.length-1?"1px solid var(--border)":"none",cursor:"pointer",fontSize:12,color:"var(--text2)",display:"flex",justifyContent:"space-between",alignItems:"center"}} onClick={()=>openGoogleSearch(s)}>
                    <span>{s}</span><span style={{color:"var(--text3)",fontSize:11}}>↗</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRENDS TAB ── */}
      {tab==="trends"&&(
        <div>
          <div style={{fontSize:13,color:"var(--text2)",marginBottom:14}}>5-year analysis of all major topics across JEE Main, JEE Advanced, and NEET — sorted by exam weight and trend direction.</div>
          {Object.entries(PYQ_TRENDS).map(([topic,data])=>(
            <div key={topic} className="card mb-3">
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13.5,fontWeight:700,fontFamily:"'Syne',sans-serif"}}>{topic}</div>
                  <div style={{fontSize:11,color:"var(--text3)",marginTop:2}}>~{data.avgMarks} marks/year average</div>
                </div>
                <span className={`tag ${data.trend.includes("↑")?"tag-green":data.trend.includes("High")?"tag-gold":"tag-blue"}`}>{data.trend}</span>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"flex-end",height:50,marginBottom:10}}>
                {data.years.map((y,i)=>(
                  <div key={y} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
                    <div style={{width:"100%",background:`rgba(124,92,252,${0.25+data.freq[i]*0.08})`,borderRadius:"3px 3px 0 0",height:`${(data.freq[i]/Math.max(...data.freq))*38}px`,border:"1px solid rgba(124,92,252,0.25)"}}/>
                    <div style={{fontSize:8,color:"var(--text3)",fontFamily:"'JetBrains Mono',monospace"}}>{String(y).slice(2)}</div>
                  </div>
                ))}
              </div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                {data.hotTopics.map(h=><span key={h} className="tag tag-purple">{h}</span>)}
              </div>
              <div style={{fontSize:11,color:"var(--text3)",display:"flex",gap:6,flexWrap:"wrap"}}>
                {data.realLifeExamples.slice(0,3).map((ex,i)=><span key={i} style={{background:"var(--bg3)",padding:"2px 8px",borderRadius:12,border:"1px solid var(--border)"}}>🌍 {ex}</span>)}
              </div>
              <div style={{marginTop:10,display:"flex",gap:6}}>
                <button className="btn btn-secondary btn-xs" onClick={()=>{setTab("predict");setPredTopic(topic);}}>🔮 Predict Questions</button>
                <button className="btn btn-ghost btn-xs" onClick={()=>openGoogleSearch(topic+" JEE questions 2024",true)}>📄 Find PDFs</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
function AdminPage() {
  const [aiReport,setAiReport]=useState(null);const [loading,setLoading]=useState(false);
  async function gen(){setLoading(true);const t=await callAI("You are an educational analytics AI.","Analyze: Arjun(47t,74%,12str), Priya(32t,58%,3str), Rohan(8t,42%,0str-INACTIVE), Sneha(61t,88%,21str), Amit(15t,51%,1str), Divya(5t,38%,0str-INACTIVE). Hardest: Electrostatics, Organic Chem. Provide key insights, at-risk students, interventions, and predicted outcomes.");setAiReport(t);setLoading(false);}
  return(<div className="page-content">
    <div className="stats-grid mb-4">{[{l:"Total Students",v:"6",c:"var(--accent)"},{l:"Active Today",v:"4",c:"var(--green)"},{l:"At Risk",v:"2",c:"var(--red)"},{l:"Avg Score",v:"62%",c:"var(--gold)"}].map((s,i)=><div key={i} className="stat-card" style={{"--accent-color":s.c}}><div className="stat-label">{s.l}</div><div className="stat-value" style={{color:s.c}}>{s.v}</div></div>)}</div>
    <div className="table-wrap mb-4"><div style={{padding:"11px 13px",borderBottom:"1px solid var(--border)",background:"var(--bg3)",display:"flex",alignItems:"center",gap:8}}><span>👥</span><span style={{fontSize:13.5,fontWeight:600}}>Student Overview</span></div><table><thead><tr><th>Student</th><th>Tests</th><th>Avg</th><th>Streak</th><th>Status</th><th>Risk</th></tr></thead><tbody>{[{n:"Arjun Sharma",t:47,a:74,s:12,st:"Active",r:"Low"},{n:"Priya Verma",t:32,a:58,s:3,st:"Active",r:"Medium"},{n:"Rohan Mehta",t:8,a:42,s:0,st:"Inactive",r:"High"},{n:"Sneha Patel",t:61,a:88,s:21,st:"Active",r:"Low"},{n:"Amit Kumar",t:15,a:51,s:1,st:"Active",r:"Medium"},{n:"Divya Nair",t:5,a:38,s:0,st:"Inactive",r:"High"}].map((s,i)=><tr key={i}><td><div style={{display:"flex",alignItems:"center",gap:7}}><div className="avatar" style={{width:22,height:22,fontSize:9}}>{s.n.split(" ").map(w=>w[0]).join("")}</div><span style={{fontWeight:600}}>{s.n}</span></div></td><td>{s.t}</td><td><span style={{fontFamily:"'JetBrains Mono',monospace",fontWeight:600,color:s.a>=75?"var(--green)":s.a>=55?"var(--gold)":"var(--red)"}}>{s.a}%</span></td><td>{s.s>0?`🔥${s.s}d`:"—"}</td><td><span className={`tag ${s.st==="Active"?"tag-green":"tag-red"}`}>{s.st}</span></td><td><span className={`tag ${s.r==="Low"?"tag-green":s.r==="Medium"?"tag-gold":"tag-red"}`}>{s.r}</span></td></tr>)}</tbody></table></div>
    <div className="card"><div className="flex items-center gap-2 mb-3"><span>🤖</span><span style={{fontSize:12.5,fontWeight:600}}>AI Class Intelligence Report</span><span className="tag tag-purple">Ollama 318B</span></div><p className="text-sm text-muted mb-3">Get deep AI insights about your class with intervention recommendations.</p><button className="btn btn-secondary w-full mb-3" onClick={gen} disabled={loading}>{loading?<><div className="spinner"/>Analyzing class…</>:"📊 Generate AI Report"}</button>{aiReport&&<div className="ai-content text-sm" style={{maxHeight:300,overflowY:"auto"}} dangerouslySetInnerHTML={{__html:aiReport.replace(/\n/g,"<br/>").replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/^- /gm,"• ")}}/>}</div>
  </div>);
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [screen,setScreen]=useState("home");
  const [user,setUser]=useState(null);
  const [page,setPage]=useState("dashboard");
  const [uploadedFiles,setUploadedFiles]=useState([
    {id:1,name:"Physics_Notes_2023.pdf",size:"4.2 MB",status:"processed",icon:"📄",pages:142},
    {id:2,name:"Chemistry_PYQ_2019-24.pdf",size:"8.7 MB",status:"processed",icon:"📋",pages:280},
    {id:3,name:"Mathematics_Formula_Book.pdf",size:"2.1 MB",status:"processed",icon:"📘",pages:64},
  ]);
  const {toasts,show:toast}=useToast();

  function handleLogin(u){setUser(u);setPage(u.role==="admin"?"admin":"dashboard");setScreen("app");toast(`Welcome back, ${u.name}!`,"🎓");}

  const STUDENT_NAV=[
    {id:"dashboard",label:"Dashboard",icon:"🏠"},
    {id:"chat",label:"AI Tutor",icon:"🤖",badge:"318B"},
    {id:"test",label:"Mock Tests",icon:"🧪"},
    {id:"materials",label:"Study Materials",icon:"📚"},
    {id:"studyhub",label:"Smart Study Hub",icon:"🔍",badge:"⚡"},
    {id:"formulas",label:"Formula Library",icon:"📐"},
    {id:"pyq",label:"PYQ Bank",icon:"📅"},
    {id:"pomodoro",label:"Focus Timer",icon:"⏱️"},
    {id:"concepts",label:"Concept Maps",icon:"🗺️"},
    {id:"syllabus",label:"Syllabus Track",icon:"📖"},
    {id:"errors",label:"Error Journal",icon:"🧬"},
    {id:"revision",label:"Spaced Revision",icon:"🌙"},
    {id:"leaderboard",label:"Leaderboard",icon:"🏆"},
    {id:"planner",label:"Study Planner",icon:"📋"},
    {id:"analytics",label:"Analytics",icon:"📊"},
    {id:"pass",label:"Pass Assistant",icon:"🎯",badge:"⚡"},
  ];
  const ADMIN_NAV=[{id:"admin",label:"Admin Dashboard",icon:"👨‍🏫"},{id:"materials",label:"Materials",icon:"📚"},{id:"analytics",label:"Analytics",icon:"📊"},{id:"chat",label:"AI Tools",icon:"🤖"}];
  const nav=user?.role==="admin"?ADMIN_NAV:STUDENT_NAV;
  const TITLES={dashboard:"Dashboard",chat:"AI Tutor — Ollama 318B",test:"Mock Tests",materials:"Study Materials",studyhub:"Smart Study Hub",formulas:"Formula Library",pyq:"PYQ Bank",pomodoro:"Focus Timer",concepts:"Concept Maps",syllabus:"Syllabus Tracker",errors:"Error Journal",revision:"Spaced Revision",leaderboard:"Leaderboard",planner:"Study Planner",analytics:"Analytics",pass:"Pass Assistant",admin:"Admin"};

  if(screen==="home")return<><style>{CSS}</style><HomePage onGetStarted={()=>setScreen("auth")} onLogin={()=>setScreen("auth")}/><ToastContainer toasts={toasts}/></>;
  if(screen==="auth")return<><style>{CSS}</style><AuthScreen onLogin={handleLogin} onBack={()=>setScreen("home")}/><ToastContainer toasts={toasts}/></>;

  return(
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="sidebar">
          <div className="sidebar-inner">
            <div className="logo"><div className="logo-mark">StudyAI</div><div className="logo-sub">Ollama 318B · Local AI</div></div>
            <div className="nav-section">
              <div className="nav-label">Navigation</div>
              {nav.map(item=>(
                <div key={item.id} className={`nav-item ${page===item.id?"active":""}`} onClick={()=>setPage(item.id)}>
                  <span className="icon">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge&&<span className={`badge ${item.badge==="NEW"?"badge-new":""}`}>{item.badge}</span>}
                </div>
              ))}
            </div>
            <div className="sidebar-footer">
              <div className="ollama-pill" style={{marginBottom:8,width:"fit-content"}}>🟢 Ollama Running</div>
              <div className="user-pill" onClick={()=>{setUser(null);setScreen("home");}}>
                <div className="avatar">{user?.initials}</div>
                <div><div className="user-name">{user?.name}</div><div className="user-role">{user?.role==="admin"?"Administrator":"Student"}</div></div>
                <span style={{color:"var(--text3)",fontSize:11,marginLeft:"auto"}}>→</span>
              </div>
            </div>
          </div>
        </div>
        <div className="main">
          <div className="topbar">
            <div className="topbar-left">
              <div className="topbar-title">{TITLES[page]||page}</div>
            </div>
            <div className="topbar-actions">
              {page==="dashboard"&&<button className="btn btn-gold btn-sm" onClick={()=>setPage("pass")}>⚡ Pass Mode</button>}
              {page!=="chat"&&<button className="btn btn-primary btn-sm" onClick={()=>setPage("test")}>+ Test</button>}
              <div style={{width:30,height:30,borderRadius:7,background:"var(--surface)",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",border:"1px solid var(--border2)",fontSize:13}}>🔔</div>
            </div>
          </div>
          <div className="page-scroll">
            {page==="dashboard"&&<DashboardPage onNavigate={setPage} toast={toast}/>}
            {page==="chat"&&<ChatPage uploadedFiles={uploadedFiles}/>}
            {page==="test"&&<MockTestPage/>}
            {page==="materials"&&<MaterialsPage uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}/>}
            {page==="studyhub"&&<SmartStudyHub uploadedFiles={uploadedFiles} setUploadedFiles={setUploadedFiles}/>}
            {page==="formulas"&&<FormulaLibrary/>}
            {page==="pyq"&&<PYQBank/>}
            {page==="pomodoro"&&<PomodoroTimer/>}
            {page==="concepts"&&<ConceptMapper/>}
            {page==="syllabus"&&<SyllabusTracker/>}
            {page==="errors"&&<ErrorJournal/>}
            {page==="revision"&&<SpacedRevision/>}
            {page==="leaderboard"&&<Leaderboard/>}
            {page==="planner"&&<PlannerPage/>}
            {page==="analytics"&&<AnalyticsPage/>}
            {page==="pass"&&<PassAssistantPage/>}
            {page==="admin"&&<AdminPage/>}
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts}/>
    </>
  );
}
