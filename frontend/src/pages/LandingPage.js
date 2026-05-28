import{useEffect,useState,useRef}from'react';
import{useNavigate}from'react-router-dom';
import{useAuth}from'../context/AuthContext';

export default function LandingPage(){
  const{user}=useAuth();
  const navigate=useNavigate();
  const[scrolled,setScrolled]=useState(false);
  const[email,setEmail]=useState('');
  const[joined,setJoined]=useState(false);
  const[menuOpen,setMenuOpen]=useState(false);
  const[aiText,setAiText]=useState('');
  const aiRef=useRef(0);
  const R='#E8232A';

  const fullText='Your catalytic converter is underperforming. This is NOT an emergency. Fair repair cost in your area is $280-$420. If a shop quotes over $600, walk away.';

  useEffect(()=>{
    if(user){const r={driver:'/dashboard',shop:'/shop',towing:'/towing'};navigate(r[user.type]||'/dashboard');}
    const onScroll=()=>setScrolled(window.scrollY>50);
    window.addEventListener('scroll',onScroll);
    return()=>window.removeEventListener('scroll',onScroll);
  },[user,navigate]);

  useEffect(()=>{
    let i=0;
    function type(){if(i<=fullText.length){setAiText(fullText.slice(0,i));i++;setTimeout(type,22);}else{setTimeout(()=>{i=0;type();},4500);}}
    type();
  },[]);

  const handleWaitlist=()=>{if(email.includes('@')){setJoined(true);}};

  const LANGS1=[
    {f:'🇺🇸',n:'English'},{f:'🇫🇷',n:'Français'},{f:'🇪🇸',n:'Español'},{f:'🇧🇷',n:'Português'},
    {f:'🇸🇦',n:'العربية'},{f:'🇨🇳',n:'中文'},{f:'��🇪',n:'Deutsch'},{f:'🇯🇵',n:'日本語'},
    {f:'🇷🇺',n:'Русский'},{f:'🇮🇳',n:'हिन्दी'},{f:'🇰🇷',n:'한국어'},{f:'🇮🇹',n:'Italiano'},
    {f:'🇳🇱',n:'Nederlands'},{f:'🇹🇷',n:'Türkçe'},{f:'🇵🇱',n:'Polski'},{f:'🇭🇹',n:'Kreyòl'},
  ];
  const LANGS2=[
    {f:'🇿🇦',n:'Zulu'},{f:'🇸🇪',n:'Svenska'},{f:'��🇷',n:'Ελληνικά'},{f:'🇮🇱',n:'עברית'},
    {f:'🇹🇭',n:'ภาษาไทย'},{f:'🇻🇳',n:'Tiếng Việt'},{f:'🇷🇴',n:'Română'},{f:'🇭🇺',n:'Magyar'},
    {f:'🇳🇬',n:'Yoruba'},{f:'🇵��',n:'Filipino'},{f:'🇮🇩',n:'Bahasa'},{f:'🇺🇦',n:'Українська'},
    {f:'🇨🇿',n:'Čeština'},{f:'🇪🇹',n:'አማርኛ'},
  ];

  const s={
    page:{background:'#080808',color:'#fff',fontFamily:"'Barlow',sans-serif",overflowX:'hidden',overflowY:'auto'},
    nav:{position:'fixed',top:0,left:0,right:0,zIndex:100,background:scrolled?'rgba(8,8,8,0.97)':'transparent',backdropFilter:scrolled?'blur(8px)':'none',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,transition:'all .3s'},
    section:{padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)'},
  };

  return(
    <div style={s.page}>
      <style>{`
        @keyframes ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        @keyframes mq2{from{transform:translateX(-50%)}to{transform:translateX(0)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.5;transform:scale(1.3)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes ap{0%,100%{border-color:rgba(232,35,42,0.25)}50%{border-color:rgba(232,35,42,0.6)}}
        .ticker-track{display:inline-flex;animation:ticker 22s linear infinite;}
        .lang-track1{display:flex;gap:10px;animation:mq 30s linear infinite;width:max-content;}
        .lang-track2{display:flex;gap:10px;animation:mq2 26s linear infinite;width:max-content;}
        .reveal-item{animation:fadeUp 0.8s ease both;}
        .card-hover:hover{border-color:rgba(232,35,42,0.35)!important;transform:translateY(-4px);transition:all .3s;}
        .nav-link:hover{color:#fff!important;}
        .feature-line::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:#E8232A;transform:scaleX(0);transition:transform .3s;transform-origin:left;}
        .feature-card-wrap:hover .feature-line::before{transform:scaleX(1);}
        .typing-cursor{display:inline-block;width:2px;height:10px;background:#E8232A;margin-left:2px;animation:blink 1s infinite;vertical-align:middle;}
        .dash-alert-anim{animation:ap 3s infinite;}
      `}</style>

      {/* NAV */}
      <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:scrolled?'rgba(8,8,8,0.97)':'transparent',backdropFilter:scrolled?'blur(8px)':'none',padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8,transition:'all .3s'}}>
        <div onClick={()=>navigate('/')} style={{fontFamily:"'Bebas Neue'",fontSize:'2rem',letterSpacing:6,cursor:'pointer'}}>MECH<span style={{color:R}}>A</span></div>
        <div className='hide-mobile' style={{display:'flex',gap:12,alignItems:'center'}}>
          {[['Features','features'],['Pricing','pricing'],['FAQ','faq'],['Towing','/towing/register']].map(([l,id])=><span key={l} className="nav-link" onClick={()=>id.startsWith('/')?navigate(id):document.getElementById(id)?.scrollIntoView({behavior:'smooth'})} style={{color:'#888',fontSize:'.78rem',fontWeight:600,letterSpacing:2,textTransform:'uppercase',cursor:'pointer'}}>{l}</span>)}
          <button onClick={()=>navigate('/register')} style={{background:R,color:'#fff',padding:'10px 22px',border:'none',borderRadius:2,fontFamily:"'Barlow Condensed'",fontSize:'.82rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',cursor:'pointer'}}>Get Early Access</button>
        </div>
        <div className='show-mobile' onClick={()=>setMenuOpen(!menuOpen)} style={{display:'none',flexDirection:'column',gap:5,cursor:'pointer',padding:8,zIndex:101,position:'relative'}}>
          <div style={{width:24,height:2,background:'#fff',borderRadius:2}}/>
          <div style={{width:24,height:2,background:'#fff',borderRadius:2}}/>
          <div style={{width:24,height:2,background:'#fff',borderRadius:2}}/>
        </div>
      </nav>

      {/* HERO */}
      <div style={{minHeight:'100svh',display:'flex',flexDirection:'column',justifyContent:'center',position:'relative',padding:'clamp(80px,12vw,120px) clamp(16px,5vw,48px) clamp(40px,8vw,100px)',backgroundImage:"url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1800&q=80')",backgroundSize:'cover',backgroundPosition:'center'}}>
        <div style={{position:'absolute',inset:0,backgroundImage:'linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px)',backgroundSize:'60px 60px',maskImage:'radial-gradient(ellipse 80% 80% at 50% 50%,black,transparent)'}}/>
        <div style={{position:'absolute',inset:0,background:'linear-gradient(to right,rgba(8,8,8,0.85) 55%,rgba(8,8,8,0.3))',zIndex:1}}/><div style={{position:'relative',zIndex:2,maxWidth:860}}>
          <div style={{display:'inline-flex',alignItems:'center',gap:8,background:'rgba(232,35,42,0.12)',border:'1px solid rgba(232,35,42,0.3)',padding:'6px 16px',borderRadius:100,marginBottom:28,fontSize:'.72rem',fontWeight:600,letterSpacing:2,textTransform:'uppercase',color:R,animation:'fadeUp .8s ease both'}}>
            <div style={{width:6,height:6,background:R,borderRadius:'50%',animation:'pulse 1.5s infinite'}}/>
            Now in Beta — The #1 Automotive Super-Platform
          </div>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(4.2rem,11vw,10.5rem)',lineHeight:0.92,letterSpacing:2,marginBottom:8,animation:'fadeUp .8s .1s ease both'}}>
            YOUR CAR<br/>
            <span style={{color:'#fff'}}>FINALLY HAS A</span><br/>
            <span style={{color:R}}>CO-PILOT.</span>
          </div>
          <p style={{fontSize:'clamp(1rem,1.8vw,1.2rem)',color:'#888',fontWeight:300,maxWidth:540,lineHeight:1.8,margin:'22px 0 34px',animation:'fadeUp .8s .2s ease both'}}>
            AI-powered diagnosis, <strong style={{color:'#fff'}}>fair price protection</strong>, and full car health tracking — in <strong style={{color:'#fff'}}>every language on earth.</strong> Stop getting ripped off. Start driving smart.
          </p>
          <div style={{display:'flex',gap:14,flexWrap:'wrap',animation:'fadeUp .8s .3s ease both'}}>
            <button onClick={()=>navigate('/register')} style={{background:R,color:'#fff',padding:'16px 36px',fontFamily:"'Barlow Condensed'",fontSize:'1rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',border:'none',borderRadius:2,cursor:'pointer',boxShadow:'0 0 40px rgba(232,35,42,0.3)'}}>Get Early Access — Free</button>
            <button style={{color:'#fff',padding:'16px 28px',fontFamily:"'Barlow Condensed'",fontSize:'1rem',fontWeight:600,letterSpacing:1.5,textTransform:'uppercase',border:'1px solid rgba(255,255,255,0.15)',borderRadius:2,cursor:'pointer',background:'transparent',display:'flex',alignItems:'center',gap:10}}>
              <span style={{width:28,height:28,background:'rgba(255,255,255,0.1)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{borderLeft:'8px solid white',borderTop:'5px solid transparent',borderBottom:'5px solid transparent',marginLeft:2}}/></span>
              See How It Works
            </button>
          </div>
        </div>
        <div style={{position:'absolute',right:'clamp(16px,5vw,48px)',bottom:40,display:'flex',flexDirection:'column',gap:12}}>
          {[['230M+','US Drivers'],['$1,400','Avg Saved / Year'],['40+','Languages']].map(([n,l])=>(
            <div key={l} style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'2.3rem',lineHeight:1,color:R}}>{n}</div>
              <div style={{fontSize:'.68rem',letterSpacing:2,textTransform:'uppercase',color:'#888'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TICKER */}
      <div style={{background:R,padding:'10px 0',overflow:'hidden',whiteSpace:'nowrap'}}>
        <div className="ticker-track">
          {['AI DIAGNOSIS','✦','PRICE PROTECTION','✦','40+ LANGUAGES','✦','MECHANIC TRUST SCORES','✦','CAR HEALTH VAULT','✦','MOBILE + WEB APP','✦','TWO-SIDED MARKETPLACE','✦','AI DIAGNOSIS','✦','PRICE PROTECTION','✦','40+ LANGUAGES','✦','MECHANIC TRUST SCORES','✦','CAR HEALTH VAULT','✦','MOBILE + WEB APP','✦','TWO-SIDED MARKETPLACE','✦'].map((t,i)=>(
            <span key={i} style={{fontFamily:"'Bebas Neue'",fontSize:'1rem',letterSpacing:3,padding:'0 28px',color:'rgba(255,255,255,0.9)'}}>{t}</span>
          ))}
        </div>
      </div>

      {/* PROBLEM */}
      <div style={{background:'#111',padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(232,35,42,0.5),transparent)'}}/>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14}}>The Problem</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:48,lineHeight:1.05}}>EVERY DRIVER<br/><span style={{color:'rgba(255,255,255,0.25)'}}>FEELS THIS PAIN.</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:32,alignItems:'center'}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(5rem,12vw,9rem)',lineHeight:1,color:R,marginBottom:12}}>$1,400</div>
            <p style={{fontSize:'1rem',color:'#888',lineHeight:1.8,maxWidth:420}}>That is how much the average American overpays on car repairs every year. Not because mechanics are all dishonest, but because <strong style={{color:'#fff'}}>drivers have zero information.</strong> MECHA gives every driver that power back — in their own language.</p>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {[['⚠️','Check Engine Panic','A warning light turns on. You have no idea what it means. You drive to the shop scared and pay whatever they say.'],['💸','Repair Rip-Offs','73% of drivers say they have been overcharged. With no price data to compare, you have no choice but to trust the quote.'],['🗓️','Forgotten Maintenance','Missed oil changes, expired registrations, worn tires — small neglect becomes massive, avoidable bills.'],['🌍','Language Barrier','Hundreds of millions of drivers worldwide cannot communicate properly with their mechanic. No app has solved this — until now.']].map(([icon,title,desc])=>(
              <div key={title} className="card-hover" style={{background:'#080808',border:'1px solid rgba(255,255,255,0.06)',borderRadius:4,padding:'18px 22px',display:'flex',alignItems:'flex-start',gap:14,transition:'all .3s'}}>
                <div style={{fontSize:'1.5rem',flexShrink:0}}>{icon}</div>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.95rem',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:4}}>{title}</div>
                  <div style={{fontSize:'.8rem',color:'#888',lineHeight:1.6}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',background:'#080808'}}>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>How It Works</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:60,textAlign:'center'}}>AS SIMPLE AS<br/><span style={{color:'rgba(255,255,255,0.25)'}}>1 — 2 — 3 — 4</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:24,position:'relative'}}>
          <div style={{position:'absolute',top:36,left:'12%',right:'12%',height:1,background:'linear-gradient(90deg,transparent,rgba(232,35,42,0.4),transparent)'}}/>
          {[['1','Describe Your Problem','Type what is wrong, snap a photo of your warning light, or speak in your language. MECHA understands it all.'],['2','Get AI Diagnosis','Instant plain-language explanation of exactly what is wrong, how serious it is, and what you should do next.'],['3','Know the Fair Price','See real repair cost data for your city. Walk in knowing exactly what is fair and what is a rip-off.'],['4','Find a Trusted Shop','Book with a MECHA-verified honest mechanic near you. Real reviews from real drivers in your language.']].map(([n,t,d])=>(
            <div key={n} style={{padding:'0 20px',textAlign:'center',position:'relative',zIndex:1}}>
              <div style={{width:72,height:72,borderRadius:'50%',background:'#080808',border:`2px solid ${R}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',fontFamily:"'Bebas Neue'",fontSize:'1.8rem',color:R}}>{n}</div>
              <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.95rem',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:10}}>{t}</div>
              <div style={{fontSize:'.82rem',color:'#888',lineHeight:1.7}}>{d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DEMO SECTION */}
      <div style={{background:'#111',padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(232,35,42,0.5),transparent)'}}/>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>See It In Action</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:32,textAlign:"center"}}>REAL PROBLEMS.<br/><span style={{color:'rgba(255,255,255,0.25)'}}>INSTANT ANSWERS.</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16}}>
          <div style={{borderRadius:4,overflow:'hidden'}}>
            <div style={{aspectRatio:'16/9',background:'#1a1a1a',display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:'85%',maxWidth:460,background:'#0a0a0a',borderRadius:12,border:'1px solid rgba(255,255,255,0.06)',padding:18}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:'1rem',letterSpacing:4,color:R}}>MECHA</div>
                  <div style={{marginLeft:'auto',background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e',fontSize:'.6rem',fontWeight:600,letterSpacing:1.5,padding:'3px 10px',borderRadius:100,textTransform:'uppercase'}}>● Live AI</div>
                </div>
                <div className="dash-alert-anim" style={{background:'rgba(232,35,42,0.08)',border:'1px solid rgba(232,35,42,0.25)',borderRadius:8,padding:'10px 12px',marginBottom:10,display:'flex',gap:10}}>
                  <span style={{fontSize:'1.1rem'}}>⚠️</span>
                  <div>
                    <div style={{fontSize:'.75rem',fontWeight:700,color:R,marginBottom:3}}>Check Engine — Code P0420</div>
                    <div style={{fontSize:'.68rem',color:'#aaa',lineHeight:1.5}}>2019 Toyota Camry · Catalyst System Below Threshold</div>
                  </div>
                </div>
                <div style={{background:'#1a1a1a',borderRadius:8,padding:'10px 12px',marginBottom:10,borderLeft:`2px solid ${R}`}}>
                  <div style={{fontSize:'.58rem',letterSpacing:2,textTransform:'uppercase',color:R,fontWeight:700,marginBottom:6}}>⚡ MECHA AI</div>
                  <div style={{fontSize:'.7rem',color:'#ccc',lineHeight:1.6}}>{aiText}<span className="typing-cursor"/></div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {[['Fair Price','$350','#22c55e'],['Their Quote','$890',R],['You Save','$540','#22c55e']].map(([l,v,c])=>(
                    <div key={l} style={{flex:1,background:'#1a1a1a',borderRadius:6,padding:'8px 10px',border:'1px solid rgba(255,255,255,0.05)'}}>
                      <div style={{fontSize:'.58rem',color:'#888',textTransform:'uppercase',letterSpacing:1,marginBottom:3}}>{l}</div>
                      <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.2rem',color:c}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{padding:'12px 18px',background:'#1a1a1a',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontFamily:"'Barlow Condensed'",fontSize:'.88rem',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>AI Diagnosis in 30 Seconds</span>
              <span style={{fontSize:'.72rem',color:'#888'}}>2:14</span>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {[['🔧','Find Honest Mechanics','3:02','#1a0a0a'],['🌍','Any Language','1:48','#0a0f1a'],['📊','Track Car Health','2:30','#0a1a0a']].map(([icon,label,dur,bg])=>(
              <div key={label} style={{flex:1,background:bg,borderRadius:4,minHeight:100,display:'flex',alignItems:'center',justifyContent:'center',position:'relative',flexDirection:'column',gap:6}}>
                <div style={{fontSize:'2rem'}}>{icon}</div>
                <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.82rem',fontWeight:600,textTransform:'uppercase',letterSpacing:1}}>{label}</div>
                <div style={{position:'absolute',top:10,right:10,background:'rgba(255,255,255,0.08)',borderRadius:2,padding:'2px 7px',fontSize:'.62rem',letterSpacing:1,textTransform:'uppercase',color:'#888'}}>{dur}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div id='features' style={{padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',background:'#080808'}}>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>What MECHA Does</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:48,textAlign:'center'}}>EVERYTHING YOUR<br/><span style={{color:'rgba(255,255,255,0.25)'}}>CAR NEEDS.</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:1,background:'rgba(255,255,255,0.05)',borderRadius:4,overflow:'hidden'}}>
          {[['01','🧠','AI Diagnosis','Describe your problem or snap a photo. Get instant plain-language diagnosis. No jargon. No confusion.'],['02','��️','Price Protection','Know the fair market price before any shop visit. Never overpay again. Real-time data from thousands of repairs.'],['03','📋','Car Health Vault','Your complete car history in one place. Oil changes, tires, inspections — all tracked with smart reminders.'],['04','⭐','Mechanic Trust Score','Find verified honest shops near you. Real ratings from real drivers in your language. Book directly.'],['05','🌐','40+ Languages','Spanish, French, Arabic, Mandarin, Portuguese, Creole and more. Built for every driver on earth.'],['06','📱','Mobile + Web','Full iOS and Android app plus a powerful web dashboard. Your car data goes everywhere you go.'],['07','🔔','Smart Alerts','Never miss an oil change, registration renewal, or tire rotation again. MECHA reminds you before it costs you.'],['08','🚗','Multi-Vehicle','Manage your whole family cars in one account. Every vehicle tracked, every reminder set, every repair logged.']].map(([num,icon,title,desc])=>(
            <div key={num} className="feature-card-wrap" style={{background:'#111',padding:'20px 16px',position:'relative',overflow:'hidden',transition:'background .3s'}}>
              <div className="feature-line" style={{position:'absolute',top:0,left:0,right:0,height:2}}/>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'3.5rem',color:'rgba(255,255,255,0.15)',lineHeight:1,marginBottom:10}}>{num}</div>
              <div style={{fontSize:'1.6rem',marginBottom:14}}>{icon}</div>
              <div style={{fontFamily:"'Barlow Condensed'",fontSize:'1rem',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:8}}>{title}</div>
              <div style={{fontSize:'.8rem',color:'#888',lineHeight:1.7}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS BAND */}
      <div style={{background:R,padding:'clamp(32px,6vw,60px) clamp(16px,5vw,48px)'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:24,textAlign:'center'}}>
          {[['$2.7T','Combined auto market opportunity by 2035'],['280M+','Registered vehicles in the US'],['$781B','Global auto repair market 2026'],['40+','Languages at launch']].map(([n,l])=>(
            <div key={l}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(3rem,6vw,4.5rem)',letterSpacing:2,lineHeight:1,marginBottom:8}}>{n}</div>
              <div style={{fontSize:'.72rem',letterSpacing:2,textTransform:'uppercase',color:'rgba(255,255,255,0.75)'}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* LANGUAGES */}
      <div style={{padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',background:'#080808',overflow:'hidden'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:32,alignItems:'center',marginBottom:52}}>
          <div>
            <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>Global By Design</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:20,textAlign:'center'}}>BUILT FOR THE<br/><span style={{color:'rgba(255,255,255,0.25)'}}>WHOLE WORLD.</span></div>
            <p style={{fontSize:'.95rem',color:'#888',lineHeight:1.8,textAlign:'center'}}>Every other car app was built for English-speaking Americans only. <strong style={{color:'#fff'}}>MECHA was built for every driver on earth.</strong> Whether you speak Spanish, Arabic, Creole, or Mandarin — MECHA speaks your language perfectly.</p>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(3rem,8vw,6rem)',lineHeight:1,color:R}}>40+</div>
            <div style={{fontSize:'.95rem',color:'#888',marginTop:8}}>Languages at launch</div>
          </div>
        </div>
        <div style={{overflow:'hidden',position:'relative',marginBottom:12}}>
          <div style={{position:'absolute',top:0,bottom:0,left:0,width:100,zIndex:2,background:'linear-gradient(90deg,#080808,transparent)'}}/>
          <div style={{position:'absolute',top:0,bottom:0,right:0,width:100,zIndex:2,background:'linear-gradient(-90deg,#080808,transparent)'}}/>
          <div className="lang-track1">
            {[...LANGS1,...LANGS1].map((l,i)=>(
              <div key={i} style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.06)',borderRadius:100,padding:'10px 18px',display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',flexShrink:0}}>
                <span style={{fontSize:'1rem'}}>{l.f}</span>
                <span style={{fontFamily:"'Barlow Condensed'",fontSize:'.82rem',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{l.n}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{overflow:'hidden',position:'relative'}}>
          <div style={{position:'absolute',top:0,bottom:0,left:0,width:100,zIndex:2,background:'linear-gradient(90deg,#080808,transparent)'}}/>
          <div style={{position:'absolute',top:0,bottom:0,right:0,width:100,zIndex:2,background:'linear-gradient(-90deg,#080808,transparent)'}}/>
          <div className="lang-track2">
            {[...LANGS2,...LANGS2].map((l,i)=>(
              <div key={i} style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.06)',borderRadius:100,padding:'10px 18px',display:'flex',alignItems:'center',gap:8,whiteSpace:'nowrap',flexShrink:0}}>
                <span style={{fontSize:'1rem'}}>{l.f}</span>
                <span style={{fontFamily:"'Barlow Condensed'",fontSize:'.82rem',fontWeight:600,letterSpacing:1,textTransform:'uppercase'}}>{l.n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PHOTOS */}
      <div style={{padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',background:'#080808',position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(232,35,42,0.5),transparent)'}}/>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>Real Cars. Real Fixes.</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:32,textAlign:'center'}}>SEE MECHA<br/><span style={{color:'rgba(255,255,255,0.25)'}}>IN ACTION.</span></div>
        <div style={{borderRadius:8,overflow:'hidden',marginBottom:12,position:'relative',cursor:'pointer'}}>
          <img src="https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1200&q=80" alt="Mechanic with MECHA app" style={{width:'100%',maxHeight:520,objectFit:'cover',display:'block'}} loading="lazy"/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.7),transparent)'}}/>
          <div style={{position:'absolute',bottom:24,left:28,right:28}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(1.6rem,4vw,2.4rem)',letterSpacing:3,marginBottom:6}}>AI Diagnosis — From Dashboard to Answer in 30 Seconds</div>
            <div style={{fontSize:'.85rem',color:'rgba(255,255,255,0.7)',lineHeight:1.6}}>A real driver snaps a photo. MECHA identifies the issue, gives the fair price, finds honest mechanics nearby.</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:8,marginBottom:8}}>
          {[
            ['https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=600&q=80','Check Engine Light'],
            ['https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=600&q=80','Under the Hood'],
            ['https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600&q=80','Trusted Shops'],
            ['https://images.unsplash.com/photo-1615906655593-ad0386982a0f?w=600&q=80','On the Go'],
            ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80','Parts Identified'],
            ['https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=600&q=80','Every Language'],
          ].map(([src,label])=>(
            <div key={label} style={{position:'relative',aspectRatio:'4/3',borderRadius:6,overflow:'hidden',cursor:'pointer'}}>
              <img src={src} alt={label} style={{width:'100%',height:'100%',objectFit:'cover',transition:'transform .4s',display:'block'}} loading="lazy"/>
              <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,0)'}}/>
              <div style={{position:'absolute',bottom:10,left:12,fontFamily:"'Barlow Condensed'",fontSize:'.78rem',fontWeight:700,letterSpacing:1.5,textTransform:'uppercase'}}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr',gap:8}}>
          {[
            ['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80','Any Vehicle','Works on Every Make & Model'],
            ['https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&q=80','6 Retailers','Buy Parts at the Best Price'],
          ].map(([src,tag,title])=>(
            <div key={title} style={{position:'relative',borderRadius:6,overflow:'hidden',cursor:'pointer'}}>
              <img src={src} alt={title} style={{width:'100%',height:220,objectFit:'cover',display:'block',transition:'transform .4s'}} loading="lazy"/>
              <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(0,0,0,0.6),transparent 60%)'}}/>
              <div style={{position:'absolute',bottom:14,left:16,right:16}}>
                <div style={{fontSize:'.6rem',letterSpacing:2,textTransform:'uppercase',color:R,fontWeight:700,marginBottom:5}}>{tag}</div>
                <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.95rem',fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>{title}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TESTIMONIALS */}
      <div style={{background:'#111',padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(232,35,42,0.5),transparent)'}}/>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>Real Drivers</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:48,textAlign:'center'}}>WHAT BETA USERS<br/><span style={{color:'rgba(255,255,255,0.25)'}}>ARE SAYING.</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
          {[
            ['Marcus T.','Atlanta, GA · Toyota Camry','👨','My mechanic quoted me $1,100. MECHA said the fair price was $380. I walked in with that data and he dropped to $400. Paid for a whole year of MECHA in one visit.'],
            ['Maria G.','Miami, FL · Honda CR-V','👩','As someone who does not speak English as a first language, I always felt mechanics took advantage of me. MECHA gave me the confidence to walk in knowing the facts.'],
            ['James R.','Dallas, TX · Ford F-150','👨','Check engine light came on during a road trip. MECHA told me it was a loose gas cap — not an emergency. Saved me from an $800 tow and unnecessary shop visit.'],
            ['David K.','Chicago, IL · Fleet Manager','👨‍💼','I run a fleet of 12 delivery vehicles. MECHA saved us over $18,000 last year in maintenance and surprise repairs. The alerts alone are worth every single penny.'],
            ['Priya S.','Houston, TX · Hyundai Tucson','👩','Finally an app that does not treat me like I know nothing about cars. Perfect balance. My whole family uses it now.'],
            ['Jean-Pierre M.','Montreal, QC · Subaru Outback','👨','J utilisais MECHA en français. Incroyable d avoir un outil comme ça dans ma langue natale. Enfin quelque chose fait vraiment pour nous!'],
          ].map(([name,info,av,quote])=>(
            <div key={name} className="card-hover" style={{background:'#111',border:'1px solid rgba(255,255,255,0.08)',borderRadius:8,padding:'24px 20px',transition:'all .3s',textAlign:'center'}}>
              <div style={{color:R,fontSize:'1.1rem',letterSpacing:4,marginBottom:12,textAlign:'center'}}>★★★★★</div>
              <div style={{fontSize:'.9rem',color:'#ddd',lineHeight:1.8,marginBottom:16,fontStyle:'italic',textAlign:'center'}}>"{quote}"</div>
              <div style={{height:1,background:'rgba(255,255,255,0.06)',marginBottom:18}}/>
              <div style={{display:'flex',alignItems:'center',gap:12,justifyContent:'center'}}>
                <div style={{width:38,height:38,borderRadius:'50%',background:'#1a1a1a',border:'2px solid rgba(232,35,42,0.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1rem'}}>{av}</div>
                <div>
                  <div style={{fontWeight:700,fontSize:'.85rem',marginBottom:2}}>{name}</div>
                  <div style={{fontSize:'.72rem',color:'#888'}}>{info}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOR SHOPS */}
      <div style={{padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',background:'#080808'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:40,alignItems:'start'}}>
          <div>
            <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14}}>For Repair Shops</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:28}}>WIN MORE<br/><span style={{color:'rgba(255,255,255,0.25)'}}>CUSTOMERS.</span></div>
            <p style={{fontSize:'.95rem',color:'#888',lineHeight:1.8,marginBottom:28}}>MECHA sends you <strong style={{color:'#fff'}}>pre-qualified leads</strong> — drivers who already know what is wrong with their car and are looking for an honest mechanic.</p>
            {[['🏅','Verified Honest Shop Badge','Earn MECHA trust certification. Drivers actively search for verified shops. Stand out from every competitor.'],['🌐','Multilingual Customer Chat','Communicate with any customer in their language through AI-powered translation. Never lose a customer to a language barrier.'],['📸','Digital Inspection Reports','Send photo and video proof of issues to customers. Builds trust and increases repair approval rates by up to 49%.'],['📅','Direct Appointment Booking','Customers book directly through MECHA. No phone tag, no missed calls, no empty service bays.']].map(([icon,title,desc])=>(
              <div key={title} style={{display:'flex',alignItems:'flex-start',gap:14,marginBottom:18}}>
                <div style={{width:42,height:42,background:'rgba(232,35,42,0.1)',border:'1px solid rgba(232,35,42,0.2)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'1.1rem',flexShrink:0}}>{icon}</div>
                <div>
                  <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.92rem',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:3}}>{title}</div>
                  <div style={{fontSize:'.8rem',color:'#888',lineHeight:1.6}}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{background:'#1a1a1a',borderRadius:12,border:'1px solid rgba(255,255,255,0.07)',padding:22,boxShadow:'0 40px 80px rgba(0,0,0,0.5)'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'1rem',letterSpacing:3}}>Mikes Auto · Dashboard</div>
              <div style={{background:'rgba(34,197,94,0.15)',border:'1px solid rgba(34,197,94,0.3)',color:'#22c55e',fontSize:'.62rem',fontWeight:700,letterSpacing:1.5,padding:'3px 10px',borderRadius:100,textTransform:'uppercase'}}>✓ Verified Shop</div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
              {[['4.9','#22c55e','Trust Score'],['127','#fff','This Month'],['+34%','#22c55e','Revenue']].map(([v,c,l])=>(
                <div key={l} style={{background:'#080808',borderRadius:8,padding:11,border:'1px solid rgba(255,255,255,0.04)'}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.7rem',lineHeight:1,marginBottom:2,color:c}}>{v}</div>
                  <div style={{fontSize:'.58rem',color:'#888',textTransform:'uppercase',letterSpacing:1}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:'.62rem',color:'#888',letterSpacing:1.5,textTransform:'uppercase',marginBottom:10}}>Latest Reviews</div>
            {[['👩','Maria G.','ES'],['👨','Marcus T.','EN'],['👨','Jean-Pierre M.','FR'],['👩','Priya S.','HI']].map(([av,name,lang])=>(
              <div key={name} style={{display:'flex',alignItems:'center',gap:10,padding:'9px 0',borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                <span style={{fontSize:'1.1rem'}}>{av}</span>
                <span style={{fontSize:'.78rem',fontWeight:600,flex:1}}>{name}</span>
                <span style={{color:R,fontSize:'.72rem',letterSpacing:1}}>★★★★★</span>
                <span style={{fontSize:'.62rem',color:'#888',background:'rgba(255,255,255,0.05)',padding:'2px 7px',borderRadius:100}}>{lang}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div id='pricing' style={{background:'#111',padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(232,35,42,0.5),transparent)'}}/>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>Simple Pricing</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:48,textAlign:'center'}}>START FREE.<br/><span style={{color:'rgba(255,255,255,0.25)'}}>SCALE WHEN READY.</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
          {[
            {tier:'For Drivers',name:'Basic',price:'0',period:'Free forever',feats:['5 AI diagnoses per month','Basic price checker','1 vehicle tracked','English + French','Community mechanic reviews'],cta:'Get Started Free',featured:false},
            {tier:'For Drivers',name:'Pro',price:'9.99',period:'per month — cancel anytime',feats:['Unlimited AI diagnoses','Full price protection','Up to 5 vehicles','All 40+ languages','Mechanic trust scores','Smart maintenance alerts','Service history export','Priority support'],cta:'Join Waitlist',featured:true},
            {tier:'For Shops',name:'Business',price:'149',period:'per month per location',feats:['Verified Honest Shop badge','Multilingual customer chat','Digital inspection reports','Direct appointment booking','Featured in search results','Analytics dashboard','Unlimited staff accounts','Dedicated account manager'],cta:'List Your Shop',featured:false},
          ].map(({tier,name,price,period,feats,cta,featured})=>(
            <div key={name} style={{background:featured?'linear-gradient(135deg,rgba(232,35,42,0.08),#0a0a0a)':'#111',border:featured?`2px solid ${R}`:`1px solid rgba(255,255,255,0.08)`,borderRadius:8,padding:'28px 20px',position:'relative',overflow:'hidden',transition:'all .3s',textAlign:'center'}}>
              {featured&&<div style={{position:'absolute',top:0,right:28,background:R,fontSize:'.62rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',padding:'5px 12px',borderRadius:'0 0 6px 6px'}}>Most Popular</div>}
              <div style={{fontSize:'.68rem',letterSpacing:3,textTransform:'uppercase',color:'#888',marginBottom:7}}>{tier}</div>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.5rem',letterSpacing:2,marginBottom:22}}>{name}</div>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'2.5rem',letterSpacing:2,lineHeight:1.1}}><span style={{fontSize:'1.1rem',color:'#888',verticalAlign:'super'}}>$</span>{price}</div>
              <div style={{fontSize:'.78rem',color:'#888',marginTop:4,marginBottom:0}}>{period}</div>
              <div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'16px 0'}}/>
              <ul style={{listStyle:'none',marginBottom:0}}>
                {feats.map(f=><li key={f} style={{fontSize:'.82rem',color:'#ccc',padding:'6px 0',display:'flex',alignItems:'center',gap:9,justifyContent:'center'}}><span style={{color:R,fontSize:'.72rem'}}>→</span>{f}</li>)}
              </ul>
              <a href="#waitlist" onClick={e=>{e.preventDefault();navigate('/register');}} style={{display:'block',textAlign:'center',marginTop:28,padding:13,border:featured?'none':'1px solid rgba(255,255,255,0.12)',borderRadius:2,fontFamily:"'Barlow Condensed'",fontSize:'.82rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#fff',textDecoration:'none',background:featured?R:'transparent'}}>{cta}</a>
            </div>
          ))}
        </div>
        <p style={{textAlign:'center',marginTop:28,fontSize:'.82rem',color:'#888'}}>Early access members get <strong style={{color:'#fff'}}>3 months free Pro</strong> + lifetime pricing lock. No credit card required to join.</p>
      </div>

      {/* COMPARE */}
      <div style={{padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',background:'#080808'}}>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>One Platform vs Many</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:48,textAlign:'center'}}>MECHA DOES IT<br/><span style={{color:'rgba(255,255,255,0.25)'}}>ALL IN ONE.</span></div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                {['Feature','MECHA','CarGurus','RepairPal','Carfax','AutoTrader'].map((h,i)=>(
                  <th key={h} style={{padding:'14px 18px',fontFamily:"'Barlow Condensed'",fontSize:'.82rem',fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',borderBottom:'1px solid rgba(255,255,255,0.08)',textAlign:i===0?'left':'center',color:i===1?R:'#888'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ['AI Car Diagnosis',[1,0,0,0,0]],
                ['Fair Repair Price Data',[1,0,1,0,0]],
                ['Buy & Sell Cars',[1,1,0,'h',1]],
                ['Dealership Advertising',[1,1,0,0,1]],
                ['Verified Mechanic Network',[1,0,'p',0,0]],
                ['Parts Marketplace (6 stores)',[1,0,0,0,0]],
                ['40+ Languages',[1,0,0,0,0]],
                ['Car Health Vault',[1,0,0,'p',0]],
                ['Free Tier Available',[1,1,1,0,0]],
              ].map(([feat,vals])=>(
                <tr key={feat} style={{borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                  <td style={{padding:'13px 18px',fontSize:'.83rem',color:'#fff'}}>{feat}</td>
                  {vals.map((v,i)=>(
                    <td key={i} style={{padding:'13px 18px',textAlign:'center'}}>
                      {v===1?<span style={{color:'#22c55e',fontSize:'1.1rem'}}>✓</span>:v===0?<span style={{color:'#555',fontSize:'1.1rem'}}>✗</span>:<span style={{color:'#f59e0b',fontSize:'.78rem'}}>Partial</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div id='faq' style={{background:'#111',padding:'clamp(40px,8vw,100px) clamp(16px,5vw,48px)',position:'relative'}}>
        <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'linear-gradient(90deg,transparent,rgba(232,35,42,0.5),transparent)'}}/>
        <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,fontWeight:600,marginBottom:14,textAlign:'center'}}>FAQ</div>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.4rem,5vw,4rem)',letterSpacing:2,marginBottom:48,textAlign:'center'}}>GOT QUESTIONS?<br/><span style={{color:'rgba(255,255,255,0.25)'}}>WE GOT ANSWERS.</span></div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:14}}>
          {[
            ['Do I need to know anything about cars?','Not at all. MECHA was designed for people who know nothing about cars. Everything is explained in plain, simple language.'],
            ['How does the AI diagnosis work?','You describe your problem or upload a photo. MECHA analyzes your car model, year, and symptoms to give you an accurate diagnosis in seconds.'],
            ['How accurate is the repair price data?','Very accurate. Our prices come from real repair data updated regularly across thousands of shops in your city.'],
            ['What languages does MECHA support?','MECHA launches with 40+ languages including English, Spanish, French, Portuguese, Arabic, Mandarin, Hindi, Haitian Creole, and more.'],
            ['Can I track multiple cars?','Yes! Free plan supports 1 vehicle. Pro supports up to 5. Enterprise plans for fleets support unlimited vehicles.'],
            ['How do shops get verified?','Shops apply and go through our verification process. Only shops meeting our transparency standards earn the Verified badge.'],
            ['Is my data private and secure?','100%. Your car data is encrypted, stored securely, and never sold to third parties. You own your data.'],
            ['When does MECHA officially launch?','We are in private beta. Join the waitlist to get early access — first 1,000 users get 3 months of Pro completely free.'],
          ].map(([q,a])=>(
            <div key={q} className="card-hover" style={{background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.05)',borderRadius:4,padding:'26px 24px',transition:'all .3s'}}>
              <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.98rem',fontWeight:700,letterSpacing:'.5px',textTransform:'uppercase',marginBottom:10,display:'flex',gap:10}}>
                <span style={{color:R,fontSize:'.75rem',marginTop:3,flexShrink:0}}>Q</span>{q}
              </div>
              <div style={{fontSize:'.83rem',color:'#888',lineHeight:1.8}}>{a}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WAITLIST */}
      <div id='towing' style={{padding:'clamp(50px,10vw,120px) clamp(16px,5vw,48px)',textAlign:'center',position:'relative',background:'#080808'}}>
        <div style={{position:'absolute',inset:0,background:'radial-gradient(ellipse 60% 80% at 50% 50%,rgba(232,35,42,0.08),transparent 70%)'}}/>
        <div style={{position:'relative',zIndex:1}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(3rem,8vw,7rem)',letterSpacing:4,lineHeight:1,marginBottom:18}}>JOIN THE<br/><span style={{color:R}}>WAITLIST.</span></div>
          <p style={{fontSize:'1rem',color:'#888',maxWidth:500,margin:'0 auto 44px',lineHeight:1.7}}>Be first when we launch. Early members get 3 months free Pro + lifetime pricing lock. No credit card needed.</p>
          {joined?(
            <div style={{fontSize:'1.2rem',color:'#22c55e',fontFamily:"'Bebas Neue'",letterSpacing:3}}>✓ YOU ARE ON THE LIST! WE WILL BE IN TOUCH.</div>
          ):(
            <div style={{display:'flex',maxWidth:500,margin:'0 auto'}}>
              <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="your@email.com" type="email" style={{flex:1,background:'#1a1a1a',border:'1px solid rgba(255,255,255,0.1)',borderRight:'none',borderRadius:'2px 0 0 2px',padding:'16px 18px',color:'#fff',fontFamily:"'Barlow'",fontSize:'.88rem',outline:'none'}}/>
              <button onClick={handleWaitlist} style={{background:R,color:'#fff',border:'none',padding:'16px 26px',fontFamily:"'Barlow Condensed'",fontSize:'.88rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',borderRadius:'0 2px 2px 0',cursor:'pointer'}}>Get Early Access</button>
            </div>
          )}
          <p style={{fontSize:'.72rem',color:'#888',marginTop:12}}>No spam. No credit card. Just early access.</p>
          <div style={{display:'flex',justifyContent:'center',gap:28,marginTop:36,flexWrap:'wrap'}}>
            {['3 months Pro free','Lifetime pricing lock','Shape the product','First to launch'].map(p=>(
              <div key={p} style={{display:'flex',alignItems:'center',gap:7,fontSize:'.8rem',color:'#888'}}><span style={{color:R,fontWeight:700}}>✓</span>{p}</div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{padding:'clamp(24px,5vw,48px)',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:32,marginBottom:44}}>
          <div>
            <div onClick={()=>navigate('/')} style={{fontFamily:"'Bebas Neue'",fontSize:'2rem',letterSpacing:6,marginBottom:14,cursor:'pointer'}}>MECH<span style={{color:R}}>A</span></div>
            <p style={{fontSize:'.8rem',color:'#888',lineHeight:1.7,maxWidth:250}}>The worlds first automotive super-platform — AI diagnosis, price protection, dealership marketplace, mechanic finder, parts shopping, and on-demand towing. Built for every driver on earth in 40+ languages.</p>
          </div>
          {[['Product',['AI Diagnosis','Price Protection','Car Health Vault','Mechanic Finder','Car Marketplace','Mobile App']],['For Business',['List Your Shop','Dealership Plans','Towing Network','Advertise','Get Verified']],['Company',['About MECHA','Blog','Press','Privacy Policy','Terms of Service']]].map(([title,links])=>(
            <div key={title}>
              <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.78rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#fff',marginBottom:14}}>{title}</div>
              <ul style={{listStyle:'none'}}>
                {links.map(l=><li key={l} style={{marginBottom:9}}><span onClick={()=>{
  if(l==='AI Diagnosis'||l==='Price Protection'||l==='Car Health Vault'||l==='Mechanic Finder'||l==='Mobile App')navigate('/register');
  else if(l==='Car Marketplace')navigate('/register');
  else if(l==='List Your Shop')navigate('/shop/register');
  else if(l==='Dealership Plans')navigate('/shop/register');
  else if(l==='Towing Network'||l==='Towing')navigate('/towing/register');
  else if(l==='About MECHA')navigate('/about');
  else if(l==='Privacy Policy')navigate('/privacy');
  else if(l==='Terms of Service')navigate('/terms');
  else if(l==='Blog'||l==='Press')navigate('/contact');
  else if(l==='Contact'||l==='Advertise')navigate('/contact');
  else if(l==='Advertise')navigate('/shop/register');
  else if(l==='Get Verified')navigate('/shop/register');
  else navigate('/register');
}} style={{fontSize:'.8rem',color:'#888',cursor:'pointer',transition:'color .2s'}} onMouseEnter={e=>e.target.style.color='#fff'} onMouseLeave={e=>e.target.style.color='#888'}>{l}</span></li>)}
              </ul>
            </div>
          ))}
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:22,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{fontSize:'.72rem',color:'#888'}}>© 2026 MECHA Technologies, Inc. All rights reserved.</div>
          <div style={{display:'flex',gap:10}}>
            {['𝕏','in','▶','📷'].map(s=>(
              <div key={s} style={{width:32,height:32,border:'1px solid rgba(255,255,255,0.08)',borderRadius:4,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.85rem',color:'#888',cursor:'pointer'}}>{s}</div>
            ))}
          </div>
          <div style={{fontSize:'.72rem',color:'#888'}}>Available in 40+ languages worldwide</div>
        </div>
      </footer>
    </div>
  );
}
