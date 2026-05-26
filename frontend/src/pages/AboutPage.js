import{useNavigate}from'react-router-dom';
const R='#E8232A';
export default function AboutPage(){
  const navigate=useNavigate();
  return(<div style={{minHeight:'100vh',background:'#080808',color:'#fff',fontFamily:"'Barlow',sans-serif"}}>
    <nav style={{background:'#0d0d0d',borderBottom:'1px solid #1e1e1e',padding:'16px 48px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div onClick={()=>navigate('/')} style={{fontFamily:"'Bebas Neue'",fontSize:'1.8rem',letterSpacing:6,cursor:'pointer'}}>MECH<span style={{color:R}}>A</span></div>
      <button onClick={()=>navigate(-1)} style={{background:'transparent',border:'1px solid #333',color:'#888',padding:'8px 16px',borderRadius:4,cursor:'pointer',fontSize:12}}>Back</button>
    </nav>
    <div style={{maxWidth:900,margin:'0 auto',padding:'60px 48px'}}>
      <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,marginBottom:8}}>Our Story</div>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2.5rem,6vw,5rem)',letterSpacing:2,lineHeight:1,marginBottom:24}}>BUILT FOR EVERY<br/><span style={{color:R}}>DRIVER ON EARTH.</span></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:60,marginBottom:60}}>
        <div>
          <p style={{fontSize:'1rem',color:'#ccc',lineHeight:1.9,marginBottom:16}}>MECHA was born from a simple frustration — car repairs are confusing, expensive, and unfair, especially if you do not speak English or do not know anything about cars.</p>
          <p style={{fontSize:'1rem',color:'#ccc',lineHeight:1.9,marginBottom:16}}>The average American overpays $1,400 per year on car repairs simply because they lack the information mechanics have. MECHA changes that.</p>
          <p style={{fontSize:'1rem',color:'#ccc',lineHeight:1.9}}>We built the first automotive super-platform — AI diagnosis, price protection, mechanic finder, parts marketplace, vehicle sales, and towing — in 40+ languages.</p>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:20}}>
          {[['$1,400','Average overpaid per driver per year'],['230M+','Registered vehicles in the US'],['40+','Languages at launch'],['$781B','Global auto repair market']].map(([n,l])=>(
            <div key={l} style={{borderLeft:`3px solid ${R}`,paddingLeft:16}}>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'2.2rem',color:R,lineHeight:1}}>{n}</div>
              <div style={{fontSize:'.8rem',color:'#888',marginTop:4}}>{l}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:40,marginBottom:40}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'2rem',letterSpacing:2,marginBottom:16}}>OUR <span style={{color:R}}>MISSION</span></div>
        <p style={{fontSize:'1.1rem',color:'#ccc',lineHeight:1.9,maxWidth:600}}>To give every driver on earth — regardless of language, income, or mechanical knowledge — the same information and protection that only wealthy, well-connected people used to have.</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
        {[['AI-Powered','Our AI diagnostic engine analyzes your problem and gives a plain-language answer in seconds.'],['40+ Languages','Built from day one for every language on earth. No driver left behind.'],['Price Protection','Real repair cost data so you always know what is fair before walking into any shop.']].map(([title,desc])=>(
          <div key={title} style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:24}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.2rem',letterSpacing:1.5,marginBottom:8,color:R}}>{title}</div>
            <div style={{fontSize:'.85rem',color:'#888',lineHeight:1.7}}>{desc}</div>
          </div>
        ))}
      </div>
    </div>
  </div>);
}
