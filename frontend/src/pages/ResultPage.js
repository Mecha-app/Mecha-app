import{useState}from'react';
import{useNavigate}from'react-router-dom';
import{Label,Btn,Card,TopBar,PAGE,R}from'../components/UI';
const RETAILERS=[
  {name:'Amazon',color:'#FF9900',textColor:'#111',icon:'📦',url:p=>`https://www.amazon.com/s?k=${encodeURIComponent(p)}&tag=mecha-app-20`},
  {name:'eBay',color:'#0064D2',textColor:'#fff',icon:'🏷',url:p=>`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(p)}`},
  {name:'RockAuto',color:'#c0392b',textColor:'#fff',icon:'🪨',url:p=>`https://www.rockauto.com/en/partsearch/?query=${encodeURIComponent(p)}`},
  {name:'AutoZone',color:'#f97316',textColor:'#fff',icon:'🔧',url:p=>`https://www.autozone.com/searchresult?searchText=${encodeURIComponent(p)}`},
  {name:'Advance Auto',color:'#dc2626',textColor:'#fff',icon:'⚙',url:p=>`https://shop.advanceautoparts.com/find/search.htm?searchTerm=${encodeURIComponent(p)}`},
  {name:"O'Reilly",color:'#1d4ed8',textColor:'#fff',icon:'🛠',url:p=>`https://www.oreillyauto.com/shop/b/search?q=${encodeURIComponent(p)}`},
];
const sevColor=s=>({low:'#22c55e',medium:'#f59e0b',high:'#f97316',critical:R}[s]||'#888');
const sevLabel=s=>({low:'Low — Monitor It',medium:'Moderate — Fix Soon',high:'High — Fix ASAP',critical:'CRITICAL — Stop Driving'}[s]||s);
export default function ResultPage(){
  const navigate=useNavigate();
  const result=JSON.parse(sessionStorage.getItem('mechaDiagnosis')||'null');
  const[openPart,setOpenPart]=useState(null);
  if(!result)return(<div style={{...PAGE,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{textAlign:'center'}}><div style={{fontSize:40,marginBottom:16}}>⚠️</div><div style={{color:'#888',marginBottom:20}}>No diagnosis found.</div><Btn onClick={()=>navigate('/diagnose')} style={{maxWidth:200,margin:'0 auto'}}>Run Diagnosis</Btn></div></div>);
  const sc=sevColor(result.severity);
  return(
    <div style={PAGE}>
      <TopBar onBack={()=>navigate('/diagnose')} title="Diagnosis Report" right={<span style={{fontSize:11,color:R,cursor:'pointer'}} onClick={()=>navigate('/dashboard')}>Dashboard</span>}/>
      <div style={{padding:20,maxWidth:600,margin:'0 auto'}}>
        <div style={{background:sc,borderRadius:8,padding:'16px 20px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div><div style={{fontSize:9,letterSpacing:2,textTransform:'uppercase',opacity:0.8,marginBottom:3}}>Severity</div><div style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:2}}>{sevLabel(result.severity)}</div></div>
          <div style={{textAlign:'right'}}><div style={{fontSize:9,letterSpacing:2,textTransform:'uppercase',opacity:0.8,marginBottom:3}}>Safe to Drive?</div><div style={{fontFamily:"'Bebas Neue'",fontSize:20}}>{result.canDrive?'YES':'STOP'}</div></div>
        </div>
        <Card style={{marginBottom:14}}><Label>AI Diagnosis</Label><div style={{fontSize:14,lineHeight:1.8,color:'#ddd'}}>{result.diagnosis}</div></Card>
        <Card style={{marginBottom:14}}>
          <Label>Cost Estimate</Label>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <div style={{background:'#080808',borderRadius:8,padding:14,border:'1px solid #1a1a1a'}}><div style={{fontSize:9,color:'#555',letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Total Repair</div><div style={{fontFamily:"'Bebas Neue'",fontSize:24,color:'#22c55e'}}>${result.estimatedCost?.min}-${result.estimatedCost?.max}</div></div>
            <div style={{background:'#080808',borderRadius:8,padding:14,border:'1px solid #1a1a1a'}}><div style={{fontSize:9,color:'#555',letterSpacing:1.5,textTransform:'uppercase',marginBottom:4}}>Labor Time</div><div style={{fontFamily:"'Bebas Neue'",fontSize:24,color:'#f59e0b'}}>{result.laborHours?.min}-{result.laborHours?.max}h</div></div>
          </div>
        </Card>
        {result.parts?.length>0&&(<Card style={{marginBottom:14}}>
          <Label>Parts You Need</Label>
          <div style={{fontSize:11,color:'#444',marginBottom:12}}>Tap Shop This Part to buy from 6 retailers.</div>
          {result.parts.map((part,i)=>(<div key={i} style={{marginBottom:16,paddingBottom:16,borderBottom:i<result.parts.length-1?'1px solid #1e1e1e':'none'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8,gap:8}}>
              <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14,marginBottom:2}}>{part.name}</div>{part.description&&<div style={{fontSize:11,color:'#555',lineHeight:1.5}}>{part.description}</div>}</div>
              <div style={{textAlign:'right',flexShrink:0}}><div style={{fontFamily:"'Bebas Neue'",fontSize:20,color:'#22c55e'}}>${part.estimatedPrice?.min}-${part.estimatedPrice?.max}</div><div style={{fontSize:9,letterSpacing:1.5,textTransform:'uppercase',fontWeight:700,color:part.priority==='required'?R:part.priority==='recommended'?'#f59e0b':'#555'}}>{part.priority}</div></div>
            </div>
            <div onClick={()=>setOpenPart(openPart===i?null:i)} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:4,padding:'8px 14px',textAlign:'center',cursor:'pointer',fontSize:11,letterSpacing:1.5,textTransform:'uppercase',color:'#aaa',marginBottom:openPart===i?10:0}}>{openPart===i?'Hide Retailers':'Shop This Part - 6 Retailers'}</div>
            {openPart===i&&(<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>{RETAILERS.map(r=>(<a key={r.name} href={r.url(part.name)} target="_blank" rel="noopener noreferrer" style={{background:r.color,borderRadius:4,padding:'10px 12px',textDecoration:'none',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}><span style={{fontSize:14}}>{r.icon}</span><span style={{fontSize:11,fontWeight:700,letterSpacing:1,textTransform:'uppercase',color:r.textColor}}>{r.name}</span></a>))}</div>)}
          </div>))}
        </Card>)}
        {result.steps?.length>0&&(<Card style={{marginBottom:14}}><Label>What To Do Next</Label>{result.steps.map((step,i)=>(<div key={i} style={{display:'flex',gap:12,marginBottom:12}}><div style={{width:26,height:26,borderRadius:'50%',background:R,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:"'Bebas Neue'",fontSize:13,flexShrink:0}}>{i+1}</div><div style={{fontSize:13,color:'#ccc',lineHeight:1.7,paddingTop:3}}>{step}</div></div>))}</Card>)}
        {result.mechanicTip&&(<Card style={{marginBottom:14,border:'1px solid rgba(232,35,42,0.3)',background:'rgba(232,35,42,0.05)'}}><Label>MECHA Insider Tip</Label><div style={{fontSize:13,color:'#ddd',lineHeight:1.8,fontStyle:'italic'}}>{result.mechanicTip}</div></Card>)}
        <Card style={{marginBottom:14,textAlign:'center',background:'rgba(232,35,42,0.06)',border:'1px solid rgba(232,35,42,0.2)'}}><div style={{fontSize:28,marginBottom:8}}>🔧</div><div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2,marginBottom:6}}>NEED A MECHANIC?</div><div style={{fontSize:12,color:'#888',marginBottom:14}}>Find MECHA-verified honest shops near you.</div><Btn onClick={()=>navigate('/shops')}>Find Mechanics Near Me</Btn></Card>
        <div style={{display:'flex',gap:10}}><Btn onClick={()=>navigate('/diagnose')} variant="ghost" style={{flex:1}}>New Diagnosis</Btn><Btn onClick={()=>navigate('/dashboard')} variant="secondary" style={{flex:1,background:'#1a1a1a',border:'1px solid #333'}}>Dashboard</Btn></div>
      </div>
    </div>
  );
}