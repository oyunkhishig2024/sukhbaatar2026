import { useState, useRef, useEffect } from "react";
import {
  loginOrCreateUser, registerHorse, getMyHorses, getAllHorses, deleteHorse,
  saveDeadline, getDeadline, clearDeadline,
  saveAgeGroupDeadline, clearAgeGroupDeadline, getAgeGroupDeadlines,
  getAdminStats, MAX_HORSE_NUMBER, MAX_TAVIACH_PER_AGE,
  getNextTaviachNumber, releaseTaviachNumber, getTaviachIssuedCounts, reconcileTaviachSequence,
  getBlockedHorseNumbers, setBlockedHorseNumbers,
  setHorsePaid, setHorsesPaid,
} from "./firebase/db";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const ADMIN_USER = "admin";
const ADMIN_PASS = "dundgovi2026";
const EXPLAINER_CODE = "tailbar2026";

const FEE_PER_HORSE = 100000; // MNT
const FEE_PER_TAVIACH = 100000; // MNT — charged per taviach (handler) number obtained, same as horse fee
const BANK_NAME = "Хаан банк";
const BANK_ACCOUNT_NUMBER = "610005005009207239";
const BANK_ACCOUNT_HOLDER = "Борын Оюунхишиг";

const AGE_GROUPS = [
  { id: 1, name: "Даага" },
  { id: 2, name: "Шүдлэн" },
  { id: 3, name: "Хязаалан" },
  { id: 4, name: "Соёолон" },
  { id: 5, name: "Их нас" },
  { id: 6, name: "Азарга" },
  { id: 7, name: "Сонгомол дээд" },
  { id: 8, name: "Сонгомол дунд" },
  { id: 9, name: "Сонгомол бага" },
];

// ─── CSS ─────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800&display=swap');
:root{
  --navy:#0f2170;--navy2:#0a1a5e;--navy3:#1a2f85;--navy4:#0d1c6e;
  --gold:#e8c060;--gold2:#f5d882;--gold3:#b8922a;--gold-bg:rgba(232,192,96,.12);
  --red:#c0392b;--red2:#e74c3c;
  --white:#fff;--white-dim:rgba(255,255,255,.75);--white-faint:rgba(255,255,255,.15);
  --border-gold:rgba(232,192,96,.35);--border-white:rgba(255,255,255,.15);
  --green:rgba(39,174,96,.15);--green-b:rgba(39,174,96,.35);--green-t:#2ecc71;
}
*{box-sizing:border-box;margin:0;padding:0;}
body,#root{font-family:'Poppins',sans-serif;background:var(--navy2);color:var(--white);min-height:100vh;}
.app{min-height:100vh;background:linear-gradient(160deg,var(--navy2) 0%,var(--navy4) 50%,#060e3a 100%);position:relative;overflow-x:hidden;}
.app::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% -20%,rgba(232,192,96,.08) 0%,transparent 70%);pointer-events:none;}
.cloud-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
.cloud-bg::before{
  content:'';
  position:absolute;
  top:0; left:0;
  width:calc(100% + 306px); height:100%;
  background-image:url('/cloud-pattern.png');
  background-repeat:repeat;
  background-size:306px auto;
  opacity:0.18;
  animation:cloudDrift 45s linear infinite;
}
@keyframes cloudDrift{
  from{ transform:translateX(0); }
  to{ transform:translateX(-306px); }
}
.app > header, .app > main{position:relative;z-index:1;}

/* HEADER */
.hdr{background:rgba(10,26,94,.92);border-bottom:1px solid var(--border-gold);padding:0 20px;display:flex;align-items:center;justify-content:space-between;height:60px;position:sticky;top:0;z-index:100;backdrop-filter:blur(12px);}
.logo-text{font-family:'Poppins',sans-serif;font-size:21px;font-weight:700;color:var(--gold);letter-spacing:2px;}
.logo-sub{font-size:12px;color:var(--white-dim);letter-spacing:1px;margin-top:-2px;}
.nav-tabs{display:flex;gap:4px;}
.ntab{padding:8px 14px;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--white-dim);font-family:'Poppins',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;display:flex;align-items:center;gap:5px;}
.ntab.active{background:var(--gold-bg);border-color:var(--border-gold);color:var(--gold);}
.ntab:hover:not(.active){background:var(--white-faint);color:var(--white);}
.user-badge{background:var(--gold-bg);border:1px solid var(--border-gold);border-radius:20px;padding:6px 14px;font-size:15px;color:var(--gold2);font-weight:600;cursor:pointer;transition:all .2s;}
.user-badge:hover{background:rgba(232,192,96,.2);}
.role-chip{display:inline-block;border-radius:12px;padding:3px 10px;font-size:13px;font-weight:700;letter-spacing:.5px;margin-left:6px;}
.role-admin{background:rgba(192,57,43,.2);border:1px solid rgba(192,57,43,.4);color:#ff8a80;}
.role-explainer{background:rgba(52,152,219,.2);border:1px solid rgba(52,152,219,.4);color:#7ec8f5;}
.role-user{background:var(--gold-bg);border:1px solid var(--border-gold);color:var(--gold2);}

/* AUTH */
.auth-screen{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;}
.auth-card{background:rgba(15,33,112,.6);border:1px solid var(--border-gold);border-radius:20px;padding:40px 36px;width:100%;max-width:420px;text-align:center;backdrop-filter:blur(20px);}
.auth-emblem{font-size:54px;margin-bottom:8px;}
.auth-title{font-family:'Poppins',sans-serif;font-size:18px;font-weight:700;color:var(--gold);margin-bottom:8px;letter-spacing:.5px;line-height:1.4;}
.auth-subtitle{font-size:13px;color:var(--gold);font-weight:600;letter-spacing:.3px;margin-bottom:24px;line-height:1.6;}
.tab-row{display:flex;gap:6px;margin-bottom:20px;}
.tab-btn{flex:1;padding:10px;border-radius:10px;border:1px solid var(--border-white);background:var(--white-faint);color:var(--white-dim);font-family:'Poppins',sans-serif;font-size:15px;font-weight:700;cursor:pointer;transition:all .2s;}
.tab-btn.active{background:var(--gold-bg);border-color:var(--border-gold);color:var(--gold);}

label{display:block;text-align:left;font-size:15px;font-weight:600;color:var(--white-dim);margin-bottom:6px;margin-top:14px;}
input[type="text"],input[type="number"],input[type="password"],select,textarea{width:100%;background:var(--white-faint);border:1px solid var(--border-white);border-radius:10px;padding:12px 14px;color:var(--white);font-family:'Poppins',sans-serif;font-size:17px;transition:all .2s;outline:none;}
input::placeholder{color:rgba(255,255,255,.3);}
input:focus,select:focus,textarea:focus{border-color:var(--gold);background:rgba(232,192,96,.08);}
select option{background:var(--navy);color:var(--white);}
textarea{resize:vertical;min-height:72px;}

/* BUTTONS */
.btn-gold{width:100%;background:linear-gradient(135deg,var(--gold3),var(--gold));border:none;border-radius:10px;padding:14px;color:var(--navy2);font-family:'Poppins',sans-serif;font-size:17px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:18px;letter-spacing:.3px;}
.btn-gold:hover{filter:brightness(1.1);transform:translateY(-1px);}
.btn-gold:disabled{opacity:.45;cursor:not-allowed;transform:none;}
.btn-outline{background:transparent;border:1px solid var(--border-gold);border-radius:10px;padding:11px 20px;color:var(--gold);font-family:'Poppins',sans-serif;font-size:16px;font-weight:600;cursor:pointer;transition:all .2s;}
.btn-outline:hover{background:var(--gold-bg);}
.btn-ghost{background:var(--white-faint);border:1px solid var(--border-white);border-radius:10px;padding:10px 16px;color:var(--white-dim);font-family:'Poppins',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;}
.btn-ghost:hover{background:rgba(255,255,255,.2);color:var(--white);}
.btn-red{background:rgba(192,57,43,.2);border:1px solid rgba(192,57,43,.4);border-radius:8px;padding:7px 14px;color:#ff8a80;font-family:'Poppins',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;}
.btn-red:hover{background:rgba(192,57,43,.35);}

/* PAGE WRAPPER */
.page{padding:24px 20px 48px;max-width:920px;margin:0 auto;}
.page-sm{padding:24px 20px 48px;max-width:640px;margin:0 auto;}

/* BACK */
.back-btn{display:flex;align-items:center;gap:6px;background:none;border:none;color:var(--white-dim);font-family:'Poppins',sans-serif;font-size:16px;cursor:pointer;padding:0;margin-bottom:20px;transition:color .2s;}
.back-btn:hover{color:var(--gold);}

/* SECTION TITLE */
.sec-title{font-family:'Poppins',sans-serif;font-size:17px;color:var(--gold);margin-bottom:14px;display:flex;align-items:center;gap:10px;}
.sec-title::after{content:'';flex:1;height:1px;background:var(--border-gold);}

/* BANNER */
.banner{background:rgba(15,33,112,.5);border:1px solid var(--border-gold);border-radius:16px;padding:20px 24px;margin-bottom:22px;position:relative;overflow:hidden;}
.banner h2{font-family:'Poppins',sans-serif;font-size:23px;color:var(--gold);margin-bottom:6px;}
.banner p{color:var(--white-dim);font-size:15px;line-height:1.6;max-width:480px;}

/* STATS */
.stats-row{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:18px;}
.stat-card{background:var(--white-faint);border:1px solid var(--border-white);border-radius:12px;padding:14px;text-align:center;}
.stat-val{font-family:'Poppins',sans-serif;font-size:25px;color:var(--gold);font-weight:700;}
.stat-label{font-size:13px;color:var(--white-dim);margin-top:3px;text-transform:uppercase;letter-spacing:.5px;}

/* AGE GRID */
.age-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px;}
.age-card{background:rgba(15,33,112,.5);border:1px solid var(--border-white);border-radius:14px;padding:18px 14px;transition:all .25s;text-align:center;}
.age-card.has{border-color:var(--border-gold);}
.age-label{font-family:'Poppins',sans-serif;font-size:16px;color:var(--white);font-weight:700;margin-bottom:4px;}
.age-reg-btn{width:100%;background:var(--gold-bg);border:1px solid var(--border-gold);border-radius:8px;padding:9px;color:var(--gold);font-family:'Poppins',sans-serif;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;margin-top:8px;}
.age-reg-btn:hover{background:rgba(232,192,96,.25);}
.badge{display:inline-block;border-radius:10px;padding:2px 8px;font-size:13px;font-weight:700;}
.badge-gold{background:var(--gold-bg);border:1px solid var(--border-gold);color:var(--gold);}

/* FORM CARD */
.fcard{background:rgba(15,33,112,.4);border:1px solid var(--border-white);border-radius:14px;padding:18px;margin-bottom:14px;}
.fcard h3{font-family:'Poppins',sans-serif;font-size:16px;color:var(--gold);margin-bottom:4px;}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
.err-msg{color:#ff8a80;font-size:14px;margin-top:4px;}
.upload-zone{position:relative;border:2px dashed var(--border-white);border-radius:12px;padding:18px;text-align:center;cursor:pointer;transition:all .2s;}
.upload-zone.filled{border-color:var(--border-gold);border-style:solid;padding:8px;}
.upload-zone input[type=file]{position:absolute;inset:0;opacity:0;cursor:pointer;}
.upload-icon{font-size:30px;margin-bottom:4px;}
.upload-lbl{font-size:15px;color:var(--white-dim);}
.upload-hint{font-size:13px;color:rgba(255,255,255,.35);margin-top:2px;}
.upload-preview{width:100%;max-height:200px;border-radius:8px;}

/* HORSE ITEM / EXPLAINER GRID */
.horse-item{display:flex;align-items:center;gap:14px;background:rgba(15,33,112,.4);border:1px solid var(--border-white);border-radius:12px;padding:12px 16px;margin-bottom:8px;cursor:pointer;transition:all .2s;}
.horse-item:hover{border-color:var(--border-gold);}
.horse-num{font-family:'Poppins',sans-serif;font-size:23px;color:var(--gold);font-weight:700;min-width:40px;text-align:center;}
.horse-name{font-weight:700;font-size:16px;}
.horse-meta{font-size:14px;color:var(--white-dim);margin-top:2px;}
.status-paid{margin-left:auto;background:var(--green);border:1px solid var(--green-b);border-radius:20px;padding:3px 10px;font-size:13px;color:var(--green-t);font-weight:700;white-space:nowrap;flex-shrink:0;}
.tag{display:inline-block;background:var(--gold-bg);border:1px solid var(--border-gold);border-radius:6px;padding:1px 7px;font-size:13px;color:var(--gold);margin-left:6px;}
.live-dot{width:10px;height:10px;border-radius:50%;background:#2ecc71;box-shadow:0 0 8px #2ecc71;animation:pulse 1.5s ease-in-out infinite;flex-shrink:0;}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.4;}}
@keyframes waitPulse{0%{transform:scale(1);opacity:.9;}100%{transform:scale(2.2);opacity:0;}}
.filter-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
.chip{background:var(--white-faint);border:1px solid var(--border-white);border-radius:20px;padding:6px 14px;font-size:14px;color:var(--white-dim);cursor:pointer;font-family:'Poppins',sans-serif;font-weight:600;transition:all .2s;}
.chip.active{background:var(--gold-bg);border-color:var(--border-gold);color:var(--gold);}
.horse-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
.exp-card{background:rgba(15,33,112,.4);border:1px solid var(--border-white);border-radius:12px;overflow:hidden;cursor:pointer;transition:all .2s;}
.exp-card:hover{border-color:var(--border-gold);transform:translateY(-2px);}
.exp-img{position:relative;height:100px;background:rgba(255,255,255,.04);display:flex;align-items:center;justify-content:center;}
.num-badge{position:absolute;top:6px;left:6px;background:linear-gradient(135deg,var(--gold3),var(--gold));color:var(--navy2);font-family:'Poppins',sans-serif;font-weight:700;font-size:15px;border-radius:8px;padding:2px 8px;}
.exp-body{padding:10px 12px;}
.exp-name{font-weight:700;font-size:15px;margin-bottom:4px;}
.exp-meta{font-size:13px;color:var(--white-dim);line-height:1.6;}

/* ADMIN */
.admin-tabs{display:flex;gap:6px;margin-bottom:22px;flex-wrap:wrap;}
.adm-tab{padding:9px 18px;border-radius:10px;border:1px solid var(--border-white);background:var(--white-faint);color:var(--white-dim);font-family:'Poppins',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;}
.adm-tab.active{background:rgba(192,57,43,.15);border-color:rgba(192,57,43,.4);color:#ff8a80;}
.adm-tab:hover:not(.active){background:rgba(255,255,255,.1);color:var(--white);}
.adm-card{background:rgba(15,33,112,.5);border:1px solid var(--border-white);border-radius:14px;padding:18px;margin-bottom:10px;}
.adm-row{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border-white);font-size:16px;}
.adm-row:last-child{border-bottom:none;}
.adm-label{color:var(--white-dim);font-size:15px;min-width:100px;}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(6,14,58,.85);display:flex;align-items:center;justify-content:center;z-index:200;padding:20px;backdrop-filter:blur(8px);}
.modal{background:var(--navy);border:1px solid var(--border-gold);border-radius:18px;padding:26px;width:100%;max-width:500px;max-height:82vh;overflow-y:auto;}
.modal-title{font-family:'Poppins',sans-serif;font-size:20px;color:var(--gold);margin-bottom:14px;padding-bottom:11px;border-bottom:1px solid var(--border-gold);display:flex;justify-content:space-between;align-items:center;}
.modal-close{background:none;border:none;color:var(--white-dim);font-size:25px;cursor:pointer;line-height:1;padding:0 4px;}
.detail-row{display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border-white);font-size:16px;}
.detail-row:last-child{border-bottom:none;}
.detail-lbl{color:var(--white-dim);min-width:110px;font-weight:600;font-size:15px;flex-shrink:0;}

/* MISC */
.spinner{width:30px;height:30px;border:3px solid var(--border-gold);border-top-color:var(--gold);border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 10px;}
@keyframes spin{to{transform:rotate(360deg);}}
.pass-wrap{position:relative;}
.pass-wrap input{padding-right:42px;}
.eye-btn{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;color:rgba(255,255,255,.45);font-size:21px;cursor:pointer;padding:0;line-height:1;transition:color .2s;}
.eye-btn:hover{color:var(--gold);}
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,var(--gold3),var(--gold));color:var(--navy2);padding:12px 20px;border-radius:16px;font-weight:700;font-size:16px;z-index:300;box-shadow:0 6px 28px rgba(232,192,96,.4);animation:toastIn .3s ease;white-space:normal;max-width:calc(100vw - 32px);width:max-content;text-align:center;line-height:1.5;word-break:keep-all;}
@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(16px);}}
@media(max-width:480px){.toast{bottom:16px;font-size:15px;padding:10px 16px;border-radius:12px;}}
.empty-state{text-align:center;padding:56px 20px;color:var(--white-dim);}
.empty-state .big{font-size:50px;margin-bottom:10px;}
.info-row{background:rgba(15,33,112,.4);border:1px solid var(--border-gold);border-radius:12px;padding:12px 16px;display:flex;align-items:center;gap:10px;margin-bottom:20px;}

