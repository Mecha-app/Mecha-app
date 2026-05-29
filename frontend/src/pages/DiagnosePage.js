import{useState,useRef,useEffect}from'react';
import{useNavigate}from'react-router-dom';
import{Label,Input,Btn,Card,TopBar,Spinner,PAGE,R}from'../components/UI';
import{saveDiagnosis}from'../utils/api';
import api from'../utils/api';
export default function DiagnosePage(){
  const navigate=useNavigate();
  const vehicle=JSON.parse(sessionStorage.getItem('mechaVehicle')||'null');
  const[problem,setProblem]=useState('');
  const[loading,setLoading]=useState(false);
  const[limitReached,setLimitReached]=useState(false);
  const[diagCount,setDiagCount]=useState(0);
  const[diagLimit,setDiagLimit]=useState(5);
  const[plan,setPlan]=useState('free');

  useEffect(()=>{
    const count=parseInt(localStorage.getItem('mechaCount')||'0');
    const month=localStorage.getItem('mechaCountMonth');
    const nowMonth=String(new Date().getMonth());
    if(month!==nowMonth){
      localStorage.setItem('mechaCount','0');
      localStorage.setItem('mechaCountMonth',nowMonth);
    } else if(count>=5){
      setLimitReached(true);
    }
    setDiagCount(count);
  },[]);
  const fileRef=useRef();
  const[imgB64,setImgB64]=useState(null);
  const[imgPrev,setImgPrev]=useState(null);
  const handleImg=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{setImgPrev(ev.target.result);setImgB64(ev.target.result.split(',')[1]);};r.readAsDataURL(f);};
  const runDx=async()=>{
    if(!vehicle||(!problem&&!imgB64))return;
    setLoading(true);
    try{
      const vd=`${vehicle.year} ${vehicle.make} ${vehicle.model}`;
      const prompt=`You are MECHA AI, an expert automotive diagnostic assistant. Vehicle: ${vd}. Problem reported: "${problem||'analyze the vehicle issue'}". Respond ONLY with a valid JSON object, no markdown, no explanation: {"diagnosis":"plain English 2-3 sentences explaining what is wrong","severity":"low","canDrive":true,"estimatedCost":{"min":100,"max":300},"laborHours":{"min":1,"max":2},"parts":[{"name":"Part Name","estimatedPrice":{"min":50,"max":150},"priority":"required","description":"one sentence"}],"steps":["step 1","step 2"],"mechanicTip":"one insider tip"}`;
      const res=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'x-api-key':process.env.REACT_APP_ANTHROPIC_API_KEY,
          'anthropic-version':'2023-06-01',
          'anthropic-dangerous-direct-browser-access':'true'
        },
        body:JSON.stringify({
          model:'claude-haiku-4-5',
          max_tokens:1000,
          messages:[{role:'user',content:prompt}]
        })
      });
      const data=await res.json();
      if(data.error){throw new Error(data.error.message);}
      const text=data.content?.[0]?.text||'{}';
      const clean=text.replace(/```json|```/g,'').trim();
      const result=JSON.parse(clean);
      sessionStorage.setItem('mechaDiagnosis',JSON.stringify(result));
      try{await saveDiagnosis({vehicleId:vehicle._id,problemText:problem,aiResult:result});}catch{}
      const newCount=(parseInt(localStorage.getItem('mechaCount')||'0'))+1;
      localStorage.setItem('mechaCount',String(newCount));
      localStorage.setItem('mechaCountMonth',String(new Date().getMonth()));
      const user=JSON.parse(localStorage.getItem('mechaUser')||'{}');
      const uid=user._id||user.id;
      if(uid){localStorage.setItem('mechaCount_'+uid,String(newCount));localStorage.setItem('mechaCountMonth_'+uid,String(new Date().getMonth()));}
      navigate('/result',{state:{diagnosis:result,vehicle}});
    }catch(e){
      console.error('Diagnosis error:',e);
      alert('Diagnosis failed: '+e.message);
    }
    finally{setLoading(false);}
  };
  if(loading)if(limitReached)return(
    <div style={{minHeight:'100vh',background:'#080808',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:32,fontFamily:"'Barlow',sans-serif"}}>
      <div style={{fontSize:56,marginBottom:16}}>⚡</div>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(1.6rem,6vw,2.2rem)',letterSpacing:2,marginBottom:12}}>YOU'VE HIT YOUR <span style={{color:'#E8232A'}}>FREE LIMIT</span></div>
      <div style={{fontSize:15,color:'#888',marginBottom:8,maxWidth:320,lineHeight:1.8}}>You have used all 5 free diagnoses this month.</div>
      <div style={{fontSize:15,color:'#ccc',marginBottom:28,maxWidth:320,lineHeight:1.8}}>Upgrade to <strong style={{color:'#fff'}}>MECHA Pro</strong> and get unlimited AI diagnoses every month.</div>
      <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:28,width:'100%',maxWidth:300}}>
        {[['⚡','Unlimited AI diagnoses every month'],['💰','Know the fair price before any repair'],['🔧','Mechanic trust scores in your city'],['🌍','Works in 40+ languages'],['🚗','Track up to 5 vehicles']].map(([icon,text])=>(
          <div key={text} style={{display:'flex',alignItems:'center',gap:12,background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:'12px 14px',textAlign:'left'}}>
            <span style={{fontSize:20}}>{icon}</span>
            <span style={{fontSize:13,color:'#ccc'}}>{text}</span>
          </div>
        ))}
      </div>
      <button onClick={async()=>{try{const{data}=await createCheckout('pro');window.location.href=data.url;}catch(e){alert('Error: '+e.message);}}} style={{background:'#E8232A',color:'#fff',padding:'16px 0',border:'none',borderRadius:4,fontFamily:"'Barlow Condensed'",fontSize:'1.1rem',fontWeight:700,letterSpacing:2,textTransform:'uppercase',cursor:'pointer',marginBottom:10,width:'100%',maxWidth:300}}>Unlock Pro — $9.99/mo</button>
      <div style={{fontSize:11,color:'#555',marginBottom:20}}>Cancel anytime. No hidden fees. No contracts.</div>
      <div onClick={()=>navigate('/dashboard')} style={{fontSize:12,color:'#444',cursor:'pointer'}}>Back to Dashboard</div>
    </div>
  );
  return(<div style={{...PAGE,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}><Spinner size={56}/><div style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:3}}>Analyzing Your Car...</div><div style={{fontSize:13,color:'#555'}}>{vehicle?.year} {vehicle?.make} {vehicle?.model}</div></div>);
  return(
    <div style={PAGE}>
      {<div style={{background:'#111',borderBottom:'1px solid #1e1e1e',padding:'10px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div style={{fontSize:12,color:'#888'}}>⚡ <span style={{color:'#fff',fontWeight:700}}>{Math.max(0,diagLimit-diagCount)} diagnoses</span> remaining this month</div>
      <button onClick={async()=>{try{const{data}=await createCheckout('pro');window.location.href=data.url;}catch(e){alert('Sign in first.');}}} style={{background:'#E8232A',color:'#fff',padding:'6px 14px',border:'none',borderRadius:3,fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',cursor:'pointer'}}>Upgrade</button>
    </div>}
    <TopBar onBack={()=>navigate('/dashboard')} title={vehicle?`${vehicle.year} ${vehicle.make} ${vehicle.model}`:'Diagnose'}/>
      <div style={{padding:20,maxWidth:600,margin:'0 auto'}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:32,letterSpacing:2,marginBottom:20,lineHeight:1.1}}>WHAT IS WRONG WITH<br/><span style={{color:R}}>YOUR CAR?</span></div>
        <Card style={{marginBottom:14}}><Label>Describe the Problem</Label><Input placeholder="e.g. Check engine light on, car feels sluggish, rattling when I accelerate..." value={problem} onChange={e=>setProblem(e.target.value)} rows={4}/></Card>
        <Card style={{marginBottom:20}}>
          <Label>Upload Dashboard Photo (Optional)</Label>
          <div style={{fontSize:12,color:'#555',marginBottom:12}}>Add a photo for more accurate diagnosis.</div>
          {imgPrev?(<div style={{position:'relative'}}><img src={imgPrev} style={{width:'100%',borderRadius:8,maxHeight:200,objectFit:'cover'}} alt=""/><div onClick={()=>{setImgB64(null);setImgPrev(null);}} style={{position:'absolute',top:8,right:8,background:R,borderRadius:'50%',width:26,height:26,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:12}}>x</div></div>):(
            <div onClick={()=>fileRef.current?.click()} style={{border:'2px dashed #222',borderRadius:8,padding:28,textAlign:'center',cursor:'pointer'}}><div style={{fontSize:32,marginBottom:8}}>📷</div><div style={{fontSize:13,color:'#888'}}>Tap to upload dashboard photo</div></div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleImg}/>
        </Card>
        <Btn onClick={runDx} disabled={!vehicle||(!problem&&!imgB64)} style={{padding:16,fontSize:16}}>⚡ Run AI Diagnosis</Btn>
      </div>
    </div>
  );
}
