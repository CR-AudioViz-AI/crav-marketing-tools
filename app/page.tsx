"use client";
// app/page.tsx — Javari Marketing Hub
// Unified: Social Media + Email Marketing + Ebook Drip + Announcements
// CR AudioViz AI · EIN 39-3646201 · June 2026
// Beats Buffer, Mailchimp, ConvertKit, Hootsuite combined
import { useState, useCallback, useEffect, useRef } from "react";
import { publishableKey, supabaseUrl } from "@craudioviz/platform-sdk";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "compose" | "email" | "drip" | "announce" | "subscribers" | "analytics";

const CR_PLATFORMS = [
  { id: "craudiovizai", name: "craudiovizai.com", icon: "🏠", color: "#1E3A5F", type: "our" },
  { id: "javariai",     name: "javariai.com",     icon: "🤖", color: "#0F1F32", type: "our" },
];
const SOCIAL_PLATFORMS = [
  { id: "instagram", name: "Instagram",    icon: "📸", maxChars: 2200, color: "#E1306C" },
  { id: "linkedin",  name: "LinkedIn",     icon: "💼", maxChars: 3000, color: "#0A66C2" },
  { id: "twitter",   name: "X (Twitter)",  icon: "𝕏",  maxChars: 280,  color: "#000000" },
  { id: "facebook",  name: "Facebook",     icon: "👥", maxChars: 63206,color: "#1877F2" },
  { id: "tiktok",    name: "TikTok",       icon: "🎵", maxChars: 2200, color: "#FF0050" },
  { id: "threads",   name: "Threads",      icon: "🧵", maxChars: 500,  color: "#1C1C1E" },
  { id: "youtube",   name: "YouTube",      icon: "▶️", maxChars: 5000, color: "#FF0000" },
  { id: "pinterest", name: "Pinterest",    icon: "📌", maxChars: 500,  color: "#E60023" },
  { id: "discord",   name: "Discord",      icon: "🎮", maxChars: 2000, color: "#5865F2" },
  { id: "telegram",  name: "Telegram",     icon: "✈️", maxChars: 4096, color: "#26A5E4" },
  { id: "bluesky",   name: "Bluesky",      icon: "🦋", maxChars: 300,  color: "#0085FF" },
  { id: "mastodon",  name: "Mastodon",     icon: "🐘", maxChars: 500,  color: "#6364FF" },
];

const EMAIL_TYPES = [
  { id: "newsletter", name: "Newsletter", icon: "📰" },
  { id: "welcome",    name: "Welcome",    icon: "👋" },
  { id: "promotion",  name: "Promotion",  icon: "🎉" },
  { id: "announcement", name: "Announcement", icon: "📣" },
  { id: "follow-up",  name: "Follow-Up",  icon: "🔄" },
  { id: "re-engagement", name: "Win-Back", icon: "💌" },
];

const TONES = ["Professional","Friendly","Enthusiastic","Educational","Storytelling","Humorous","Inspirational","Bold"];
const ANNOUNCE_TYPES = [
  { id: "feature",     name: "New Feature",    icon: "✨" },
  { id: "launch",      name: "App Launch",     icon: "🚀" },
  { id: "expansion",   name: "Expansion",      icon: "🌍" },
  { id: "update",      name: "Platform Update",icon: "⚡" },
  { id: "partnership", name: "Partnership",    icon: "🤝" },
  { id: "event",       name: "Event",          icon: "🎫" },
];

interface Subscriber { id: string; email: string; first_name: string; status: string; subscribed_at: string; tags: string[]; }
interface DripsData   { id: string; title: string; total_chapters: number; subscriber_count: number; status: string; cadence_days: number; }
interface PostResult  { platform: string; content: string; hashtags: string[]; charCount: number; }

const SB_URL = supabaseUrl();
const SB_KEY = publishableKey();

