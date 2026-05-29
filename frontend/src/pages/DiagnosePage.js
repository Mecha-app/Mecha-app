import{useState,useRef}from'react';
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

  useEffect(()=>{
    const checkLimit=async()=>{
      try{
        const token=localStorage.getItem('mechaToken');
        if(!token)return;
        const res=await fetch(process.env.REACT_APP_API_URL+'/api/diagnoses/check-limit',{
          method:'POST',headers:{Authorization:'Bearer '+token}
        });
        const data=await res.json();
        if(!data.canDiagnose)setLimitReached(true);
      }catch(e){}
    };
    checkLimit();
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
      navigate('/result');
    }catch(e){
      console.error('Diagnosis error:',e);
      alert('Diagnosis failed: '+e.message);
    }
    finally{setLoading(false);}
  };
  if(loading)return(<div style={{...PAGE,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20}}><Spinner size={56}/><div style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:3}}>Analyzing Your Car...</div><div style={{fontSize:13,color:'#555'}}>{vehicle?.year} {vehicle?.make} {vehicle?.model}</div></div>);
  return(
    <div style={PAGE}>
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