@media(max-width:620px){
  .age-grid{grid-template-columns:repeat(3,1fr);}
  .stats-row{grid-template-columns:repeat(2,1fr);}
  .form-row{grid-template-columns:1fr;}
  .ntab span{display:none;}
  .hdr{padding:0 12px;}
}
`;

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  // Auth state — persisted to localStorage so refresh doesn't log out
  const [role, setRole] = useState(()=>{
    try { return localStorage.getItem("naadam_role") || null; } catch(e){ return null; }
  });
  const [authTab, setAuthTab] = useState("user"); // user | admin | explainer
  const [user, setUser] = useState(()=>{
    try {
      const saved = localStorage.getItem("naadam_user");
      return saved ? JSON.parse(saved) : null;
    } catch(e){ return null; }
  });

  // Registration deadline — admin sets this, stored in localStorage
  const [regDeadline, setRegDeadline] = useState(()=>{
    return localStorage.getItem("naadam_reg_deadline") || null;
  });
  const isRegClosed = regDeadline && new Date() > new Date(regDeadline);

  // Per-age-group deadlines — { [ageGroupId]: isoString } — lets specific age
  // groups close independently of the global deadline above.
  const [ageGroupDeadlines, setAgeGroupDeadlines] = useState({});
  const isAgeGroupClosed = (ag) => {
    if (isRegClosed) return true;
    const dl = ageGroupDeadlines[String(ag.id)];
    return !!(dl && new Date() > new Date(dl));
  };

  // Horse numbers the admin has set aside — never auto-assigned to anyone
  const [blockedNumbers, setBlockedNumbersState] = useState([]);
  const [blockedNumbersInput, setBlockedNumbersInput] = useState("");

  const [screen, setScreen] = useState(()=>{
    try {
      const savedRole = localStorage.getItem("naadam_role");
      const savedUser = localStorage.getItem("naadam_user");
      if(savedRole && savedUser) return "dashboard";
    } catch(e){}
    return "login";
  });
  const [activeNav, setActiveNav] = useState("dashboard");

  useEffect(()=>{
    try {
      if(role) localStorage.setItem("naadam_role", role); else localStorage.removeItem("naadam_role");
      if(user) localStorage.setItem("naadam_user", JSON.stringify(user)); else localStorage.removeItem("naadam_user");
    } catch(e){}
  },[role,user]);

  // Horse registration state
  const [selectedAge, setSelectedAge] = useState(null);
  const [hForm, setHForm] = useState({});
  const [hFormErr, setHFormErr] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [lastHorse, setLastHorse] = useState(null);

  // My horses (user) / all horses (admin+explainer)
  const [myHorses, setMyHorses] = useState([]);
  const [flatHorses, setFlatHorses] = useState([]);

  // Total registered count across the whole event — for "дугаар дууссан" (sold out)
  const [totalCount, setTotalCount] = useState(0);
  const soldOut = totalCount >= MAX_HORSE_NUMBER;

  const refreshMyHorses = async (phone) => {
    try { setMyHorses(await getMyHorses(phone)); } catch(e){ console.error(e); }
  };
  const refreshAllHorses = async () => {
    try {
      const all = await getAllHorses();
      setFlatHorses(all);
      setTotalCount(new Set(all.map(h=>h.number)).size);
    } catch(e){ console.error(e); }
  };

  // On page load/refresh, if a session was restored, reload data from Firebase
  useEffect(()=>{
    if(!role || !user) return;
    (async()=>{
      try {
        if(role==="user" && user.phone){
          await refreshMyHorses(user.phone);
          setScreen("dashboard"); setActiveNav("dashboard");
          const dl = await getDeadline();
          if(dl){ setRegDeadline(dl); localStorage.setItem("naadam_reg_deadline",dl); }
          setAgeGroupDeadlines(await getAgeGroupDeadlines());
        } else if(role==="admin"){
          await refreshAllHorses();
          setScreen("admin"); setActiveNav("admin");
          const dl = await getDeadline();
          if(dl){ setRegDeadline(dl); localStorage.setItem("naadam_reg_deadline",dl); }
          setAgeGroupDeadlines(await getAgeGroupDeadlines());
          const blocked = await getBlockedHorseNumbers();
          setBlockedNumbersState(blocked);
          setBlockedNumbersInput(blocked.join(", "));
        } else if(role==="explainer"){
          await refreshAllHorses();
          setScreen("explainer"); setActiveNav("explainer");
        }
      } catch(e){ console.error("Session restore error:", e); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  // Keep a lightweight running total visible on the user dashboard too
  useEffect(()=>{
    if(role==="user"){ refreshAllHorses(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[role]);

  // Explainer / Admin UI
  const [expFilter, setExpFilter] = useState("all");
  const [expSearch, setExpSearch] = useState("");
  const [expHorse, setExpHorse] = useState(null);
  const [adminTab, setAdminTab] = useState("overview");
  const [adminHorse, setAdminHorse] = useState(null);
  const [myHorseDetail, setMyHorseDetail] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (m) => { setToast(m); setTimeout(()=>setToast(null),3000); };

  // Countdown timer display — a single ticking clock drives both the global
  // deadline countdown and any per-age-group ones.
  const [nowTick, setNowTick] = useState(0);
  useEffect(()=>{
    const id = setInterval(()=>setNowTick(t=>t+1), 1000);
    return ()=>clearInterval(id);
  },[]);

  const formatCountdown = (deadlineIso) => {
    if (!deadlineIso) return null;
    const diff = new Date(deadlineIso) - new Date();
    if (diff <= 0) return null;
    const d = Math.floor(diff/86400000);
    const h = Math.floor((diff%86400000)/3600000);
    const m = Math.floor((diff%3600000)/60000);
    const s = Math.floor((diff%60000)/1000);
    return `${d>0?d+"өдөр ":""}${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  };

  // Converts a stored UTC ISO timestamp into the "YYYY-MM-DDTHH:mm" format a
  // <input type="datetime-local"> expects, correctly shown in LOCAL time
  // (previously this just truncated the raw UTC string, showing it off by
  // the timezone offset — e.g. midnight local showing as 4pm or similar).
  const toLocalDatetimeInputValue = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0,16);
  };
  // eslint-disable-next-line no-unused-vars
  const _tick = nowTick; // re-render every second so countdown strings below stay live
  const timeLeft = formatCountdown(regDeadline) || "Бүртгэл хаагдсан";

  // ── AUTH HANDLERS ────────────────────────────────────────────────────────
  const doRegister = async () => {
    const surname = document.getElementById("rs")?.value?.trim();
    const name = document.getElementById("rn")?.value?.trim();
    const el_rp = document.getElementById("rp"); const phone = (el_rp?.dataset?.val || el_rp?.value || "").trim();
    if(!surname||!name){showToast("Овог нэрээ оруулна уу");return;}
    if(!phone||phone.replace(/\D/g,"").length!==8){showToast("Гар утасны дугаар 8 оронтой байх ёстой");return;}
    try {
      const fbUser = await loginOrCreateUser({surname, givenName:name, phone});
      setUser({...fbUser, givenName:name, surname, phone});
      setRole("user"); setScreen("dashboard"); setActiveNav("dashboard");
      await refreshMyHorses(phone);
      await refreshAllHorses();
      const dl = await getDeadline();
      if(dl){ setRegDeadline(dl); localStorage.setItem("naadam_reg_deadline",dl); }
      setAgeGroupDeadlines(await getAgeGroupDeadlines());
      showToast("Тавтай морилно уу!");
    } catch(e){ showToast("Алдаа: "+e.message); }
  };
  const doLogin = async () => {
    const el_lp = document.getElementById("lp"); const phone = (el_lp?.dataset?.val || el_lp?.value || "").trim();
    if(!phone||phone.replace(/\D/g,"").length!==8){showToast("Гар утасны дугаар 8 оронтой байх ёстой");return;}
    try {
      const fbUser = await loginOrCreateUser({surname:"", givenName:"", phone});
      if(!fbUser.givenName && !fbUser.surname){
        showToast("Ийм утасны дугаартай хэрэглэгч олдсонгүй. Дугаараа зөв бичсэн эсэхээ шалгана уу, эсвэл бүртгүүлнэ үү.");
        return;
      }
      setUser({...fbUser, givenName: fbUser.givenName || phone, phone});
      setRole("user"); setScreen("dashboard"); setActiveNav("dashboard");
      await refreshMyHorses(phone);
      await refreshAllHorses();
      const dl = await getDeadline();
      if(dl){ setRegDeadline(dl); localStorage.setItem("naadam_reg_deadline",dl); }
      setAgeGroupDeadlines(await getAgeGroupDeadlines());
      showToast("Тавтай морилно уу!");
    } catch(e){
      showToast("Ийм утасны дугаартай хэрэглэгч олдсонгүй. Дугаараа зөв бичсэн эсэхээ шалгана уу, эсвэл бүртгүүлнэ үү.");
    }
  };
  const doAdminLogin = async () => {
    const u = document.getElementById("au")?.value?.trim();
    const p = document.getElementById("ap")?.value?.trim();
    if(u===ADMIN_USER && p===ADMIN_PASS){
      setUser({name:"Админ"}); setRole("admin"); setScreen("admin"); setActiveNav("admin");
      try {
        await refreshAllHorses();
        const dl = await getDeadline();
        if(dl){ setRegDeadline(dl); localStorage.setItem("naadam_reg_deadline",dl); }
        setAgeGroupDeadlines(await getAgeGroupDeadlines());
        const blocked = await getBlockedHorseNumbers();
        setBlockedNumbersState(blocked);
        setBlockedNumbersInput(blocked.join(", "));
      } catch(e){ console.error("Admin load:", e); showToast("Алдаа: "+e.message); }
    } else { showToast("Нэвтрэх нэр эсвэл нууц үг буруу байна"); }
  };
  const doExplainerLogin = async () => {
    const code = document.getElementById("ec")?.value?.trim();
    if(code===EXPLAINER_CODE){
      setUser({name:"Тайлбарлагч"}); setRole("explainer"); setScreen("explainer"); setActiveNav("explainer");
      await refreshAllHorses();
    } else { showToast("Код буруу байна"); }
  };
  const logout=()=>{
    setRole(null);setUser(null);setScreen("login");setActiveNav("dashboard");
    try { localStorage.removeItem("naadam_role"); localStorage.removeItem("naadam_user"); } catch(e){}
  };

  // ── REGISTRATION FLOW ────────────────────────────────────────────────────
  const [taviachIssued, setTaviachIssued] = useState({}); // { [ageGroupId]: issuedCount }

  const refreshTaviachIssued = async () => {
    try { setTaviachIssued(await getTaviachIssuedCounts()); } catch(e){ console.error(e); }
  };

  // Safety net: if the user leaves the horse form by ANY route (header nav tabs,
  // browser back, etc.) — not just the in-form "← Буцах" button — while holding a
  // taviach number that was never actually submitted, release it back into that
  // age group's pool instead of leaving it permanently stuck.
  const prevScreenRef = useRef(screen);
  useEffect(() => {
    const prevScreen = prevScreenRef.current;
    if (prevScreen === "horseForm" && screen !== "horseForm") {
      if (hForm.taviachRequested && hForm.taviachNum && selectedAge) {
        releaseTaviachNumber(selectedAge.id, hForm.taviachNum).catch(e=>console.error(e));
      }
    }
    prevScreenRef.current = screen;
  }, [screen]);

  const openAge=(ag)=>{
    if(hForm.taviachRequested && hForm.taviachNum && selectedAge){
      releaseTaviachNumber(selectedAge.id, hForm.taviachNum).catch(e=>console.error(e));
    }
    setSelectedAge(ag);setHForm({});setHFormErr({});setScreen("horseForm");
    refreshTaviachIssued();
  };

  const [isRegistering, setIsRegistering] = useState(false);

  // Submits the registration directly — the app assigns the number automatically:
  // reuse the rider's existing number if they don't already have a horse in this
  // age group, otherwise mint a brand-new first-come-first-served number.
  const submitRegistration = async () => {
    if(isRegistering) return;
    if(soldOut){ showToast("Уучлаарай, бүх дугаар дууссан байна!"); return; }
    if(selectedAge && isAgeGroupClosed(selectedAge)){ showToast(`${selectedAge.name} ангилалд бүртгэл хаагдсан байна`); setScreen("dashboard"); return; }
    const errs=validateForm(hForm);
    if(Object.keys(errs).length){setHFormErr(errs);showToast("Заавал талбаруудыг бөглөнө үү");return;}
    setHFormErr({});
    setIsRegistering(true);
    showToast("Бүртгэж байна...");
    try {
      const fbHorse = await registerHorse(user?.id, user?.phone, selectedAge.id, selectedAge.name, {...hForm}, myHorses);
      setLastHorse(fbHorse);
      setHForm({});
      setHFormErr({});
      await refreshMyHorses(user?.phone);
      await refreshAllHorses();
      setScreen("success");
      showToast("Бүртгэл баталгаажлаа! 🎉");
    } catch(e){
      console.error("Firebase save error:", e);
      showToast("Алдаа: "+(e.message||e.code||"Firebase холбогдсонгүй"));
    } finally {
      setIsRegistering(false);
    }
  };

  const setField=(k,v)=>{
    setHForm(f=>({...f,[k]:v}));
    if(hFormErr[k])setHFormErr(e=>{const n={...e};delete n[k];return n;});
  };

  const cyrilOnly = (v) => {
    if (/[A-Za-z]/.test(v)) showToast("⚠ Та зөвхөн Монголоор бичнэ үү");
    return v.replace(/[A-Za-z]/g, "");
  };

  // Immediately assign (or release) a "Морь тавиач" handler number when the user toggles Тийм/Үгүй.
  // Numbers come from THIS age group's own 1–25 pool — never shared with other age groups.
  const [taviachBusy, setTaviachBusy] = useState(false);
  const selectTaviach = async (wantsIt) => {
    if(taviachBusy || !selectedAge) return;
    setTaviachBusy(true);
    try {
      if(wantsIt){
        if(hForm.taviachRequested===true && hForm.taviachNum) { setTaviachBusy(false); return; } // already assigned
        const num = await getNextTaviachNumber(selectedAge.id);
        setHForm(f=>({...f, taviachRequested:true, taviachNum:num}));
        showToast(`Тавиачийн дугаар: #${num} ✓`);
        refreshTaviachIssued();
      } else {
        if(hForm.taviachRequested===true && hForm.taviachNum){
          await releaseTaviachNumber(selectedAge.id, hForm.taviachNum);
          refreshTaviachIssued();
        }
        setHForm(f=>({...f, taviachRequested:false, taviachNum:0}));
      }
      setHFormErr(e=>{const n={...e};delete n.taviachRequested;return n;});
    } catch(e){
      console.error(e);
      showToast(e.message || "Тавиачийн дугаар дууссан байна!");
      refreshTaviachIssued();
    } finally {
      setTaviachBusy(false);
    }
  };

  const validateForm=(f)=>{
    const e={};
    if(!f.uyaachInfo)e.uyaachInfo="Уяачийн цол, овог нэр оруулна уу";
    if(!f.ownerInfo)e.ownerInfo="Морины эзний цол, овог нэр оруулна уу";
    if(!f.horseInfo)e.horseInfo="Морины зүс, тамга оруулна уу";
    if(!f.riderInfo)e.riderInfo="Уралдаанч хүүхдийн овог, нэр оруулна уу";
    if(!f.riderDetails)e.riderDetails="Уралдаанч хүүхдийн нас, хүйс оруулна уу";
    if(!f.insuranceInfo)e.insuranceInfo="Даатгалын нэр, дугаар оруулна уу";
    if(f.taviachRequested===null||f.taviachRequested===undefined)e.taviachRequested="Тавиачийн дугаар авах эсэхээ сонгоно уу";
    if(!f.phone||f.phone.length!==8)e.phone="8 оронтой утасны дугаар оруулна уу";
    return e;
  };

  // ── EXPORT CSV ──────────────────────────────────────────────────────────────
  const csvEscape = (v) =>
    typeof v==="string" && (v.includes(",") || v.includes('"') || v.includes("\n"))
      ? `"${v.replace(/"/g,'""')}"`
      : v;

  const exportCSV = () => {
    const headers = [
      "Дэс дугаар","Уралдах дугаар","Насны ангилал",
      "Уяачийн цол, овог нэр","Уяачийн харъяалал",
      "Морины эзний цол, овог нэр","Морины эзний харъяалал",
      "Морины зүс, тамга",
      "Уралдаанч хүүхдийн овог, нэр","Уралдаанч хүүхдийн нас, хүйс",
      "Даатгалын нэр, дугаар",
      "Тавиачийн дугаар","Холбоо барих утас","Төлбөрийн төлөв"
    ];
    const rows = flatHorses.map((h,i)=>[
      i+1, h.number, h.ageGroupName||"",
      h.uyaachInfo||"", h.uyaachRegion||"",
      h.ownerInfo||"", h.ownerRegion||"",
      h.horseInfo||"",
      h.riderInfo||"", h.riderDetails||"",
      h.insuranceInfo||"",
      h.taviachNum>0 ? h.taviachNum : "",
      h.phone||"",
      h.paid ? "Төлсөн" : "Хүлээгдэж буй"
    ].map(csvEscape));
    const BOM = "\ufeff";
    const csv = BOM + [headers.map(csvEscape), ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `дундговь_наадам2026_бүртгэл_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${flatHorses.length} бүртгэл экспортлогдлоо ✓`);
  };

  const exportByAge = (ageId) => {
    const horses = ageId === "all" ? flatHorses : flatHorses.filter(h=>h.ageGroupId===ageId);
    const ageName = ageId === "all" ? "бүгд" : AGE_GROUPS.find(a=>a.id===ageId)?.name || ageId;
    const headers = [
      "Дэс дугаар","Уралдах дугаар","Уяачийн цол, овог нэр","Морины зүс, тамга",
      "Морины эзний цол, овог нэр",
      "Уралдаанч хүүхдийн овог, нэр","Уралдаанч хүүхдийн нас, хүйс",
      "Даатгалын нэр, дугаар","Тавиачийн дугаар","Холбоо барих утас","Төлбөрийн төлөв"
    ];
    const rows = horses.map((h,i)=>[
      i+1, h.number, h.uyaachInfo||"", h.horseInfo||"",
      h.ownerInfo||"",
      h.riderInfo||"", h.riderDetails||"",
      h.insuranceInfo||"",
      h.taviachNum>0 ? h.taviachNum : "",
      h.phone||"",
      h.paid ? "Төлсөн" : "Хүлээгдэж буй"
    ].map(csvEscape));
    const BOM = "\ufeff";
    const csv = BOM + [headers.map(csvEscape), ...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8;"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `дундговь_наадам2026_${ageName}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${horses.length} морь экспортлогдлоо ✓`);
  };


  // Admin actions
  const adminDelete = async (h) => {
    try { await deleteHorse(h); } catch(e){ console.error(e); }
    setFlatHorses(prev=>prev.filter(x=>x.id!==h.id));
    setTotalCount(c=>Math.max(0,c-1));
    showToast("Бүртгэл устгагдлаа — дугаар нь дараагийн бүртгэгчид олгогдоно");
  };

  const adminConfirmPayment = async (h) => {
    try {
      await setHorsePaid(h.id, true);
      setFlatHorses(prev=>prev.map(x=>x.id===h.id?{...x,paid:true}:x));
      showToast(`#${h.number} төлбөр баталгаажлаа ✓`);
    } catch(e){ console.error(e); showToast("Алдаа: "+e.message); }
  };

  const adminConfirmPaymentToggle = async (h, paid) => {
    try {
      await setHorsePaid(h.id, paid);
      setFlatHorses(prev=>prev.map(x=>x.id===h.id?{...x,paid}:x));
      setAdminHorse(prev=>prev && prev.id===h.id ? {...prev, paid} : prev);
      showToast(paid ? `#${h.number} төлбөр баталгаажлаа ✓` : `#${h.number} төлбөр буцаагдлаа`);
    } catch(e){ console.error(e); showToast("Алдаа: "+e.message); }
  };

  const adminConfirmPaymentsForPhone = async (phone, ids) => {
    try {
      await setHorsesPaid(ids, true);
      setFlatHorses(prev=>prev.map(x=>ids.includes(x.id)?{...x,paid:true}:x));
      showToast(`${ids.length} бүртгэлийн төлбөр баталгаажлаа ✓`);
    } catch(e){ console.error(e); showToast("Алдаа: "+e.message); }
  };

  // Nav helper
  const goNav=(tab,sc)=>{setActiveNav(tab);setScreen(sc);};

  // Clipboard copy with textarea fallback for sandboxed environments
  const copyText = (text, label) => {
    const fallback = () => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try { document.execCommand("copy"); showToast(`${label} хуулагдлаа ✓`); }
      catch { showToast(`${label}: ${text}`); }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(()=>showToast(`${label} хуулагдлаа ✓`)).catch(fallback);
    } else { fallback(); }
  };

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <div className="cloud-bg" aria-hidden="true"></div>

        {/* ── HEADER ── */}
        {role && (
          <header className="hdr">
            <div>
              <div className="logo-text">НААДАМ</div>
            </div>

            <nav className="nav-tabs">
              {role==="user" && <>
                <button className={`ntab ${activeNav==="dashboard"?"active":""}`} onClick={()=>goNav("dashboard","dashboard")}>🏠 <span>Нүүр</span></button>
                <button className={`ntab ${activeNav==="myhorses"?"active":""}`} onClick={()=>goNav("myhorses","myhorses")}> <span>Морьд</span></button>
                <button className={`ntab ${activeNav==="payment"?"active":""}`} onClick={async()=>{await refreshMyHorses(user?.phone);goNav("payment","payment");}}>💳 <span>Төлбөр</span></button>
              </>}
              {role==="explainer" && (
                <button className={`ntab ${activeNav==="explainer"?"active":""}`} onClick={()=>goNav("explainer","explainer")}>📢 <span>Тайлбарлагч</span></button>
              )}
              {role==="admin" && <>
                <button className={`ntab ${activeNav==="admin"?"active":""}`} onClick={()=>goNav("admin","admin")}>🔐 <span>Удирдлага</span></button>
                <button className={`ntab ${activeNav==="explainer"?"active":""}`} onClick={()=>goNav("explainer","explainer")}>📢 <span>Тайлбарлагч</span></button>
              </>}
            </nav>

            <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
              <div className="user-badge" style={{cursor:"default"}}>
                {role==="admin"&&<span className="role-chip role-admin">Админ</span>}
                {role==="explainer"&&<span className="role-chip role-explainer">Тайлбарлагч</span>}
                {role==="user"&&<span className="role-chip role-user">Хэрэглэгч</span>}
                {" "}{user?.givenName||user?.name?.split(" ")[1]||user?.name}
              </div>
              <button onClick={logout}
                style={{background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:"20px",padding:"6px 14px",color:"#ff8a80",fontFamily:"'Poppins',sans-serif",fontSize:"15px",fontWeight:700,cursor:"pointer",transition:"all .2s"}}
                onMouseOver={e=>e.target.style.background="rgba(192,57,43,.3)"}
                onMouseOut={e=>e.target.style.background="rgba(192,57,43,.15)"}>
                Гарах
              </button>
            </div>
          </header>
        )}

        <main>

          {/* ══ LOGIN ══ */}
          {screen==="login" && (
            <div className="auth-screen">
              <div className="auth-card">

                <img src="/naadam-logo.png" alt="Наадам лого" style={{width:"120px",height:"120px",borderRadius:"50%",margin:"0 auto 16px",display:"block",boxShadow:"0 4px 24px rgba(232,192,96,.35)"}}/>

                <div className="auth-title">ИХ МАНДАЛ-6 ГОВИЙН БҮСИЙН ХУРДАН МОРИНЫ УРАЛДААН</div>

                <div className="auth-subtitle">ДУНДГОВЬ АЙМГИЙН "НАРНЫ ХҮЛЭГ" УЯАЧДЫН ХОЛБООНЫ 30 ЖИЛИЙН ОЙН БАЯР НААДАМ</div>

                <div className="tab-row">
                  <button className={`tab-btn ${authTab==="user"?"active":""}`} onClick={()=>setAuthTab("user")}>👤 Хэрэглэгч</button>
                  <button className={`tab-btn ${authTab==="explainer"?"active":""}`} onClick={()=>setAuthTab("explainer")}>📢 Тайлбарлагч</button>
                  <button className={`tab-btn ${authTab==="admin"?"active":""}`} onClick={()=>setAuthTab("admin")}>🔐 Админ</button>
                </div>

                {authTab==="user" && <UserAuth doRegister={doRegister} doLogin={doLogin}/>}

                {authTab==="explainer" && (
                  <>
                    <div className="info-row" style={{marginBottom:"4px"}}>
                      <span style={{fontSize:"23px"}}>📢</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:"16px",color:"var(--gold)"}}>Тайлбарлагчийн нэвтрэх</div>
                        <div style={{fontSize:"14px",color:"var(--white-dim)"}}>Зохион байгуулагчаас олгосон нэвтрэх кодоо оруулна уу</div>
                      </div>
                    </div>
                    <label>Нэвтрэх код</label>
                    <EyeInput id="ec" placeholder="Нэвтрэх код"/>
                    <button className="btn-gold" onClick={doExplainerLogin}>Нэвтрэх →</button>
                  </>
                )}

                {authTab==="admin" && (
                  <>
                    <div className="info-row" style={{marginBottom:"4px"}}>
                      <span style={{fontSize:"23px"}}>🔐</span>
                      <div>
                        <div style={{fontWeight:700,fontSize:"16px",color:"#ff8a80"}}>Админы нэвтрэх</div>
                        <div style={{fontSize:"14px",color:"var(--white-dim)"}}>Зөвхөн зохион байгуулагчдад зориулагдсан</div>
                      </div>
                    </div>
                    <label>Нэвтрэх нэр</label>
                    <input id="au" type="text" placeholder="Нэвтрэх нэр"/>
                    <label>Нууц үг</label>
                    <EyeInput id="ap" placeholder="Нууц үг"/>
                    <button className="btn-gold" onClick={doAdminLogin} style={{background:"linear-gradient(135deg,#7b1010,var(--red2))"}}>Нэвтрэх →</button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ══ USER DASHBOARD ══ */}
          {screen==="dashboard" && role==="user" && (
            <div className="page">
              <div className="banner">
                <h2>Тавтай морилно уу, {user?.givenName}!</h2>
                <p>Мориныхоо насны ангиллыг сонгоод бүртгэлийг эхлүүлнэ үү. Дугаар шууд баталгаажина; бүртгэлээ дуусгасны дараа төлбөрийн мэдээллийг харах болно.</p>
                <div className="stats-row">
                  <div className="stat-card"><div className="stat-val">{myHorses.length}</div><div className="stat-label">Миний морь</div></div>
                  <div className="stat-card"><div className="stat-val">{totalCount}</div><div className="stat-label">Нийт бүртгэл</div></div>
                  <div className="stat-card"><div className="stat-val">{Math.max(0,MAX_HORSE_NUMBER-totalCount)}</div><div className="stat-label">Үлдсэн дугаар</div></div>
                  <div className="stat-card"><div className="stat-val">{AGE_GROUPS.length}</div><div className="stat-label">Насны ангилал</div></div>
                </div>
              </div>

              {soldOut && (
                <div style={{background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:"12px",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"12px"}}>
                  <span style={{fontSize:"23px"}}>🔒</span>
                  <div style={{fontWeight:700,fontSize:"16px",color:"#ff8a80"}}>Дугаар дууссан — бүртгэл хаагдсан</div>
                </div>
              )}

              {!soldOut && regDeadline && (
                <div style={{
                  background: isRegClosed ? "rgba(192,57,43,.15)" : "rgba(39,174,96,.1)",
                  border: `1px solid ${isRegClosed ? "rgba(192,57,43,.4)" : "rgba(39,174,96,.3)"}`,
                  borderRadius:"12px", padding:"12px 16px", marginBottom:"16px",
                  display:"flex", alignItems:"center", gap:"12px"
                }}>
                  <span style={{fontSize:"23px"}}>{isRegClosed ? "🔒" : "⏰"}</span>
                  <div>
                    <div style={{fontWeight:700, fontSize:"16px", color: isRegClosed ? "#ff8a80" : "#2ecc71"}}>
                      {isRegClosed ? "Бүртгэл хаагдсан" : `Бүртгэл хаагдах хүртэл: ${timeLeft}`}
                    </div>
                    <div style={{fontSize:"14px", color:"var(--white-dim)", marginTop:"2px"}}>
                      {isRegClosed
                        ? "Бүртгэлийн хугацаа дууссан байна"
                        : `Хаагдах огноо: ${new Date(regDeadline).toLocaleString("mn-MN")}`}
                    </div>
                  </div>
                </div>
              )}

              {!soldOut && AGE_GROUPS.filter(ag=>ageGroupDeadlines[String(ag.id)]).length>0 && (
                <div style={{marginBottom:"16px",display:"flex",flexDirection:"column",gap:"8px"}}>
                  {AGE_GROUPS.filter(ag=>ageGroupDeadlines[String(ag.id)]).map(ag=>{
                    const dl = ageGroupDeadlines[String(ag.id)];
                    const left = formatCountdown(dl);
                    const closedNow = !left;
                    return (
                      <div key={ag.id} style={{
                        background: closedNow ? "rgba(192,57,43,.15)" : "rgba(232,192,96,.1)",
                        border: `1px solid ${closedNow ? "rgba(192,57,43,.4)" : "var(--border-gold)"}`,
                        borderRadius:"12px", padding:"10px 16px",
                        display:"flex", alignItems:"center", gap:"12px"
                      }}>
                        <span style={{fontSize:"20px"}}>{closedNow ? "🔒" : "⏳"}</span>
                        <div>
                          <div style={{fontWeight:700, fontSize:"15px", color: closedNow ? "#ff8a80" : "var(--gold)"}}>
                            {ag.name}: {closedNow ? "Бүртгэл хаагдсан" : `хаагдах хүртэл ${left}`}
                          </div>
                          {!closedNow && (
                            <div style={{fontSize:"13px", color:"var(--white-dim)", marginTop:"2px"}}>
                              Хаагдах огноо: {new Date(dl).toLocaleString("mn-MN")}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="sec-title">Насны Ангилал — Морь Бүртгэх</div>
              <div className="age-grid">
                {AGE_GROUPS.map(ag=>{
                  const cnt=myHorses.filter(h=>h.ageGroupId===ag.id).length;
                  const closed = isAgeGroupClosed(ag) || soldOut;
                  return (
                    <div key={ag.id} className={`age-card ${cnt>0?"has":""}`}>
                      <div className="age-label">{ag.name}</div>
                      {cnt>0 && <span className="badge badge-gold" style={{display:"block",marginBottom:"8px"}}>{cnt} морь бүртгэлтэй</span>}
                      {closed
                        ? <div className="age-reg-btn" style={{background:"rgba(255,255,255,.1)",color:"rgba(255,255,255,.4)",cursor:"not-allowed"}}>🔒 {soldOut?"Дугаар дууссан":"Хаагдсан"}</div>
                        : <button className="age-reg-btn" onClick={()=>openAge(ag)}>+ Морь бүртгэх</button>
                      }
                    </div>
                  );
                })}
              </div>

              {myHorses.length>0 && <>
                <div className="sec-title">Миний Бүртгэлтэй Морьд</div>
                {myHorses.map(h=>(
                  <div key={h.id} className="horse-item" onClick={()=>setMyHorseDetail(h)}>
                    <div className="horse-num">{h.number}</div>
                    <div>
                      <div className="horse-name">{h.ownerInfo}</div>
                      <div className="horse-meta">{h.ageGroupName} · Уяач: {h.uyaachInfo||"—"} · Уралдаанч: {h.riderInfo}</div>
                      {h.taviachNum>0 && <div style={{marginTop:"4px",display:"inline-block",background:"rgba(39,174,96,.15)",border:"1px solid rgba(39,174,96,.4)",borderRadius:"8px",padding:"2px 8px",fontSize:"12px",color:"#2ecc71",fontWeight:700}}>🏁 Тавиач #{h.taviachNum}</div>}
                    </div>
                    {h.paid
                      ? <span className="status-paid">✓ Төлөгдсөн</span>
                      : <span style={{marginLeft:"auto",background:"rgba(232,192,96,.15)",border:"1px solid rgba(232,192,96,.35)",borderRadius:"20px",padding:"3px 10px",fontSize:"13px",color:"var(--gold)",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Хүлээгдэж буй</span>
                    }
                  </div>
                ))}
              </>}
            </div>
          )}

          {/* ══ MY HORSES ══ */}
          {screen==="myhorses" && role==="user" && (
            <div className="page-sm">
              <div className="sec-title">Миний Морьд</div>
              {myHorses.length===0
                ? <div className="empty-state"><div className="big">📋</div><div>Одоохондоо бүртгэлтэй морь байхгүй</div></div>
                : myHorses.map(h=>(
                  <div key={h.id} className="horse-item" onClick={()=>setMyHorseDetail(h)}>
                    <div className="horse-num">{h.number}</div>
                    <div>
                      <div className="horse-name">{h.ownerInfo}</div>
                      <div className="horse-meta">{h.ageGroupName} · Уяач: {h.uyaachInfo||"—"} · Уралдаанч: {h.riderInfo}</div>
                      {h.taviachNum>0 && <div style={{marginTop:"4px",display:"inline-block",background:"rgba(39,174,96,.15)",border:"1px solid rgba(39,174,96,.4)",borderRadius:"8px",padding:"2px 8px",fontSize:"12px",color:"#2ecc71",fontWeight:700}}>🏁 Тавиач #{h.taviachNum}</div>}
                    </div>
                    {h.paid
                      ? <span className="status-paid">✓ Төлөгдсөн</span>
                      : <span style={{marginLeft:"auto",background:"rgba(232,192,96,.15)",border:"1px solid rgba(232,192,96,.35)",borderRadius:"20px",padding:"3px 10px",fontSize:"13px",color:"var(--gold)",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Хүлээгдэж буй</span>
                    }
                  </div>
                ))
              }
            </div>
          )}

          {/* ══ HORSE FORM ══ */}
          {screen==="horseForm" && selectedAge && (
            <div className="page-sm">
              <button className="back-btn" onClick={()=>{
                if(hForm.taviachRequested && hForm.taviachNum){
                  releaseTaviachNumber(selectedAge.id, hForm.taviachNum).catch(e=>console.error(e));
                }
                setScreen("dashboard");
              }}>← Буцах</button>
              <div style={{marginBottom:"18px"}}>
                <div style={{fontFamily:"'Poppins',sans-serif",color:"var(--gold)",fontSize:"18px",marginBottom:"3px"}}>{selectedAge.name}</div>
                <div style={{color:"var(--white-dim)",fontSize:"15px"}}>{selectedAge?.name} ангилал — мэдээлэл бөглөх</div>
              </div>

              <div className="fcard">
                {/* 1. Уяачийн цол, овог нэр */}
                <label>Уяачийн цол, овог нэр *</label>
                <input type="text" placeholder="ААУ, Борын Оюунхишиг" value={hForm.uyaachInfo||""} onChange={e=>setField("uyaachInfo",cyrilOnly(e.target.value))}/>
                {hFormErr.uyaachInfo&&<p className="err-msg">⚠ {hFormErr.uyaachInfo}</p>}

                {/* 2. Уяачийн харъяалал */}
                <label>Уяачийн харъяалал</label>
                <input type="text" placeholder="Дундговь, Эрдэнэдалай" value={hForm.uyaachRegion||""} onChange={e=>setField("uyaachRegion",cyrilOnly(e.target.value))}/>

                {/* 3. Морины эзний цол, овог нэр */}
                <label>Морины эзний цол, овог нэр *</label>
                <input type="text" placeholder="МУМУ, Саранхүүгийн Хонгор" value={hForm.ownerInfo||""} onChange={e=>setField("ownerInfo",cyrilOnly(e.target.value))}/>
                {hFormErr.ownerInfo&&<p className="err-msg">⚠ {hFormErr.ownerInfo}</p>}

                {/* 4. Морины эзний харъяалал */}
                <label>Морины эзний харъяалал</label>
                <input type="text" placeholder="Улаанбаатар, Баянзүрх" value={hForm.ownerRegion||""} onChange={e=>setField("ownerRegion",cyrilOnly(e.target.value))}/>

                {/* 5. Морины зүс, тамга */}
                <label>Морины зүс, тамга *</label>
                <input type="text" placeholder="Шарга, Товхтой буйл" value={hForm.horseInfo||""} onChange={e=>setField("horseInfo",cyrilOnly(e.target.value))}/>
                {hFormErr.horseInfo&&<p className="err-msg">⚠ {hFormErr.horseInfo}</p>}

                {/* 6. Уралдаанч хүүхдийн овог, нэр */}
                <label>Уралдаанч хүүхдийн овог, нэр *</label>
                <input type="text" placeholder="Оюунхишигийн Цэлмэг" value={hForm.riderInfo||""} onChange={e=>setField("riderInfo",cyrilOnly(e.target.value))}/>
                {hFormErr.riderInfo&&<p className="err-msg">⚠ {hFormErr.riderInfo}</p>}

                {/* 7. Уралдаанч хүүхдийн нас, хүйс */}
                <label>Уралдаанч хүүхдийн нас, хүйс *</label>
                <input type="text" placeholder="10, Эрэгтэй" value={hForm.riderDetails||""} onChange={e=>setField("riderDetails",cyrilOnly(e.target.value))}/>
                {hFormErr.riderDetails&&<p className="err-msg">⚠ {hFormErr.riderDetails}</p>}

                {/* 8. Даатгалын нэр, дугаар */}
                <label>Даатгалын нэр, дугаар *</label>
                <input type="text" placeholder="МИГ даатгал, 123456" value={hForm.insuranceInfo||""} onChange={e=>setField("insuranceInfo",cyrilOnly(e.target.value))}/>
                {hFormErr.insuranceInfo&&<p className="err-msg">⚠ {hFormErr.insuranceInfo}</p>}
              </div>

              {/* 9. Морь тавиач авах эсэх */}
              <div className="fcard">
                <div style={{background:"rgba(232,192,96,.08)",border:"1px solid rgba(232,192,96,.25)",borderRadius:"14px",padding:"16px"}}>
                  <div style={{fontWeight:700,fontSize:"16px",marginBottom:"4px",color:"var(--gold)"}}>🏁 Морь тавиач авах эсэх</div>
                  {(() => {
                    const issued = taviachIssued[String(selectedAge.id)] || 0;
                    const remaining = Math.max(0, MAX_TAVIACH_PER_AGE - issued);
                    const exhausted = remaining<=0 && !(hForm.taviachRequested===true && hForm.taviachNum>0);
                    return (
                      <>
                        <div style={{fontSize:"13px",color:"var(--white-dim)",marginBottom:"12px"}}>
                          {selectedAge.name} ангилалд: {remaining} / {MAX_TAVIACH_PER_AGE} сул
                        </div>
                        {exhausted && (
                          <div style={{marginBottom:"12px",padding:"10px 14px",background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:"10px",fontSize:"14px",color:"#ff8a80",fontWeight:700}}>
                            🔒 Энэ насны ангилалд тавиачийн дугаар дууссан байна
                          </div>
                        )}
                        <div style={{display:"flex",gap:"10px"}}>
                          <button type="button" disabled={taviachBusy || exhausted}
                            onClick={()=>selectTaviach(true)}
                            style={{
                              flex:1,borderRadius:"10px",padding:"12px",fontFamily:"'Poppins',sans-serif",
                              fontSize:"16px",fontWeight:700,cursor:(taviachBusy||exhausted)?"not-allowed":"pointer",
                              transition:"all .2s",
                              background: hForm.taviachRequested===true ? "linear-gradient(135deg,var(--gold3),var(--gold))" : "transparent",
                              color: hForm.taviachRequested===true ? "var(--navy2)" : "rgba(255,255,255,.5)",
                              border: hForm.taviachRequested===true ? "1px solid var(--gold)" : "1px solid var(--border-white)",
                              opacity: (taviachBusy||exhausted)?0.5:1,
                            }}>Тийм</button>
                          <button type="button" disabled={taviachBusy}
                            onClick={()=>selectTaviach(false)}
                            style={{
                              flex:1,borderRadius:"10px",padding:"12px",fontFamily:"'Poppins',sans-serif",
                              fontSize:"16px",fontWeight:700,cursor:taviachBusy?"not-allowed":"pointer",
                              transition:"all .2s",
                              background: hForm.taviachRequested===false ? "linear-gradient(135deg,var(--gold3),var(--gold))" : "transparent",
                              color: hForm.taviachRequested===false ? "var(--navy2)" : "rgba(255,255,255,.5)",
                              border: hForm.taviachRequested===false ? "1px solid var(--gold)" : "1px solid var(--border-white)",
                              opacity: taviachBusy?0.6:1,
                            }}>Үгүй</button>
                        </div>
                      </>
                    );
                  })()}
                  {hForm.taviachRequested===true && hForm.taviachNum>0 && (
                    <div style={{marginTop:"10px",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(39,174,96,.12)",border:"1px solid rgba(39,174,96,.3)",borderRadius:"10px",padding:"10px 14px"}}>
                      <span style={{fontSize:"15px",color:"#2ecc71",fontWeight:700}}>🏁 Таны тавиачийн дугаар</span>
                      <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"23px",fontWeight:700,color:"#2ecc71"}}>#{hForm.taviachNum}</span>
                    </div>
                  )}
                  {hFormErr.taviachRequested&&<p className="err-msg">⚠ {hFormErr.taviachRequested}</p>}
                </div>
              </div>

              {/* 10. Холбоо барих утасны дугаар */}
              <div className="fcard">
                <h3>📞 Холбоо барих утасны дугаар *</h3>
                <label>Утасны дугаар *</label>
                <input type="text" inputMode="numeric" placeholder="95053650" maxLength={8}
                  value={hForm.phone||""}
                  onChange={e=>setField("phone",e.target.value.replace(/\D/g,"").slice(0,8))}
                  style={{fontSize:"21px",letterSpacing:"2px"}}
                />
                {hFormErr.phone&&<p className="err-msg">⚠ {hFormErr.phone}</p>}
              </div>

              <button className="btn-gold" onClick={submitRegistration} disabled={isRegistering}
                style={{opacity:isRegistering?0.7:1,cursor:isRegistering?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"8px"}}>
                {isRegistering ? (
                  <>
                    <span style={{display:"inline-block",width:"14px",height:"14px",border:"2px solid rgba(10,26,94,.3)",borderTopColor:"#0a1a5e",borderRadius:"50%",animation:"spin .7s linear infinite"}}/>
                    Бүртгэж байна...
                  </>
                ) : "Бүртгүүлэх ✓"}
              </button>
            </div>
          )}

          {/* ══ SUCCESS ══ */}
          {screen==="success" && lastHorse && (
            <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#0a1a5e 0%,#060e3a 60%,#030820 100%)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"20px 16px 40px"}}>

              <div id="success-card" style={{
                maxWidth:"400px",width:"100%",
                background:"linear-gradient(160deg,#0a1a5e 0%,#0d1c6e 100%)",
                border:"2px solid #e8c060",borderRadius:"24px",
                padding:"0 0 20px",overflow:"hidden",
                fontFamily:"Arial,sans-serif",color:"#fff",
                boxShadow:"0 8px 40px rgba(0,0,0,.5)"
              }}>
                <div style={{background:"linear-gradient(135deg,#b8922a,#e8c060)",padding:"16px 20px",textAlign:"center"}}>
                  <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"21px",color:"#0a1a5e",fontWeight:700}}>
                    ТАНЫ МОРЬД ДУГААР ОЛГОГДСОН ✓
                  </div>
                </div>

                <div style={{padding:"14px 20px 0",textAlign:"center"}}>
                  <div style={{fontSize:"14px",color:"rgba(255,255,255,.5)",marginBottom:"2px"}}>ЭЗЭН</div>
                  <div style={{fontSize:"18px",fontWeight:700,color:"#fff"}}>{user?.name}</div>
                </div>

                <div style={{padding:"12px 16px 0"}}>
                  <div style={{
                    background:"rgba(255,255,255,.07)",
                    border:"1px solid rgba(232,192,96,.35)",
                    borderRadius:"16px",padding:"14px 16px",
                    marginBottom:"10px"
                  }}>
                    <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                      <div style={{
                        width:"72px",height:"72px",borderRadius:"50%",flexShrink:0,
                        background:"linear-gradient(135deg,#b8922a,#e8c060)",
                        display:"flex",flexDirection:"column",
                        alignItems:"center",justifyContent:"center",
                        boxShadow:"0 0 20px rgba(232,192,96,.4)"
                      }}>
                        <span style={{fontFamily:"'Poppins',sans-serif",fontSize:lastHorse.number>99?"23px":"30px",fontWeight:700,color:"#0a1a5e",lineHeight:1}}>{lastHorse.number}</span>
                        <span style={{fontSize:"9px",color:"#0a1a5e",fontWeight:700,letterSpacing:"1px",marginTop:"2px"}}>ДУГААР</span>
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:"18px",marginBottom:"4px"}}>{lastHorse.ownerInfo}</div>
                        {lastHorse.taviachNum>0 && (
                          <div style={{marginTop:"6px",padding:"6px 10px",background:"rgba(39,174,96,.12)",border:"1px solid rgba(39,174,96,.3)",borderRadius:"8px",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                            <span style={{fontSize:"14px",color:"#2ecc71",fontWeight:700}}>🏁 Тавиачийн дугаар</span>
                            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"23px",fontWeight:700,color:"#2ecc71"}}>#{lastHorse.taviachNum}</span>
                          </div>
                        )}
                        <div style={{display:"inline-block",background:"rgba(232,192,96,.15)",border:"1px solid rgba(232,192,96,.3)",borderRadius:"6px",padding:"2px 8px",fontSize:"13px",color:"#f5d882",marginBottom:"6px",marginTop:"6px"}}>{lastHorse.ageGroupName}</div>
                        <div style={{fontSize:"14px",color:"rgba(255,255,255,.6)",lineHeight:1.6}}>
                          Уяач: {lastHorse.uyaachInfo||"—"}<br/>
                          Уралдаанч: {lastHorse.riderInfo}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{padding:"12px 16px 0"}}>
                  <div style={{
                    background:"rgba(255,255,255,.05)",
                    border:"1px solid rgba(232,192,96,.25)",
                    borderRadius:"14px",padding:"6px 16px",
                    marginBottom:"10px",fontSize:"12.5px",color:"rgba(255,255,255,.85)"
                  }}>
                    {[
                      ["Насны ангилал", lastHorse.ageGroupName],
                      ["Уяачийн цол, овог нэр", lastHorse.uyaachInfo||"—"],
                      ["Уяачийн харъяалал", lastHorse.uyaachRegion||"—"],
                      ["Морины эзний цол, овог нэр", lastHorse.ownerInfo||"—"],
                      ["Морины эзний харъяалал", lastHorse.ownerRegion||"—"],
                      ["Морины зүс, тамга", lastHorse.horseInfo||"—"],
                      ["Уралдаанч хүүхдийн овог, нэр", lastHorse.riderInfo||"—"],
                      ["Уралдаанч хүүхдийн нас, хүйс", lastHorse.riderDetails||"—"],
                      ["Даатгалын нэр, дугаар", lastHorse.insuranceInfo||"—"],
                      ["Холбоо барих утас", lastHorse.phone||"—"],
                    ].map(([l,v])=>(
                      <div key={l} style={{display:"flex",justifyContent:"space-between",gap:"10px",padding:"7px 0",borderBottom:"1px solid rgba(255,255,255,.08)"}}>
                        <span style={{color:"rgba(255,255,255,.5)",flexShrink:0}}>{l}</span>
                        <span style={{textAlign:"right",fontWeight:600}}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div style={{maxWidth:"400px",width:"100%",marginTop:"16px",display:"flex",flexDirection:"column",gap:"10px"}}>
                <div style={{fontSize:"15px",color:"var(--gold)",fontWeight:700,textAlign:"center",marginTop:"6px"}}>
                  Та өөр морь бүртгүүлэх үү, эсвэл бүртгэлээ дуусгаж төлбөр төлөх үү?
                </div>
                <button style={{
                  width:"100%",background:"transparent",
                  border:"1px solid rgba(255,255,255,.2)",borderRadius:"14px",padding:"13px",
                  color:"rgba(255,255,255,.6)",fontFamily:"'Poppins',sans-serif",
                  fontSize:"16px",fontWeight:600,cursor:"pointer"
                }} onClick={()=>goNav("dashboard","dashboard")}>
                  Өөр морь бүртгүүлэх →
                </button>
                <button style={{
                  width:"100%",background:"linear-gradient(135deg,var(--gold3),var(--gold))",
                  border:"none",borderRadius:"14px",padding:"14px",
                  color:"var(--navy2)",fontFamily:"'Poppins',sans-serif",
                  fontSize:"16px",fontWeight:700,cursor:"pointer"
                }} onClick={async()=>{
                  await refreshMyHorses(user?.phone);
                  goNav("payment","payment");
                }}>
                  ✓ Бүртгэлээ дуусгаж, төлбөр төлөх →
                </button>
              </div>
            </div>
          )}

          {/* ══ PAYMENT ══ */}
          {screen==="payment" && role==="user" && (
            <div className="page-sm">
              <button className="back-btn" onClick={()=>goNav("dashboard","dashboard")}>← Нүүр хуудас руу</button>

              <div className="banner" style={{marginBottom:"18px"}}>
                <h2>💳 Төлбөрийн мэдээлэл</h2>
                <p>Таны бүртгүүлсэн бүх морины мэдээлэл доор харагдаж байна. Дансаар шилжүүлгээ хийсний дараа зохион байгуулагч баталгаажуулах хүртэл түр хүлээнэ үү.</p>
              </div>

              <div className="sec-title">Миний бүртгүүлсэн морьд ({myHorses.length})</div>
              {myHorses.length===0
                ? <div className="empty-state"><div className="big">📋</div><div>Одоохондоо бүртгэлтэй морь байхгүй байна</div></div>
                : myHorses.map(h=>(
                  <div key={h.id} className="horse-item" style={{cursor:"default"}}>
                    <div className="horse-num">{h.number}</div>
                    <div><div className="horse-name">{h.ownerInfo}</div><div className="horse-meta">{h.ageGroupName} · Уяач: {h.uyaachInfo||"—"}</div></div>
                    {h.paid
                      ? <span className="status-paid">✓ Төлөгдсөн</span>
                      : <span style={{marginLeft:"auto",background:"rgba(232,192,96,.15)",border:"1px solid rgba(232,192,96,.35)",borderRadius:"20px",padding:"3px 10px",fontSize:"13px",color:"var(--gold)",fontWeight:700,whiteSpace:"nowrap",flexShrink:0}}>Хүлээгдэж буй</span>
                    }
                  </div>
                ))
              }

              {(() => {
                const unpaid = myHorses.filter(h=>!h.paid);
                const unpaidTaviach = unpaid.filter(h=>h.taviachNum>0);
                const horseFeeTotal = unpaid.length * FEE_PER_HORSE;
                const taviachFeeTotal = unpaidTaviach.length * FEE_PER_TAVIACH;
                const totalDue = horseFeeTotal + taviachFeeTotal;
                const utgaParts = [];
                if(unpaid.length>0) utgaParts.push(unpaid.map(h=>h.number).join(", "));
                if(unpaidTaviach.length>0) utgaParts.push(`Тавиач: ${unpaidTaviach.map(h=>h.taviachNum).join(", ")}`);
                const utga = utgaParts.join(" · ");
                return (
                  <>
                    <div className="banner" style={{marginTop:"22px",marginBottom:"18px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px"}}>
                        <div>
                          <div style={{fontSize:"14px",color:"var(--white-dim)"}}>Төлбөр төлөх морины тоо</div>
                          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"25px",color:"var(--gold)",fontWeight:700}}>{unpaid.length} морь</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontSize:"14px",color:"var(--white-dim)"}}>Нийт төлөх дүн</div>
                          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"25px",color:"var(--gold)",fontWeight:700}}>{totalDue.toLocaleString("mn-MN")}₮</div>
                        </div>
                      </div>
                      <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(255,255,255,.1)",fontSize:"13px",color:"var(--white-dim)",display:"flex",flexDirection:"column",gap:"4px"}}>
                        <div style={{display:"flex",justifyContent:"space-between"}}>
                          <span>Морины хураамж: {unpaid.length} × {FEE_PER_HORSE.toLocaleString("mn-MN")}₮</span>
                          <span style={{color:"#fff",fontWeight:600}}>{horseFeeTotal.toLocaleString("mn-MN")}₮</span>
                        </div>
                        {unpaidTaviach.length>0 && (
                          <div style={{display:"flex",justifyContent:"space-between"}}>
                            <span>Тавиачийн хураамж: {unpaidTaviach.length} × {FEE_PER_TAVIACH.toLocaleString("mn-MN")}₮</span>
                            <span style={{color:"#fff",fontWeight:600}}>{taviachFeeTotal.toLocaleString("mn-MN")}₮</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {totalDue>0 ? (
                      <div className="fcard">
                        <h3>🏦 Дансны мэдээлэл</h3>
                        {[
                          ["Банк", BANK_NAME],
                          ["Дансны дугаар", BANK_ACCOUNT_NUMBER],
                          ["Данс эзэмшигч", BANK_ACCOUNT_HOLDER],
                          ["Гүйлгээний утга", utga],
                        ].map(([label,val])=>(
                          <div key={label} style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"10px",background:"rgba(255,255,255,.05)",border:"1px solid var(--border-white)",borderRadius:"10px",padding:"12px 14px",marginBottom:"10px"}}>
                            <div>
                              <div style={{fontSize:"12px",color:"var(--white-dim)"}}>{label}</div>
                              <div style={{fontSize:"16px",fontWeight:700,color:"#fff"}}>{val}</div>
                            </div>
                            <button onClick={()=>copyText(val,label)}
                              style={{background:"var(--gold-bg)",border:"1px solid var(--border-gold)",borderRadius:"8px",padding:"7px 14px",color:"var(--gold)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"13px",cursor:"pointer",flexShrink:0}}>
                              Хуулах
                            </button>
                          </div>
                        ))}
                        <div style={{marginTop:"10px",padding:"12px 14px",background:"rgba(232,192,96,.08)",border:"1px solid var(--border-gold)",borderRadius:"10px",fontSize:"13px",color:"var(--white-dim)",lineHeight:1.6}}>
                          ⚠️ Гүйлгээний утгад заавал <strong style={{color:"var(--gold)"}}>дээрх дугаараа</strong> бичнэ үү — зохион байгуулагч танай төлбөрийг үүгээр танина.
                        </div>

                        <div style={{marginTop:"14px",display:"flex",alignItems:"center",gap:"14px",background:"rgba(15,33,112,.5)",border:"1px solid var(--border-gold)",borderRadius:"12px",padding:"16px"}}>
                          <div style={{position:"relative",width:"36px",height:"36px",flexShrink:0}}>
                            <span style={{position:"absolute",inset:0,borderRadius:"50%",background:"rgba(232,192,96,.35)",animation:"waitPulse 1.6s ease-out infinite"}}/>
                            <span style={{position:"absolute",inset:"8px",borderRadius:"50%",background:"var(--gold)"}}/>
                          </div>
                          <div>
                            <div style={{fontSize:"15px",fontWeight:700,color:"var(--gold)",marginBottom:"3px"}}>Таны төлбөрийг хүлээж байна...</div>
                            <div style={{fontSize:"13px",color:"var(--white-dim)",lineHeight:1.6}}>
                              Шилжүүлгээ хийсний дараа зохион байгуулагч баталгаажуулна. Баталгаажсаны дараа танд Баталгаажуулах карт гарч ирнэ — үүнийг хадгалж, дугаартай хантаазаа авахдаа үзүүлнэ үү.
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="fcard" style={{textAlign:"center"}}>
                        <div style={{fontSize:"16px",color:"#2ecc71",fontWeight:700}}>✓ Нэмж төлөх зүйл алга байна</div>
                      </div>
                    )}
                  </>
                );
              })()}

              <button className="btn-gold" onClick={()=>goNav("dashboard","dashboard")}>
                Нүүр хуудас руу →
              </button>
            </div>
          )}

          {/* ══ EXPLAINER ══ */}
          {screen==="explainer" && (
            <div className="page">
              <div style={{background:"rgba(15,33,112,.5)",border:"1px solid var(--border-gold)",borderRadius:"14px",padding:"16px 20px",marginBottom:"18px",display:"flex",alignItems:"center",gap:"12px"}}>
                <div className="live-dot"/>
                <div>
                  <div style={{fontFamily:"'Poppins',sans-serif",color:"var(--gold)",fontSize:"17px",marginBottom:"2px"}}>🎙 Тайлбарлагчийн Самбар</div>
                  <div style={{fontSize:"14px",color:"var(--white-dim)"}}>Бүртгэлтэй морьдын мэдээлэл · Дугаар · Насны ангилал</div>
                </div>
                <div style={{marginLeft:"auto",fontFamily:"'Poppins',sans-serif",fontSize:"23px",color:"var(--gold)"}}>{flatHorses.length}</div>
              </div>

              <div style={{position:"relative",marginBottom:"14px"}}>
                <span style={{position:"absolute",left:"14px",top:"50%",transform:"translateY(-50%)",fontSize:"18px",pointerEvents:"none"}}>🔍</span>
                <input
                  type="text"
                  placeholder="Дугаар, морины нэр, уяач, уралдаанч хайх..."
                  value={expSearch}
                  onChange={e=>setExpSearch(e.target.value)}
                  style={{paddingLeft:"40px",background:"rgba(15,33,112,.6)",border:"1px solid var(--border-gold)"}}
                />
                {expSearch && (
                  <button onClick={()=>setExpSearch("")}
                    style={{position:"absolute",right:"12px",top:"50%",transform:"translateY(-50%)",background:"none",border:"none",color:"var(--white-dim)",fontSize:"21px",cursor:"pointer",lineHeight:1}}>×</button>
                )}
              </div>

              <div className="filter-bar">
                <button className={`chip ${expFilter==="all"?"active":""}`} onClick={()=>setExpFilter("all")}>Бүгд ({flatHorses.length})</button>
                {AGE_GROUPS.filter(ag=>flatHorses.filter(h=>h.ageGroupId===ag.id).length>0).map(ag=>(
                  <button key={ag.id} className={`chip ${expFilter===ag.id?"active":""}`} onClick={()=>setExpFilter(ag.id)}>
                    {ag.name} ({flatHorses.filter(h=>h.ageGroupId===ag.id).length})
                  </button>
                ))}
              </div>

              {flatHorses.length===0
                ? <div className="empty-state"><div className="big">📋</div><div>Одоохондоо бүртгэлтэй морь байхгүй байна</div></div>
                : <div className="horse-grid">
                    {flatHorses
                      .filter(h=>{
                        const ageOk = expFilter==="all" || h.ageGroupId===expFilter;
                        if (!expSearch.trim()) return ageOk;
                        const q = expSearch.trim().toLowerCase();
                        return ageOk && (
                          String(h.number).includes(q) ||
                          (h.uyaachInfo||"").toLowerCase().includes(q) ||
                          (h.riderInfo||"").toLowerCase().includes(q) ||
                          (h.ownerInfo||"").toLowerCase().includes(q) ||
                          (h.ageGroupName||"").toLowerCase().includes(q)
                        );
                      })
                      .sort((a,b)=>a.number-b.number)
                      .map(h=>(
                        <div key={h.id} className="exp-card" onClick={()=>setExpHorse(h)}>
                          <div className="exp-img">
                            <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"32px",fontWeight:700,color:"var(--gold)"}}>#{h.number}</span>
                          </div>
                          <div className="exp-body">
                            <div className="exp-name">{h.ownerInfo}</div>
                            <div className="exp-meta">
                              <span className="tag">{h.ageGroupName}</span><br/>
                              Уяач: {h.uyaachInfo||"—"} · Уралдаанч: {h.riderInfo}
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
              }
            </div>
          )}

          {/* ══ ADMIN ══ */}
          {screen==="admin" && role==="admin" && (
            <div className="page">
              <div className="banner" style={{marginBottom:"18px"}}>
                <h2>🔐 Админы Самбар</h2>
                <p>Бүх бүртгэлийг энд харах, экспортлох, устгах боломжтой. Дугаар шууд баталгаажина; төлбөрийг банкны шилжүүлгээр шалгаад энд баталгаажуулна.</p>
                <div className="stats-row">
                  <div className="stat-card"><div className="stat-val">{flatHorses.length}</div><div className="stat-label">Нийт морь</div></div>
                  <div className="stat-card"><div className="stat-val">{Math.max(0,MAX_HORSE_NUMBER-totalCount)}</div><div className="stat-label">Үлдсэн дугаар</div></div>
                  <div className="stat-card"><div className="stat-val">{flatHorses.filter(h=>!h.paid).length}</div><div className="stat-label">Хүлээгдэж буй төлбөр</div></div>
                  <div className="stat-card"><div className="stat-val">{AGE_GROUPS.length}</div><div className="stat-label">Насны ангилал</div></div>
                </div>
              </div>

              {soldOut && (
                <div style={{background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",borderRadius:"12px",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"12px"}}>
                  <span style={{fontSize:"25px"}}>🔒</span>
                  <div style={{fontWeight:700,color:"#ff8a80",fontSize:"16px"}}>Бүх дугаар дууссан — бүртгэл хаагдсан байна</div>
                </div>
              )}

              <div className="admin-tabs">
                {[["overview","📊 Ерөнхий"],["horses"," Бүртгэлүүд"],["payments","💳 Төлбөр"],["byage","📋 Насны ангилал"],["export","📥 Экспорт"],["settings","⚙️ Тохиргоо"]].map(([k,l])=>(
                  <button key={k} className={`adm-tab ${adminTab===k?"active":""}`} onClick={()=>setAdminTab(k)}>{l}</button>
                ))}
              </div>

              {adminTab==="overview" && (
                <>
                  <div className="sec-title">Насны ангиллаар</div>
                  {AGE_GROUPS.map(ag=>{
                    const cnt=flatHorses.filter(h=>h.ageGroupId===ag.id).length;
                    return (
                      <div key={ag.id} className="adm-card" style={{display:"flex",alignItems:"center",gap:"14px",marginBottom:"8px"}}>
                        <span style={{fontFamily:"'Poppins',sans-serif",fontSize:"23px",color:"var(--gold)",minWidth:"28px"}}>#{ag.id}</span>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:"16px",color:"var(--gold)"}}>{ag.name}</div>
                        </div>
                        <div style={{textAlign:"right"}}>
                          <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"21px",color:"var(--gold)"}}>{cnt}</div>
                          <div style={{fontSize:"13px",color:"var(--white-dim)"}}>морь</div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}

              {adminTab==="horses" && (
                <>
                  <div className="sec-title">Бүх Бүртгэлүүд ({flatHorses.length})</div>
                  {flatHorses.length===0
                    ? <div className="empty-state"><div className="big">📋</div><div>Бүртгэл байхгүй байна</div></div>
                    : [...flatHorses].sort((a,b)=>a.number-b.number).map(h=>(
                      <div key={h.id} className="horse-item" onClick={()=>setAdminHorse(h)}>
                        <div className="horse-num">{h.number}</div>
                        <div>
                          <div className="horse-name">{h.ownerInfo} <span className="tag">{h.ageGroupName}</span></div>
                          <div className="horse-meta">Уяач: {h.uyaachInfo||"—"} · Уралдаанч: {h.riderInfo}</div>
                        </div>
                        <div style={{display:"flex",gap:"6px",flexDirection:"column",alignItems:"flex-end"}}>
                          {h.paid
                            ? <span style={{color:"#2ecc71",fontSize:"12px",fontWeight:700}}>✓ Төлсөн</span>
                            : <span style={{color:"var(--gold)",fontSize:"12px",fontWeight:700}}>Хүлээгдэж буй</span>
                          }
                          {h.taviachNum>0 && <span style={{color:"#2ecc71",fontSize:"13px",fontWeight:700}}>🏁 #{h.taviachNum}</span>}
                          <button style={{background:"rgba(192,57,43,.2)",border:"1px solid rgba(192,57,43,.4)",borderRadius:"8px",padding:"4px 8px",color:"#ff8a80",fontSize:"13px",cursor:"pointer"}} onClick={e=>{e.stopPropagation();if(window.confirm("Устгах уу?")){adminDelete(h);}}}>🗑</button>
                        </div>
                      </div>
                    ))
                  }
                </>
              )}

              {adminTab==="payments" && (() => {
                const unpaid = flatHorses.filter(h=>!h.paid);
                const byPhone = {};
                unpaid.forEach(h=>{
                  const key = h.ownerPhone || "—";
                  if(!byPhone[key]) byPhone[key]=[];
                  byPhone[key].push(h);
                });
                const phones = Object.keys(byPhone);
                return (
                  <>
                    <div className="sec-title">Хүлээгдэж буй төлбөрүүд ({unpaid.length} морь)</div>
                    {phones.length===0
                      ? <div className="empty-state"><div className="big">✓</div><div>Бүх бүртгэлийн төлбөр баталгаажсан байна</div></div>
                      : phones.map(phone=>{
                        const horses = byPhone[phone];
                        const taviachHorses = horses.filter(h=>h.taviachNum>0);
                        const total = horses.length * FEE_PER_HORSE + taviachHorses.length * FEE_PER_TAVIACH;
                        const nums = horses.map(h=>h.number).join(", ");
                        return (
                          <div key={phone} className="adm-card" style={{marginBottom:"12px"}}>
                            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px",marginBottom:"10px",paddingBottom:"10px",borderBottom:"1px solid var(--border-white)"}}>
                              <div>
                                <div style={{fontWeight:700,fontSize:"16px"}}>{horses[0]?.ownerInfo}</div>
                                <div style={{fontSize:"13px",color:"var(--white-dim)"}}>Утас: {phone} · Дугаарууд: {nums}</div>
                              </div>
                              <div style={{textAlign:"right"}}>
                                <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"21px",color:"var(--gold)"}}>{total.toLocaleString("mn-MN")}₮</div>
                                <div style={{fontSize:"12px",color:"var(--white-dim)"}}>{horses.length} морь{taviachHorses.length>0?` + ${taviachHorses.length} тавиач`:""}</div>
                              </div>
                            </div>
                            {horses.map(h=>(
                              <div key={h.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"6px 0",fontSize:"14px"}}>
                                <span>#{h.number} · {h.ageGroupName}{h.taviachNum>0?` · 🏁 Тавиач #${h.taviachNum}`:""}</span>
                                <button style={{background:"rgba(39,174,96,.15)",border:"1px solid rgba(39,174,96,.4)",borderRadius:"8px",padding:"5px 12px",color:"#2ecc71",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"12px",cursor:"pointer"}}
                                  onClick={()=>adminConfirmPayment(h)}>✓ Баталгаажуулах</button>
                              </div>
                            ))}
                            <button style={{width:"100%",marginTop:"10px",background:"linear-gradient(135deg,var(--gold3),var(--gold))",border:"none",borderRadius:"10px",padding:"11px",color:"var(--navy2)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"14px",cursor:"pointer"}}
                              onClick={()=>adminConfirmPaymentsForPhone(phone, horses.map(h=>h.id))}>
                              ✓ Бүгдийг баталгаажуулах ({horses.length})
                            </button>
                          </div>
                        );
                      })
                    }
                  </>
                );
              })()}

              {adminTab==="byage" && (
                <>
                  {AGE_GROUPS.map(ag=>{
                    const horses=flatHorses.filter(h=>h.ageGroupId===ag.id);
                    if(horses.length===0)return null;
                    return (
                      <div key={ag.id} style={{marginBottom:"20px"}}>
                        <div className="sec-title">{ag.name}</div>
                        {horses.map(h=>(
                          <div key={h.id} className="horse-item" onClick={()=>setAdminHorse(h)}>
                            <div className="horse-num">{h.number}</div>
                            <div><div className="horse-name">{h.ownerInfo}</div><div className="horse-meta">Уяач: {h.uyaachInfo||"—"} · Уралдаанч: {h.riderInfo}</div></div>
                            <div style={{display:"flex",flexDirection:"column",gap:"4px",alignItems:"flex-end",marginLeft:"auto",minWidth:"100px"}}>
                              {h.paid
                                ? <span style={{fontSize:"12px",color:"#2ecc71",fontWeight:700}}>✓ Төлсөн</span>
                                : <span style={{fontSize:"12px",color:"var(--gold)",fontWeight:700}}>Хүлээгдэж буй</span>
                              }
                              {h.taviachNum>0 && <span style={{fontSize:"13px",color:"#2ecc71",fontWeight:700}}>🏁 #{h.taviachNum}</span>}
                              <button style={{background:"rgba(192,57,43,.2)",border:"1px solid rgba(192,57,43,.4)",borderRadius:"8px",padding:"5px 10px",color:"#ff8a80",fontFamily:"'Poppins',sans-serif",fontSize:"13px",fontWeight:600,cursor:"pointer",width:"100%"}}
                                onClick={e=>{e.stopPropagation();if(window.confirm("Устгах уу?")){adminDelete(h);}}}>🗑 Устгах</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                  {flatHorses.length===0&&<div className="empty-state"><div className="big">📋</div><div>Бүртгэл байхгүй байна</div></div>}
                </>
              )}

              {adminTab==="export" && (
                <div>
                  <div className="sec-title">CSV / Excel экспорт</div>
                  <div className="adm-card" style={{marginBottom:"12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:"17px",marginBottom:"4px"}}>📥 Бүх бүртгэл</div>
                        <div style={{fontSize:"15px",color:"var(--white-dim)"}}>Нийт {flatHorses.length} морь · Бүх насны ангилал</div>
                      </div>
                      <button onClick={exportCSV}
                        style={{background:"linear-gradient(135deg,var(--gold3),var(--gold))",border:"none",borderRadius:"10px",padding:"11px 22px",color:"var(--navy2)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"16px",cursor:"pointer",display:"flex",alignItems:"center",gap:"8px"}}>
                        📥 CSV татаж авах
                      </button>
                    </div>
                  </div>

                  <div className="sec-title">Насны ангиллаар тусад нь</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    {AGE_GROUPS.map(ag=>{
                      const cnt = flatHorses.filter(h=>h.ageGroupId===ag.id).length;
                      return (
                        <div key={ag.id} className="adm-card" style={{padding:"12px 16px"}}>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px"}}>
                            <div>
                              <span style={{fontWeight:700,fontSize:"16px"}}>{ag.name}</span>
                              <span style={{fontSize:"14px",color:"var(--white-dim)",marginLeft:"10px"}}>{cnt} морь</span>
                            </div>
                            {cnt > 0 ? (
                              <button onClick={()=>exportByAge(ag.id)}
                                style={{background:"var(--gold-bg)",border:"1px solid var(--border-gold)",borderRadius:"8px",padding:"7px 16px",color:"var(--gold)",fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"14px",cursor:"pointer"}}>
                                📥 CSV
                              </button>
                            ) : (
                              <span style={{fontSize:"14px",color:"rgba(255,255,255,.3)"}}>Бүртгэл байхгүй</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{marginTop:"16px",padding:"12px 14px",background:"rgba(232,192,96,.06)",border:"1px solid var(--border-gold)",borderRadius:"10px",fontSize:"14px",color:"var(--white-dim)",lineHeight:1.6}}>
                    💡 CSV файлыг Excel-д нээхдээ: Excel → Data → From Text/CSV → UTF-8 encoding сонгоно уу. Эсвэл Google Sheets-д шууд upload хийж болно.
                  </div>
                </div>
              )}

              {adminTab==="settings" && (
                <div className="adm-card">
                  <h3 style={{fontFamily:"'Poppins',sans-serif",color:"var(--gold)",marginBottom:"14px",paddingBottom:"10px",borderBottom:"1px solid var(--border-gold)"}}>Системийн тохиргоо</h3>
                  {[
                    ["Тайлбарлагчийн нэвтрэх код",EXPLAINER_CODE],
                    ["Баталгаажуулах систем","Дугаар автомат — төлбөрийг админ гараар баталгаажуулна"],
                    ["1 морины хураамж",FEE_PER_HORSE.toLocaleString("mn-MN")+"₮"],
                    ["Нийт боломжит дугаар","1 – "+MAX_HORSE_NUMBER],
                    ["Тавиачийн дугаарын хязгаар","1 – "+MAX_TAVIACH_PER_AGE+" (насны ангилал тус бүрд тусдаа)"],
                    ["Системийн хувилбар","Дундговь аймгийн наадам v1.0"],
                  ].map(([l,v])=>(
                    <div key={l} className="adm-row">
                      <span className="adm-label">{l}</span>
                      <span style={{fontFamily:"'Poppins',sans-serif",color:"var(--gold)",fontSize:"16px"}}>{v}</span>
                    </div>
                  ))}

                  <div style={{marginTop:"18px",paddingTop:"14px",borderTop:"1px solid var(--border-gold)"}}>
                    <div style={{fontWeight:700,fontSize:"15px",color:"var(--gold)",marginBottom:"10px"}}>Бүртгэлийн хугацаа</div>
                    <input
                      type="datetime-local"
                      value={toLocalDatetimeInputValue(regDeadline)}
                      onChange={e=>{
                        const v = e.target.value;
                        if(v){
                          const iso = new Date(v).toISOString();
                          setRegDeadline(iso);
                          localStorage.setItem("naadam_reg_deadline", iso);
                          saveDeadline(iso).catch(err=>console.error(err));
                          showToast("Хугацаа хадгалагдлаа ✓");
                        }
                      }}
                      style={{marginBottom:"10px"}}
                    />
                    {regDeadline && (
                      <button className="btn-red" onClick={async()=>{
                        setRegDeadline(null);
                        localStorage.removeItem("naadam_reg_deadline");
                        try { await clearDeadline(); } catch(e){}
                        showToast("Хугацаа арилгагдлаа");
                      }}>Хугацааг арилгах</button>
                    )}
                  </div>

                  <div style={{marginTop:"18px",paddingTop:"14px",borderTop:"1px solid var(--border-gold)"}}>
                    <div style={{fontWeight:700,fontSize:"15px",color:"var(--gold)",marginBottom:"6px"}}>Насны ангилал тус бүрийн хугацаа</div>
                    <div style={{fontSize:"14px",color:"var(--white-dim)",marginBottom:"12px",lineHeight:1.6}}>
                      Дээрх ерөнхий хугацаанаас үл хамааран тодорхой насны ангиллыг тусад нь хаах боломжтой (жишээ нь бусад нээлттэй байхад зөвхөн Шүдлэнг хаах).
                    </div>
                    {AGE_GROUPS.map(ag=>{
                      const dl = ageGroupDeadlines[String(ag.id)];
                      const closedNow = dl && new Date() > new Date(dl);
                      return (
                        <div key={ag.id} style={{display:"flex",alignItems:"center",gap:"10px",flexWrap:"wrap",padding:"10px 0",borderBottom:"1px solid var(--border-white)"}}>
                          <div style={{minWidth:"110px",fontWeight:700,fontSize:"14px",color: closedNow ? "#ff8a80" : "#fff"}}>
                            {closedNow && "🔒 "}{ag.name}
                          </div>
                          <input
                            type="datetime-local"
                            value={toLocalDatetimeInputValue(dl)}
                            onChange={async e=>{
                              const v = e.target.value;
                              if(v){
                                const iso = new Date(v).toISOString();
                                try {
                                  await saveAgeGroupDeadline(ag.id, iso);
                                  setAgeGroupDeadlines(prev=>({...prev, [String(ag.id)]: iso}));
                                  showToast(`${ag.name} — хугацаа хадгалагдлаа ✓`);
                                } catch(err){ showToast("Алдаа: "+err.message); }
                              }
                            }}
                            style={{flex:"1 1 200px",minWidth:"180px"}}
                          />
                          {dl && (
                            <button className="btn-red" style={{padding:"9px 12px",fontSize:"13px"}} onClick={async()=>{
                              try {
                                await clearAgeGroupDeadline(ag.id);
                                setAgeGroupDeadlines(prev=>{ const n={...prev}; delete n[String(ag.id)]; return n; });
                                showToast(`${ag.name} — хугацаа арилгагдлаа`);
                              } catch(err){ showToast("Алдаа: "+err.message); }
                            }}>Арилгах</button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{marginTop:"18px",paddingTop:"14px",borderTop:"1px solid var(--border-gold)"}}>
                    <div style={{fontWeight:700,fontSize:"15px",color:"var(--gold)",marginBottom:"6px"}}>Тавиачийн дугаарын сан засах</div>
                    <div style={{fontSize:"14px",color:"var(--white-dim)",marginBottom:"10px",lineHeight:1.6}}>
                      Хэн нэгэн "Тийм" дараад дугаар авсны дараа бүртгэлээ дуусгалгүй апп-аа хаавал, тэр дугаар "алга болсон" мэт харагдаж болно (жишээ нь #1 алгасаж #2-с эхэлнэ). Энэ товчийг дарвал бодит бүртгэлтэй тааруулж, дугааруудыг зассан хэвээр нь үргэлжлүүлнэ.
                    </div>
                    <button className="btn-outline" onClick={async()=>{
                      try {
                        const count = await reconcileTaviachSequence();
                        await refreshTaviachIssued();
                        showToast(`Тавиачийн сан засагдлаа — ${count} насны ангилал шинэчлэгдлээ ✓`);
                      } catch(e){ showToast("Алдаа: "+e.message); }
                    }}>🔧 Тавиачийн санг засах</button>
                  </div>

                  <div style={{marginTop:"18px",paddingTop:"14px",borderTop:"1px solid var(--border-gold)"}}>
                    <div style={{fontWeight:700,fontSize:"15px",color:"var(--gold)",marginBottom:"6px"}}>Хасагдсан дугаарууд</div>
                    <div style={{fontSize:"14px",color:"var(--white-dim)",marginBottom:"10px",lineHeight:1.6}}>
                      Доор жагсаасан дугааруудыг ямар ч хэрэглэгчид автоматаар олгохгүй (жишээ нь тусгай зориулалттай дугаарууд). Таслалаар тусгаарлан бичнэ үү.
                    </div>
                    <textarea
                      value={blockedNumbersInput}
                      onChange={e=>setBlockedNumbersInput(e.target.value)}
                      placeholder="Жишээ: 9, 15, 18, 19, 123, 125"
                      style={{minHeight:"56px",marginBottom:"10px"}}
                    />
                    <button className="btn-gold" style={{marginTop:0}} onClick={async()=>{
                      const numbers = [...new Set(
                        blockedNumbersInput.split(",").map(s=>parseInt(s.trim(),10)).filter(n=>!isNaN(n) && n>0)
                      )].sort((a,b)=>a-b);
                      try {
                        await setBlockedHorseNumbers(numbers);
                        setBlockedNumbersState(numbers);
                        setBlockedNumbersInput(numbers.join(", "));
                        showToast(`${numbers.length} дугаар хасагдсан жагсаалтад орлоо ✓`);
                      } catch(e){ showToast("Алдаа: "+e.message); }
                    }}>Хадгалах</button>
                    {blockedNumbers.length>0 && (
                      <div style={{marginTop:"10px",fontSize:"13px",color:"var(--white-dim)"}}>
                        Одоогийн хасагдсан дугаарууд: <strong style={{color:"var(--gold)"}}>{blockedNumbers.join(", ")}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

        </main>

        {/* ── EXPLAINER HORSE MODAL ── */}
        {expHorse && (
          <div className="overlay" onClick={()=>setExpHorse(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">
                <span> #{expHorse.number} · {expHorse.ownerInfo}</span>
                <button className="modal-close" onClick={()=>setExpHorse(null)}>×</button>
              </div>
              {[
                ["Дугаар",expHorse.number],
                ["Насны ангилал",expHorse.ageGroupName],
                ["Уяачийн цол, овог нэр",expHorse.uyaachInfo||"—"],
                ["Уяачийн харъяалал",expHorse.uyaachRegion||"—"],
                ["Морины эзний цол, овог нэр",expHorse.ownerInfo],
                ["Морины эзний харъяалал",expHorse.ownerRegion||"—"],
                ["Морины зүс, тамга",expHorse.horseInfo||"—"],
                ["Тавиачийн дугаар",expHorse.taviachNum>0?`#${expHorse.taviachNum}`:"—"],
                ["Уралдаанч хүүхдийн овог, нэр",expHorse.riderInfo],
                ["Уралдаанч хүүхдийн нас, хүйс",expHorse.riderDetails||"—"],
                ["Даатгалын нэр, дугаар",expHorse.insuranceInfo||"—"],
                ["Холбоо барих утас",expHorse.phone||"—"],
              ].map(([l,v])=>(
                <div key={l} className="detail-row"><span className="detail-lbl">{l}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* ── MY HORSE DETAIL MODAL ── */}
        {myHorseDetail && (
          <div className="overlay" onClick={()=>setMyHorseDetail(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">
                <span> #{myHorseDetail.number} · {myHorseDetail.ownerInfo}</span>
                <button className="modal-close" onClick={()=>setMyHorseDetail(null)}>×</button>
              </div>
              {[
                ["Дугаар",myHorseDetail.number],
                ["Насны ангилал",myHorseDetail.ageGroupName],
                ["Уяачийн цол, овог нэр",myHorseDetail.uyaachInfo||"—"],
                ["Уяачийн харъяалал",myHorseDetail.uyaachRegion||"—"],
                ["Морины эзний цол, овог нэр",myHorseDetail.ownerInfo],
                ["Морины эзний харъяалал",myHorseDetail.ownerRegion||"—"],
                ["Морины зүс, тамга",myHorseDetail.horseInfo||"—"],
                ["Тавиачийн дугаар",myHorseDetail.taviachNum>0?`#${myHorseDetail.taviachNum}`:"—"],
                ["Уралдаанч хүүхдийн овог, нэр",myHorseDetail.riderInfo],
                ["Уралдаанч хүүхдийн нас, хүйс",myHorseDetail.riderDetails||"—"],
                ["Даатгалын нэр, дугаар",myHorseDetail.insuranceInfo||"—"],
                ["Холбоо барих утас",myHorseDetail.phone||"—"],
              ].map(([l,v])=>(
                <div key={l} className="detail-row"><span className="detail-lbl">{l}</span><span>{v}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* ── ADMIN HORSE MODAL ── */}
        {adminHorse && (
          <div className="overlay" onClick={()=>setAdminHorse(null)}>
            <div className="modal" onClick={e=>e.stopPropagation()}>
              <div className="modal-title">
                <span> #{adminHorse.number} · {adminHorse.ownerInfo}</span>
                <button className="modal-close" onClick={()=>setAdminHorse(null)}>×</button>
              </div>

              <div style={{
                background: adminHorse.paid ? "rgba(39,174,96,.12)" : "rgba(232,192,96,.1)",
                border: adminHorse.paid ? "1px solid rgba(39,174,96,.4)" : "1px solid var(--border-gold)",
                borderRadius:"12px", padding:"14px 16px", marginBottom:"16px"
              }}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"8px"}}>
                  <div style={{fontSize:"14px",color:"var(--white-dim)",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>
                    {adminHorse.paid ? "✅ Төлбөр баталгаажсан" : "⏳ Төлбөр хүлээгдэж буй"}
                  </div>
                  <button style={{
                    background: adminHorse.paid ? "rgba(255,255,255,.08)" : "linear-gradient(135deg,var(--gold3),var(--gold))",
                    border: adminHorse.paid ? "1px solid rgba(255,255,255,.15)" : "none",
                    borderRadius:"8px",padding:"7px 14px",
                    color: adminHorse.paid ? "rgba(255,255,255,.5)" : "var(--navy2)",
                    fontFamily:"'Poppins',sans-serif",fontWeight:700,fontSize:"13px",cursor:"pointer"
                  }} onClick={async()=>{
                    const next = !adminHorse.paid;
                    await adminConfirmPaymentToggle(adminHorse, next);
                  }}>
                    {adminHorse.paid ? "Буцаах" : "✓ Баталгаажуулах"}
                  </button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  <div>
                    <div style={{fontSize:"13px",color:"var(--white-dim)"}}>Бүртгэлийн дугаар</div>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"28px",color:"var(--gold)",fontWeight:700}}>{adminHorse.number}</div>
                  </div>
                  <div>
                    <div style={{fontSize:"13px",color:"var(--white-dim)"}}>Тавиачийн дугаар</div>
                    <div style={{fontFamily:"'Poppins',sans-serif",fontSize:"21px",color:adminHorse.taviachNum>0?"#2ecc71":"rgba(255,255,255,.4)",fontWeight:700}}>
                      {adminHorse.taviachNum>0 ? `#${adminHorse.taviachNum}` : "Байхгүй"}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize:"13px",color:"var(--white-dim)"}}>Бүртгүүлсэн акаунтын утас</div>
                    <div style={{fontSize:"16px",fontWeight:700}}>{adminHorse.ownerPhone||"—"}</div>
                  </div>
                  <div>
                    <div style={{fontSize:"13px",color:"var(--white-dim)"}}>Холбоо барих утас</div>
                    <div style={{fontSize:"16px",fontWeight:700}}>{adminHorse.phone||"—"}</div>
                  </div>
                </div>
              </div>

              {[
                ["Насны ангилал",adminHorse.ageGroupName],
                ["Уяачийн цол, овог нэр",adminHorse.uyaachInfo||"—"],
                ["Уяачийн харъяалал",adminHorse.uyaachRegion||"—"],
                ["Морины эзний цол, овог нэр",adminHorse.ownerInfo],
                ["Морины эзний харъяалал",adminHorse.ownerRegion||"—"],
                ["Морины зүс, тамга",adminHorse.horseInfo||"—"],
                ["Уралдаанч хүүхдийн овог, нэр",adminHorse.riderInfo],
                ["Уралдаанч хүүхдийн нас, хүйс",adminHorse.riderDetails||"—"],
                ["Даатгалын нэр, дугаар",adminHorse.insuranceInfo||"—"],
              ].map(([l,v])=>(
                <div key={l} className="detail-row"><span className="detail-lbl">{l}</span><span>{v}</span></div>
              ))}

              <div style={{display:"flex",gap:"8px",marginTop:"16px",flexWrap:"wrap"}}>
                <button className="btn-red" style={{flex:1}} onClick={()=>{
                  if(window.confirm(`#${adminHorse.number} (${adminHorse.ownerInfo}) бүртгэлийг устгах уу?`)){
                    adminDelete(adminHorse);
                    setAdminHorse(null);
                  }
                }}>🗑 Устгах</button>
                <button style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)",borderRadius:"10px",padding:"12px",color:"rgba(255,255,255,.4)",fontFamily:"'Poppins',sans-serif",fontSize:"15px",cursor:"pointer"}} onClick={()=>setAdminHorse(null)}>Хаах</button>
              </div>
            </div>
          </div>
        )}

        {toast && <div className="toast">{toast}</div>}
      </div>
    </>
  );
}

// ── EYE TOGGLE PASSWORD INPUT ───────────────────────────────────────────────
function EyeInput({id, placeholder, style={}}) {
  const [show, setShow] = useState(false);
  return (
    <div className="pass-wrap">
      <input
        id={id}
        type={show ? "text" : "password"}
        placeholder={placeholder}
        style={{letterSpacing: show ? "normal" : "4px", ...style}}
      />
      <button
        type="button"
        className="eye-btn"
        onClick={()=>setShow(s=>!s)}
        tabIndex={-1}
      >
        {show ? "🙈" : "👁"}
      </button>
    </div>
  );
}

// ── PHONE INPUT GRID COMPONENT ──────────────────────────────────────────────
function PhoneGrid({id}){
  const [digits, setDigits] = useState(["","","","","","","",""]);
  const refs = Array.from({length:8},()=>useRef());

  const handleChange=(i,v)=>{
    const d=v.replace(/\D/g,"").slice(0,1);
    const next=[...digits]; next[i]=d; setDigits(next);
    const combined=next.join("");
    const hidden=document.getElementById(id);
    if(hidden) hidden.value=combined;
    if(d && i<7) refs[i+1].current?.focus();
  };

  const handleKey=(i,e)=>{
    if(e.key==="Backspace"&&!digits[i]&&i>0){
      const next=[...digits]; next[i-1]=""; setDigits(next);
      const combined=next.join("");
      const hidden=document.getElementById(id);
      if(hidden) hidden.value=combined;
      refs[i-1].current?.focus();
    }
    if(e.key==="Enter"){
      const btn=e.target.closest("form,div")?.querySelector(".btn-gold");
      btn?.click();
    }
  };

  const handlePaste=(e)=>{
    e.preventDefault();
    const pasted=e.clipboardData.getData("text").replace(/\D/g,"").slice(0,8);
    const next=Array.from({length:8},(_,i)=>pasted[i]||"");
    setDigits(next);
    const hidden=document.getElementById(id);
    if(hidden) hidden.value=next.join("");
    const lastFilled=Math.min(pasted.length,7);
    refs[lastFilled].current?.focus();
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"repeat(8,1fr)",gap:"6px",margin:"4px 0 2px"}}>
      {digits.map((d,i)=>(
        <input key={i} ref={refs[i]}
          type="text" inputMode="numeric" maxLength={1} value={d}
          onChange={e=>handleChange(i,e.target.value)}
          onKeyDown={e=>handleKey(i,e)}
          onPaste={handlePaste}
          style={{
            height:"48px",textAlign:"center",fontSize:"23px",fontWeight:700,
            background:d?"rgba(232,192,96,.15)":"var(--white-faint)",
            border:`2px solid ${d?"var(--gold)":"var(--border-white)"}`,
            borderRadius:"10px",color:"var(--white)",outline:"none",
            fontFamily:"'Poppins',sans-serif",transition:"all .2s",padding:0,width:"100%"
          }}
        />
      ))}
    </div>
  );
}

// ── USER AUTH SUB-COMPONENT ─────────────────────────────────────────────────
function UserAuth({doRegister,doLogin}){
  const [mode,setMode]=useState("register");
  const [rs,setRs]=useState(""); const [rn,setRn]=useState("");
  const [latinWarn,setLatinWarn]=useState(false);
  const warnTimer=useState(null);

  const filterCyril=(v)=>{
    if(/[A-Za-zÀ-ɏ]/.test(v)){
      setLatinWarn(true);
      clearTimeout(warnTimer[0]);
      warnTimer[0]=setTimeout(()=>setLatinWarn(false),3000);
    }
    return v.replace(/[^\u0400-\u04FF\s]/gu,"");
  };

  return (
    <>
      <div style={{display:"flex",gap:"6px",marginBottom:"16px"}}>
        <button className={`tab-btn ${mode==="register"?"active":""}`} style={{fontSize:"14px"}} onClick={()=>setMode("register")}>Бүртгүүлэх</button>
        <button className={`tab-btn ${mode==="login"?"active":""}`} style={{fontSize:"14px"}} onClick={()=>setMode("login")}>Нэвтрэх</button>
      </div>

      {latinWarn && (
        <div style={{background:"rgba(192,57,43,.15)",border:"1px solid rgba(192,57,43,.4)",
          borderRadius:"10px",padding:"10px 14px",marginBottom:"10px",
          fontSize:"15px",color:"#ff8a80",display:"flex",gap:"8px",alignItems:"center"}}>
          <span>⚠️</span> Та зөвхөн Монгол кирилл үсгээр бичнэ үү
        </div>
      )}

      {mode==="register" ? <>
        <label>Овог:</label>
        <input type="text" placeholder="Овог" maxLength={40} value={rs}
          onChange={e=>{const v=filterCyril(e.target.value);setRs(v);}}/>
        <input id="rs" type="hidden" value={rs} readOnly/>
        <label>Нэр:</label>
        <input type="text" placeholder="Нэр" maxLength={40} value={rn}
          onChange={e=>{const v=filterCyril(e.target.value);setRn(v);}}/>
        <input id="rn" type="hidden" value={rn} readOnly/>
        <label>Гар утасны дугаар:</label>
        <PhoneGrid id="rp"/>
        <input id="rp" type="hidden"/>
        <button className="btn-gold" onClick={doRegister}>Нэвтрэх →</button>
      </> : <>
        <div style={{background:"rgba(232,192,96,.08)",border:"1px solid var(--border-gold)",borderRadius:"10px",padding:"12px 14px",marginBottom:"4px",fontSize:"15px",color:"rgba(255,255,255,.7)",lineHeight:1.6}}>
          📱 Бүртгүүлэхдээ ашигласан <strong style={{color:"var(--gold)"}}>утасны дугаараа</strong> оруулна уу
        </div>
        <label>Гар утасны дугаар:</label>
        <PhoneGrid id="lp"/>
        <input id="lp" type="hidden"/>
        <button className="btn-gold" onClick={doLogin}>Нэвтрэх →</button>
      </>}
    </>
  );
}