async function sbFetch(table: string, method = "GET", body?: object, params = "") {
  const r = await fetch(`${SB_URL}/rest/v1/${table}${params}`, {
    method,
    headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
      "Content-Type": "application/json", Prefer: method === "POST" ? "return=representation" : "" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(await r.text());
  return r.json();
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ComposeTab() {
  const [brief, setBrief]           = useState("");
  const [tone, setTone]             = useState("Professional");
  const [contentType, setContentType] = useState("post");
  const [selected, setSelected]     = useState<string[]>(["instagram","linkedin","twitter"]);
  const [includeEmail, setIncludeEmail] = useState(false);
  const [emailType, setEmailType]   = useState("newsletter");
  const [loading, setLoading]       = useState(false);
  const [results, setResults]       = useState<PostResult[]>([]);
  const [emailResult, setEmailResult] = useState<{subject:string;body:string;html:string}|null>(null);
  const [toast, setToast]           = useState("");
  const [brandName, setBrandName]   = useState("CR AudioViz AI");

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),3000); };
  const togglePlatform = (id: string) =>
    setSelected(prev => prev.includes(id) ? prev.filter(p=>p!==id) : [...prev,id]);

  const generate = async () => {
    if (!brief.trim()) return;
    setLoading(true); setResults([]); setEmailResult(null);
    try {
      // Generate social posts
      if (selected.length > 0) {
        const posts: PostResult[] = [];
        for (const platformId of selected.slice(0,6)) {
          const plat = SOCIAL_PLATFORMS.find(p=>p.id===platformId);
          if (!plat) continue;
          const r = await fetch("/api/generate", {
            method:"POST", headers:{"Content-Type":"application/json"},
            body: JSON.stringify({
              type: "social", platform: platformId, tone: tone.toLowerCase(),
              brief: brief.trim(), brand: brandName, contentType,
              maxChars: plat.maxChars,
            }),
          });
          const d = await r.json() as {content?:string;hashtags?:string[]};
          const content = d.content || "";
          const hashtags = d.hashtags || [];
          posts.push({ platform: platformId, content, hashtags, charCount: content.length + hashtags.join(" ").length });
        }
        setResults(posts);
      }
      // Generate email
      if (includeEmail) {
        const r = await fetch("/api/tools/email-templates/generate", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ type: emailType, brandName, topic: brief.trim(), tone }),
        });
        const d = await r.json() as {subject:string;body:string;html:string};
        setEmailResult(d);
      }
    } catch(e) { showToast("Generation failed: " + String(e)); }
    setLoading(false);
  };

  const copyAll = () => {
    const text = results.map(r=>{
      const p = SOCIAL_PLATFORMS.find(pl=>pl.id===r.platform)!;
      const hash = r.hashtags.length ? "\n\n" + r.hashtags.join(" ") : "";
      return `=== ${p.icon} ${p.name} ===\n${r.content}${hash}`;
    }).join("\n\n");
    navigator.clipboard.writeText(text);
    showToast("✅ All posts copied!");
  };

  const S = {
    card: { background:"#0F1F32",border:"1px solid rgba(0,180,216,0.08)",borderRadius:14,padding:18,marginBottom:14 },
    label: { fontSize:11,fontWeight:700 as const,color:"#9CA3AF",textTransform:"uppercase" as const,letterSpacing:"0.04em",marginBottom:6,display:"block" },
    input: { width:"100%",background:"#172D48",border:"1px solid rgba(0,180,216,0.12)",borderRadius:8,padding:"9px 11px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"system-ui",boxSizing:"border-box" as const },
    chip: (active:boolean,color?:string) => ({ padding:"5px 11px",borderRadius:20,fontSize:11,fontWeight:600 as const,cursor:"pointer",border:`1px solid ${active?(color||"#00B4D8"):"rgba(0,180,216,0.15)"}`,background:active?`${color||"rgba(0,180,216,0.12)"}22`:"transparent",color:active?(color||"#00B4D8"):"#9CA3AF",fontFamily:"system-ui",display:"flex",alignItems:"center",gap:5 }),
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"360px 1fr",gap:18}}>
      {toast&&<div style={{position:"fixed",top:68,right:20,background:"#1E3A5F",border:"1px solid rgba(0,180,216,0.3)",borderRadius:10,padding:"10px 18px",fontSize:13,zIndex:999,color:"#e2e8f0"}}>{toast}</div>}
      <div>
        <div style={S.card}>
          <label style={S.label}>What to post about</label>
          <textarea rows={4} value={brief} onChange={e=>setBrief(e.target.value)}
            placeholder="Describe your announcement, promotion, content idea, or campaign..."
            style={{...S.input,resize:"vertical" as const,marginBottom:10}}/>
          <label style={S.label}>Brand Name</label>
          <input type="text" value={brandName} onChange={e=>setBrandName(e.target.value)} style={{...S.input,marginBottom:10}} placeholder="CR AudioViz AI"/>
          <label style={S.label}>Tone</label>
          <div style={{display:"flex",flexWrap:"wrap" as const,gap:5,marginBottom:12}}>
            {TONES.map(t=><button key={t} style={S.chip(tone===t)} onClick={()=>setTone(t)}>{t}</button>)}
          </div>
          <label style={S.label}>Content Type</label>
          <div style={{display:"flex",gap:5,flexWrap:"wrap" as const,marginBottom:12}}>
            {[["post","Single Post"],["thread","Thread"],["carousel","Carousel"],["hook","Hook"],["story","Story Script"]].map(([id,name])=>(
              <button key={id} style={S.chip(contentType===id)} onClick={()=>setContentType(id)}>{name}</button>
            ))}
          </div>
        </div>

        <div style={S.card}>
          <label style={S.label}>Our Platforms</label>
          <div style={{display:"flex",gap:6,flexWrap:"wrap" as const,marginBottom:10}}>
            {CR_PLATFORMS.map(p=>(
              <button key={p.id} style={S.chip(selected.includes(p.id),p.color)} onClick={()=>togglePlatform(p.id)}>
                {p.icon} {p.name}
              </button>
            ))}
          </div>
          <label style={S.label}>Social Platforms</label>
          <div style={{display:"flex",gap:5,flexWrap:"wrap" as const,marginBottom:12}}>
            {SOCIAL_PLATFORMS.map(p=>(
              <button key={p.id} style={S.chip(selected.includes(p.id),p.color)} onClick={()=>togglePlatform(p.id)}>
                {p.icon} {p.name}
              </button>
            ))}
          </div>
          <label style={{...S.label,display:"flex",alignItems:"center",gap:8,cursor:"pointer",marginBottom:8}}>
            <input type="checkbox" checked={includeEmail} onChange={e=>setIncludeEmail(e.target.checked)}/>
            Also generate email for this campaign
          </label>
          {includeEmail&&(
            <div style={{display:"flex",flexWrap:"wrap" as const,gap:5}}>
              {EMAIL_TYPES.map(t=><button key={t.id} style={S.chip(emailType===t.id)} onClick={()=>setEmailType(t.id)}>{t.icon} {t.name}</button>)}
            </div>
          )}
        </div>

        <button onClick={generate} disabled={loading||!brief.trim()||(selected.length===0&&!includeEmail)}
          style={{width:"100%",background:loading||!brief.trim()?"#0F1F32":"#FF0800",color:loading||!brief.trim()?"#374151":"#fff",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,cursor:loading||!brief.trim()?"not-allowed":"pointer",fontFamily:"system-ui"}}>
          {loading?"✨ Generating content...":"Generate Content for All Platforms"}
        </button>
      </div>

      <div>
        {loading&&<div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",padding:80,color:"#9CA3AF",textAlign:"center" as const}}>
          <div style={{fontSize:48,marginBottom:12}}>✨</div>
          <div style={{fontWeight:700,color:"#00B4D8",fontSize:16,marginBottom:6}}>Creating {selected.length} platform posts{includeEmail?" + email":""}...</div>
          <div style={{fontSize:13}}>Optimizing content for each platform's format and audience</div>
        </div>}
        {!loading&&results.length===0&&!emailResult&&<div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",padding:80,color:"#6B7280",textAlign:"center" as const}}>
          <div style={{fontSize:64,marginBottom:16}}>📡</div>
          <div style={{fontWeight:700,fontSize:18,color:"#9CA3AF",marginBottom:8}}>One brief, every platform</div>
          <div style={{fontSize:13,maxWidth:320}}>Select platforms, describe what to post, and generate optimized content for each channel simultaneously.</div>
        </div>}
        {results.length>0&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <span style={{fontWeight:700,color:"#e2e8f0"}}>✅ {results.length} posts generated</span>
              <button onClick={copyAll} style={{background:"#1E3A5F",color:"#00B4D8",border:"1px solid rgba(0,180,216,0.2)",borderRadius:7,padding:"6px 14px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"system-ui"}}>📋 Copy All</button>
            </div>
            {results.map(r=>{
              const p = SOCIAL_PLATFORMS.find(pl=>pl.id===r.platform)||CR_PLATFORMS.find(pl=>pl.id===r.platform);
              if (!p) return null;
              const plat = p as typeof SOCIAL_PLATFORMS[0];
              const full = r.content + (r.hashtags.length?"\n\n"+r.hashtags.join(" "):"");
              const over = plat.maxChars && r.charCount > plat.maxChars;
              return (
                <div key={r.platform} style={{background:"#0F1F32",border:"1px solid rgba(0,180,216,0.08)",borderRadius:12,marginBottom:12,overflow:"hidden"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 14px",background:"rgba(30,58,95,0.4)",borderBottom:"1px solid rgba(0,180,216,0.06)"}}>
                    <span style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>{"icon" in p ? p.icon : "📱"} {p.name}</span>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      {plat.maxChars&&<span style={{fontSize:11,color:over?"#EF4444":"#9CA3AF"}}>{r.charCount}/{plat.maxChars}</span>}
                      <button onClick={()=>{navigator.clipboard.writeText(full);showToast(`✅ ${p.name} copied!`);}}
                        style={{background:"rgba(0,180,216,0.1)",border:"1px solid rgba(0,180,216,0.2)",borderRadius:6,color:"#00B4D8",cursor:"pointer",fontSize:11,fontWeight:600,padding:"3px 10px",fontFamily:"system-ui"}}>
                        Copy
                      </button>
                    </div>
                  </div>
                  <div style={{padding:14}}>
                    <pre style={{fontSize:13,color:"#e2e8f0",lineHeight:1.7,whiteSpace:"pre-wrap",wordWrap:"break-word" as const,margin:"0 0 8px",fontFamily:"system-ui"}}>{r.content}</pre>
                    {r.hashtags.length>0&&<div style={{display:"flex",flexWrap:"wrap" as const,gap:5}}>
                      {r.hashtags.map((h,i)=><span key={i} style={{background:"rgba(0,180,216,0.07)",border:"1px solid rgba(0,180,216,0.12)",borderRadius:12,padding:"2px 8px",fontSize:11,color:"#00B4D8"}}>{h}</span>)}
                    </div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {emailResult&&(
          <div style={{background:"#0F1F32",border:"1px solid rgba(0,180,216,0.08)",borderRadius:12,overflow:"hidden",marginTop:results.length>0?14:0}}>
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 14px",background:"rgba(30,58,95,0.4)",borderBottom:"1px solid rgba(0,180,216,0.06)"}}>
              <span style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>📧 Email — {emailResult.subject}</span>
              <button onClick={()=>navigator.clipboard.writeText(emailResult.body).then(()=>showToast("✅ Email copied!"))}
                style={{background:"rgba(0,180,216,0.1)",border:"1px solid rgba(0,180,216,0.2)",borderRadius:6,color:"#00B4D8",cursor:"pointer",fontSize:11,fontWeight:600,padding:"3px 10px",fontFamily:"system-ui"}}>
                Copy
              </button>
            </div>
            <iframe srcDoc={emailResult.html} style={{width:"100%",height:400,border:"none"}} title="Email Preview"/>
          </div>
        )}
      </div>
    </div>
  );
}

function EbookDripTab() {
  const [drips, setDrips]       = useState<DripsData[]>([]);
  const [showCreate, setCreate] = useState(false);
  const [title, setTitle]       = useState("");
  const [desc, setDesc]         = useState("");
  const [cadence, setCadence]   = useState(7);
  const [ebookText, setEbook]   = useState("");
  const [loading, setLoading]   = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDrip, setDrip] = useState<DripsData|null>(null);
  const [chapters, setChapters] = useState<Array<{id:string;chapter_num:number;title:string;content:string;teaser:string}>>([]);
  const [toast, setToast]       = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),3000); };

  useEffect(() => { loadDrips(); }, []);

  const loadDrips = async () => {
    setLoading(true);
    try {
      const d = await sbFetch("mkt_ebook_drips", "GET", undefined, "?order=created_at.desc");
      setDrips(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  };

  const loadChapters = async (dripId: string) => {
    try {
      const d = await sbFetch("mkt_ebook_chapters", "GET", undefined, `?drip_id=eq.${dripId}&order=chapter_num.asc`);
      setChapters(Array.isArray(d) ? d : []);
    } catch {}
  };

  const createDrip = async () => {
    if (!title.trim() || !ebookText.trim()) { showToast("Enter a title and paste your ebook content."); return; }
    setCreating(true);
    try {
      // AI split into chapters
      const r = await fetch("/api/generate", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({
          type: "ebook_split",
          brief: ebookText.trim(),
          brand: "CR AudioViz AI",
          cadenceDays: cadence,
          title: title.trim(),
        }),
      });
      const d = await r.json() as {chapters?:Array<{title:string;content:string;teaser:string}>};
      const chapterList = d.chapters || [];

      // Create drip record
      const drip = await sbFetch("mkt_ebook_drips","POST",{
        title: title.trim(), description: desc.trim(),
        cadence_days: cadence, total_chapters: chapterList.length, status: "active",
      });
      const dripId = Array.isArray(drip) ? drip[0]?.id : drip?.id;

      // Create chapters
      for (let i=0; i<chapterList.length; i++) {
        await sbFetch("mkt_ebook_chapters","POST",{
          drip_id: dripId, chapter_num: i+1,
          title: chapterList[i].title,
          content: chapterList[i].content,
          teaser: chapterList[i].teaser,
          subject: `Chapter ${i+1}: ${chapterList[i].title}`,
        });
      }
      showToast(`✅ Created ${chapterList.length} chapters! Drip campaign ready.`);
      setCreate(false); setTitle(""); setDesc(""); setEbook(""); setCadence(7);
      loadDrips();
    } catch(e) { showToast("Failed: " + String(e)); }
    setCreating(false);
  };

  const S = {
    card: { background:"#0F1F32",border:"1px solid rgba(0,180,216,0.08)",borderRadius:14,padding:18,marginBottom:14 },
    label: { fontSize:11,fontWeight:700 as const,color:"#9CA3AF",textTransform:"uppercase" as const,letterSpacing:"0.04em",marginBottom:6,display:"block" },
    input: { width:"100%",background:"#172D48",border:"1px solid rgba(0,180,216,0.12)",borderRadius:8,padding:"9px 11px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"system-ui",boxSizing:"border-box" as const },
    btn: (color?:string) => ({background:color||"#1E3A5F",color:color?"#fff":"#00B4D8",border:`1px solid ${color?"transparent":"rgba(0,180,216,0.2)"}`,borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600 as const,cursor:"pointer",fontFamily:"system-ui"}),
  };

  return (
    <div>
      {toast&&<div style={{position:"fixed",top:68,right:20,background:"#1E3A5F",border:"1px solid rgba(0,180,216,0.3)",borderRadius:10,padding:"10px 18px",fontSize:13,zIndex:999,color:"#e2e8f0"}}>{toast}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#e2e8f0"}}>📚 Ebook Drip Campaigns</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#9CA3AF"}}>Upload an ebook → AI splits into chapters → auto-sends weekly to keep subscribers engaged</p>
        </div>
        <button style={S.btn("#FF0800")} onClick={()=>setCreate(!showCreate)}>
          {showCreate?"✕ Cancel":"+ New Drip Campaign"}
        </button>
      </div>

      {showCreate&&(
        <div style={{...S.card,border:"1px solid rgba(255,8,0,0.2)"}}>
          <h3 style={{margin:"0 0 16px",fontSize:14,fontWeight:700,color:"#e2e8f0"}}>Create Ebook Drip Campaign</h3>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
            <div style={{gridColumn:"span 2"}}>
              <label style={S.label}>Campaign Title</label>
              <input type="text" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. AI Marketing Mastery — 12-Week Course" style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Description (optional)</label>
              <input type="text" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What subscribers will learn..." style={S.input}/>
            </div>
            <div>
              <label style={S.label}>Send cadence (days between chapters)</label>
              <input type="number" min={1} max={30} value={cadence} onChange={e=>setCadence(Number(e.target.value))} style={S.input}/>
            </div>
          </div>
          <div style={{marginBottom:16}}>
            <label style={S.label}>Paste your ebook content (AI will split into chapters)</label>
            <textarea rows={12} value={ebookText} onChange={e=>setEbook(e.target.value)}
              placeholder="Paste your full ebook content here. AI will intelligently split it into engaging chapters, write teasers for each, create email subjects, and optimize each chapter for drip delivery..."
              style={{...S.input,resize:"vertical" as const}}/>
            <p style={{fontSize:11,color:"#6B7280",marginTop:4}}>{ebookText.length.toLocaleString()} characters · AI will create 5-15 chapters depending on content length</p>
          </div>
          <button style={{...S.btn("#FF0800"),padding:"11px 24px",fontSize:14}} onClick={createDrip} disabled={creating||!title.trim()||!ebookText.trim()}>
            {creating?"✨ AI is splitting your ebook into chapters...":"Create Drip Campaign"}
          </button>
        </div>
      )}

      {drips.length===0&&!showCreate&&(
        <div style={{textAlign:"center" as const,padding:60,color:"#6B7280"}}>
          <div style={{fontSize:64,marginBottom:16}}>📚</div>
          <div style={{fontWeight:700,fontSize:18,color:"#9CA3AF",marginBottom:8}}>No drip campaigns yet</div>
          <div style={{fontSize:13,marginBottom:20}}>Upload an ebook and AI will split it into chapters that send automatically, keeping subscribers excited for the next installment.</div>
          <button style={{...S.btn("#FF0800"),padding:"11px 24px",fontSize:14}} onClick={()=>setCreate(true)}>Create Your First Drip Campaign</button>
        </div>
      )}

      {drips.map(drip=>(
        <div key={drip.id} style={S.card}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div>
              <div style={{fontWeight:700,fontSize:15,color:"#e2e8f0",marginBottom:4}}>{drip.title}</div>
              <div style={{display:"flex",gap:16,fontSize:12,color:"#9CA3AF"}}>
                <span>📖 {drip.total_chapters} chapters</span>
                <span>👥 {drip.subscriber_count} subscribers</span>
                <span>⏱ Every {drip.cadence_days} days</span>
                <span style={{color:drip.status==="active"?"#10B981":"#9CA3AF"}}>● {drip.status}</span>
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button style={S.btn()} onClick={async()=>{ setDrip(drip); await loadChapters(drip.id); }}>
                View Chapters
              </button>
            </div>
          </div>
          {selectedDrip?.id===drip.id&&chapters.length>0&&(
            <div style={{marginTop:14,borderTop:"1px solid rgba(0,180,216,0.1)",paddingTop:14}}>
              <div style={{fontWeight:700,fontSize:12,color:"#9CA3AF",textTransform:"uppercase",letterSpacing:"0.04em",marginBottom:10}}>
                Chapters ({chapters.length})
              </div>
              {chapters.map(ch=>(
                <div key={ch.id} style={{background:"#172D48",borderRadius:8,padding:12,marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontWeight:700,fontSize:13,color:"#e2e8f0"}}>Ch.{ch.chapter_num}: {ch.title}</span>
                    <span style={{fontSize:11,color:"#9CA3AF"}}>{ch.content.length} chars</span>
                  </div>
                  {ch.teaser&&<p style={{margin:0,fontSize:11,color:"#6B7280",lineHeight:1.5}}>{ch.teaser}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SubscribersTab() {
  const [subs, setSubs]     = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [newEmail, setEmail]= useState("");
  const [newName, setName]  = useState("");
  const [adding, setAdding] = useState(false);
  const [toast, setToast]   = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),3000); };

  useEffect(() => { loadSubs(); }, []);
  const loadSubs = async () => {
    setLoading(true);
    try {
      const d = await sbFetch("mkt_subscribers","GET",undefined,"?order=subscribed_at.desc&limit=100");
      setSubs(Array.isArray(d) ? d : []);
    } catch {}
    setLoading(false);
  };

  const addSubscriber = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);
    try {
      await sbFetch("mkt_subscribers","POST",{
        email: newEmail.trim().toLowerCase(),
        first_name: newName.trim() || null,
        status: "active", source: "manual",
      });
      setEmail(""); setName("");
      showToast("✅ Subscriber added!");
      loadSubs();
    } catch(e) { showToast("Failed: " + String(e)); }
    setAdding(false);
  };

  const filtered = subs.filter(s =>
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.first_name||"").toLowerCase().includes(search.toLowerCase())
  );

  const S = {
    input: { background:"#172D48",border:"1px solid rgba(0,180,216,0.12)",borderRadius:8,padding:"9px 11px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"system-ui" },
  };

  return (
    <div>
      {toast&&<div style={{position:"fixed",top:68,right:20,background:"#1E3A5F",border:"1px solid rgba(0,180,216,0.3)",borderRadius:10,padding:"10px 18px",fontSize:13,zIndex:999,color:"#e2e8f0"}}>{toast}</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div>
          <h2 style={{margin:0,fontSize:18,fontWeight:800,color:"#e2e8f0"}}>👥 Subscribers</h2>
          <p style={{margin:"4px 0 0",fontSize:13,color:"#9CA3AF"}}>{subs.filter(s=>s.status==="active").length} active · {subs.length} total</p>
        </div>
        <div style={{display:"flex",gap:8}}>
          <input type="email" value={newEmail} onChange={e=>setEmail(e.target.value)} placeholder="email@example.com" style={{...S.input,width:200}}/>
          <input type="text" value={newName} onChange={e=>setName(e.target.value)} placeholder="First name" style={{...S.input,width:120}}/>
          <button onClick={addSubscriber} disabled={adding||!newEmail.trim()} style={{background:"#FF0800",color:"#fff",border:"none",borderRadius:7,padding:"7px 16px",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"system-ui"}}>
            {adding?"Adding...":"+ Add"}
          </button>
        </div>
      </div>

      <div style={{background:"#0F1F32",border:"1px solid rgba(0,180,216,0.08)",borderRadius:14,padding:18}}>
        <input type="text" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subscribers..."
          style={{...S.input,width:"100%",boxSizing:"border-box",marginBottom:14}}/>
        {loading&&<div style={{textAlign:"center" as const,padding:40,color:"#9CA3AF"}}>Loading...</div>}
        {!loading&&filtered.length===0&&<div style={{textAlign:"center" as const,padding:40,color:"#9CA3AF"}}>
          {subs.length===0?"No subscribers yet. Add your first one above.":"No matching subscribers."}
        </div>}
        <table style={{width:"100%",borderCollapse:"collapse" as const}}>
          <thead>
            <tr style={{borderBottom:"1px solid rgba(0,180,216,0.1)"}}>
              {["Email","Name","Status","Source","Subscribed"].map(h=>(
                <th key={h} style={{textAlign:"left" as const,padding:"6px 10px",fontSize:11,fontWeight:700,color:"#9CA3AF",textTransform:"uppercase" as const,letterSpacing:"0.04em"}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(s=>(
              <tr key={s.id} style={{borderBottom:"1px solid rgba(0,180,216,0.04)"}}>
                <td style={{padding:"10px",fontSize:13,color:"#e2e8f0"}}>{s.email}</td>
                <td style={{padding:"10px",fontSize:13,color:"#9CA3AF"}}>{s.first_name||"—"}</td>
                <td style={{padding:"10px"}}>
                  <span style={{background:s.status==="active"?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.1)",color:s.status==="active"?"#10B981":"#EF4444",borderRadius:12,padding:"2px 8px",fontSize:11,fontWeight:600}}>
                    {s.status}
                  </span>
                </td>
                <td style={{padding:"10px",fontSize:12,color:"#6B7280"}}>{s.source||"website"}</td>
                <td style={{padding:"10px",fontSize:12,color:"#6B7280"}}>{new Date(s.subscribed_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AnnouncementsTab() {
  const [type, setType]     = useState("launch");
  const [title, setTitle]   = useState("");
  const [content, setContent]= useState("");
  const [channels, setChannels] = useState<string[]>(["email","social"]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState<{social:string;email:string;subject:string}|null>(null);
  const [toast, setToast]   = useState("");

  const showToast = (m: string) => { setToast(m); setTimeout(()=>setToast(""),3000); };
  const toggleChannel = (c: string) => setChannels(prev => prev.includes(c) ? prev.filter(x=>x!==c) : [...prev,c]);

  const generate = async () => {
    if (!title.trim()) return;
    setLoading(true); setGenerated(null);
    try {
      const [socialRes, emailRes] = await Promise.all([
        channels.includes("social") ? fetch("/api/generate", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({
            type:"social", platform:"linkedin", tone:"enthusiastic",
            brief:`ANNOUNCEMENT: ${title}. ${content}`,
            brand:"CR AudioViz AI",
          }),
        }).then(r=>r.json() as Promise<{content:string}>) : Promise.resolve({content:""}),
        channels.includes("email") ? fetch("/api/tools/email-templates/generate", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({type:"announcement",brandName:"CR AudioViz AI",topic:`${title}. ${content}`,tone:"enthusiastic",cta:"Learn More"}),
        }).then(r=>r.json() as Promise<{subject:string;body:string}>) : Promise.resolve({subject:"",body:""}),
      ]);
      setGenerated({
        social: (socialRes as {content:string}).content || "",
        email: (emailRes as {body:string}).body || "",
        subject: (emailRes as {subject:string}).subject || title,
      });

      // Save announcement to DB
      await sbFetch("mkt_announcements","POST",{
        title: title.trim(), type,
        content: content.trim() || title.trim(),
        target_channels: channels, status: "draft",
      });
      showToast("✅ Announcement created and saved!");
    } catch(e) { showToast("Failed: " + String(e)); }
    setLoading(false);
  };

  const S = {
    card: { background:"#0F1F32",border:"1px solid rgba(0,180,216,0.08)",borderRadius:14,padding:18,marginBottom:14 },
    label: { fontSize:11,fontWeight:700 as const,color:"#9CA3AF",textTransform:"uppercase" as const,letterSpacing:"0.04em",marginBottom:6,display:"block" },
    input: { width:"100%",background:"#172D48",border:"1px solid rgba(0,180,216,0.12)",borderRadius:8,padding:"9px 11px",color:"#e2e8f0",fontSize:13,outline:"none",fontFamily:"system-ui",boxSizing:"border-box" as const },
    chip: (active:boolean) => ({padding:"6px 12px",borderRadius:20,fontSize:12,fontWeight:600 as const,cursor:"pointer",border:`1px solid ${active?"#00B4D8":"rgba(0,180,216,0.15)"}`,background:active?"rgba(0,180,216,0.12)":"transparent",color:active?"#00B4D8":"#9CA3AF",fontFamily:"system-ui"}),
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"380px 1fr",gap:18}}>
      {toast&&<div style={{position:"fixed",top:68,right:20,background:"#1E3A5F",border:"1px solid rgba(0,180,216,0.3)",borderRadius:10,padding:"10px 18px",fontSize:13,zIndex:999,color:"#e2e8f0"}}>{toast}</div>}
      <div>
        <div style={S.card}>
          <label style={S.label}>Announcement Type</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:14}}>
            {ANNOUNCE_TYPES.map(t=>(
              <button key={t.id} style={{...S.chip(type===t.id),justifyContent:"flex-start" as const}} onClick={()=>setType(t.id)}>
                {t.icon} {t.name}
              </button>
            ))}
          </div>
          <div style={{marginBottom:12}}>
            <label style={S.label}>Headline</label>
            <input type="text" value={title} onChange={e=>setTitle(e.target.value)}
              placeholder="We just launched..." style={S.input}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.label}>Details (optional)</label>
            <textarea rows={4} value={content} onChange={e=>setContent(e.target.value)}
              placeholder="What's new, who it helps, what's the impact..."
              style={{...S.input,resize:"vertical" as const}}/>
          </div>
          <div style={{marginBottom:14}}>
            <label style={S.label}>Publish to</label>
            <div style={{display:"flex",gap:6,flexWrap:"wrap" as const}}>
              {[["email","📧 Email"],["social","📱 Social"],["craudiovizai","🏠 Platform"],["newsletter","📰 Newsletter"]].map(([id,name])=>(
                <button key={id} style={S.chip(channels.includes(id))} onClick={()=>toggleChannel(id)}>{name}</button>
              ))}
            </div>
          </div>
          <button onClick={generate} disabled={loading||!title.trim()}
            style={{width:"100%",background:loading||!title.trim()?"#0F1F32":"#FF0800",color:loading||!title.trim()?"#374151":"#fff",border:"none",borderRadius:10,padding:"12px",fontSize:14,fontWeight:700,cursor:loading||!title.trim()?"not-allowed":"pointer",fontFamily:"system-ui"}}>
            {loading?"✨ Generating announcement content...":"Generate & Save Announcement"}
          </button>
        </div>
      </div>
      <div>
        {!generated&&!loading&&<div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",padding:80,color:"#6B7280",textAlign:"center" as const}}>
          <div style={{fontSize:64,marginBottom:16}}>📣</div>
          <div style={{fontWeight:700,fontSize:18,color:"#9CA3AF",marginBottom:8}}>Platform Announcements</div>
          <div style={{fontSize:13,maxWidth:320}}>New app launch, feature update, expansion — generate and distribute across all channels in one click.</div>
        </div>}
        {loading&&<div style={{display:"flex",flexDirection:"column" as const,alignItems:"center",padding:80,color:"#9CA3AF",textAlign:"center" as const}}>
          <div style={{fontSize:48,marginBottom:12}}>📣</div>
          <div style={{fontWeight:700,color:"#00B4D8",fontSize:16}}>Drafting your announcement...</div>
        </div>}
        {generated&&(
          <div>
            {generated.social&&(
              <div style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{fontWeight:700,color:"#00B4D8",fontSize:13}}>📱 Social Media Post</span>
                  <button onClick={()=>{navigator.clipboard.writeText(generated.social);showToast("Copied!");}}
                    style={{background:"rgba(0,180,216,0.1)",border:"1px solid rgba(0,180,216,0.2)",borderRadius:6,color:"#00B4D8",cursor:"pointer",fontSize:11,fontWeight:600,padding:"3px 10px",fontFamily:"system-ui"}}>Copy</button>
                </div>
                <pre style={{fontSize:13,color:"#e2e8f0",lineHeight:1.7,whiteSpace:"pre-wrap",margin:0,fontFamily:"system-ui"}}>{generated.social}</pre>
              </div>
            )}
            {generated.email&&(
              <div style={S.card}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontWeight:700,color:"#00B4D8",fontSize:13}}>📧 Email — {generated.subject}</span>
                  <button onClick={()=>{navigator.clipboard.writeText(generated.email);showToast("Copied!");}}
                    style={{background:"rgba(0,180,216,0.1)",border:"1px solid rgba(0,180,216,0.2)",borderRadius:6,color:"#00B4D8",cursor:"pointer",fontSize:11,fontWeight:600,padding:"3px 10px",fontFamily:"system-ui"}}>Copy</button>
                </div>
                <pre style={{fontSize:13,color:"#e2e8f0",lineHeight:1.7,whiteSpace:"pre-wrap",margin:0,fontFamily:"system-ui"}}>{generated.email}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Hub ─────────────────────────────────────────────────────────────────
export default function MarketingHub() {
  const [tab, setTab] = useState<Tab>("compose");

  const TABS: { id: Tab; icon: string; label: string; desc: string }[] = [
    { id:"compose",     icon:"📡", label:"Compose",      desc:"Post to all platforms" },
    { id:"email",       icon:"📧", label:"Email",        desc:"Campaigns & templates" },
    { id:"drip",        icon:"📚", label:"Ebook Drip",   desc:"Chapter-by-chapter" },
    { id:"announce",    icon:"📣", label:"Announce",     desc:"Launches & updates" },
    { id:"subscribers", icon:"👥", label:"Subscribers",  desc:"Manage your list" },
  ];

  const S = {
    wrap: { minHeight:"100vh", background:"#040912", color:"#e2e8f0", fontFamily:"system-ui" },
    nav: { background:"#1E3A5F", height:52, padding:"0 20px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid rgba(0,180,216,0.15)", position:"sticky" as const, top:0, zIndex:100 },
    tabBar: { background:"#0A1628", borderBottom:"1px solid rgba(0,180,216,0.08)", padding:"0 20px", display:"flex", gap:4, overflowX:"auto" as const },
    tabBtn: (active: boolean) => ({ padding:"12px 18px", fontSize:13, fontWeight:600 as const, cursor:"pointer", border:"none", background:active?"rgba(0,180,216,0.1)":"transparent", color:active?"#00B4D8":"#9CA3AF", borderBottom:active?"2px solid #00B4D8":"2px solid transparent", fontFamily:"system-ui", display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap" as const }),
    content: { maxWidth:1200, margin:"0 auto", padding:"20px 20px 48px" },
  };

  return (
    <div style={S.wrap}>
      <nav style={S.nav}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:20}}>📣</span>
          <span style={{fontWeight:800,color:"#00B4D8",fontSize:15}}>Javari Marketing Hub</span>
          <span style={{fontSize:11,background:"rgba(0,180,216,0.1)",color:"#00B4D8",borderRadius:10,padding:"2px 8px"}}>All Channels</span>
        </div>
        <a href="https://craudiovizai.com/auth/signup" style={{background:"#FF0800",color:"#fff",borderRadius:7,padding:"5px 14px",fontSize:12,fontWeight:700,textDecoration:"none"}}>Sign Up Free</a>
      </nav>

      <div style={S.tabBar}>
        {TABS.map(t=>(
          <button key={t.id} style={S.tabBtn(tab===t.id)} onClick={()=>setTab(t.id)}>
            <span>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={S.content}>
        {tab==="compose"     && <ComposeTab />}
        {tab==="email"       && <div style={{textAlign:"center" as const,padding:60,color:"#9CA3AF"}}><div style={{fontSize:64,marginBottom:16}}>📧</div><div style={{fontSize:18,fontWeight:700,color:"#e2e8f0",marginBottom:8}}>Email Campaigns</div><p style={{marginBottom:20}}>Full email campaign builder with templates, sequences, and delivery tracking.</p><a href="/apps/email-templates" style={{background:"#FF0800",color:"#fff",borderRadius:10,padding:"12px 28px",textDecoration:"none",fontWeight:700,fontSize:14}}>Open Email Builder →</a></div>}
        {tab==="drip"        && <EbookDripTab />}
        {tab==="announce"    && <AnnouncementsTab />}
        {tab==="subscribers" && <SubscribersTab />}
      </div>
    </div>
  );
}
