import{useState}from'react';
import{useNavigate,Link}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{registerTowing,loginTowing}from'../utils/api';
import{Label,Input,Btn,Card,Divider,PAGE,R}from'../components/UI';

export default function TowingAuth({mode:init}){
  const[mode,setMode]=useState(init||'login');
  const[error,setError]=useState('');
  const[loading,setLoading]=useState(false);
  const{login}=useAuth();
  const navigate=useNavigate();
  const[form,setForm]=useState({
    companyName:'',ownerName:'',email:'',password:'',
    phone:'',city:'',state:'',zip:'',
    address:'',licenseNumber:'',insuranceNumber:'',
    truckCount:1,serviceRadius:25,
    services:[],available24h:false,
    website:'',description:''
  });
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  const toggleService=s=>setForm(p=>({...p,services:p.services.includes(s)?p.services.filter(x=>x!==s):[...p.services,s]}));

  const SERVICES=['Local Towing','Long Distance','Flatbed','Motorcycle','Heavy Duty','Roadside Assistance','Jumpstart','Lockout','Fuel Delivery','Tire Change'];

  const handleSubmit=async()=>{
    setError('');
    if(mode==='signup'){
      if(!form.companyName||!form.phone||!form.city||!form.state||!form.email||!form.password){
        setError('Please fill in all required fields.');return;
      }
    }
    setLoading(true);
    try{
      const{data}=await(mode==='login'?loginTowing({email:form.email,password:form.password}):registerTowing(form));
      login({...(data.company||data.user),type:'towing'},data.token);
      navigate('/towing');
    }catch(e){setError(e.response?.data?.error||'Something went wrong');}
    finally{setLoading(false);}
  };

  return(
    <div style={{...PAGE,padding:24,paddingTop:40}}>
      <div style={{maxWidth:620,margin:'0 auto'}}>
        <Link to="/" style={{fontFamily:"'Bebas Neue'",fontSize:36,letterSpacing:6,marginBottom:24,color:'#fff',display:'block',textAlign:'center'}}>MECH<span style={{color:R}}>A</span></Link>

        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:28,letterSpacing:2,marginBottom:6}}>TOWING <span style={{color:R}}>NETWORK</span></div>
          <div style={{fontSize:13,color:'#555'}}>Join MECHA and get dispatched to drivers who need help right now.</div>
        </div>

        <Card>
          <div style={{display:'flex',gap:20,marginBottom:24,borderBottom:'1px solid #1e1e1e',paddingBottom:12}}>
            {[['signup','Join Network'],['login','Sign In']].map(([m,l])=>(
              <div key={m} onClick={()=>{setMode(m);setError('');}} style={{cursor:'pointer',fontSize:11,letterSpacing:2,textTransform:'uppercase',fontWeight:700,color:mode===m?R:'#444',borderBottom:mode===m?`2px solid ${R}`:'none',paddingBottom:4}}>{l}</div>
            ))}
          </div>

          {mode==='signup'&&<>
            {/* COMPANY INFO */}
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,letterSpacing:2,color:R,marginBottom:12}}>Company Information</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><Label>Company Name <span style={{color:R}}>*</span></Label><Input placeholder="Fast Tow Miami" value={form.companyName} onChange={set('companyName')}/></div>
              <div><Label>Owner / Manager Name</Label><Input placeholder="John Smith" value={form.ownerName} onChange={set('ownerName')}/></div>
              <div><Label>Business Phone <span style={{color:R}}>*</span></Label><Input placeholder="305-555-0100" value={form.phone} onChange={set('phone')}/></div>
              <div><Label>Website (optional)</Label><Input placeholder="www.fasttow.com" value={form.website} onChange={set('website')}/></div>
              <div><Label>Street Address</Label><Input placeholder="123 Main St" value={form.address} onChange={set('address')}/></div>
              <div><Label>ZIP Code</Label><Input placeholder="33101" value={form.zip} onChange={set('zip')}/></div>
              <div><Label>City <span style={{color:R}}>*</span></Label><Input placeholder="Miami" value={form.city} onChange={set('city')}/></div>
              <div><Label>State <span style={{color:R}}>*</span></Label><Input placeholder="FL" value={form.state} onChange={set('state')}/></div>
            </div>

            {/* BUSINESS DETAILS */}
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,letterSpacing:2,color:R,marginBottom:12,marginTop:8}}>Business Details</div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><Label>License / DOT Number</Label><Input placeholder="DOT-1234567" value={form.licenseNumber} onChange={set('licenseNumber')}/></div>
              <div><Label>Insurance Policy #</Label><Input placeholder="INS-9876543" value={form.insuranceNumber} onChange={set('insuranceNumber')}/></div>
              <div><Label>Number of Trucks</Label><Input type="number" min="1" value={form.truckCount} onChange={set('truckCount')}/></div>
              <div><Label>Service Radius (miles)</Label><Input type="number" min="1" value={form.serviceRadius} onChange={set('serviceRadius')}/></div>
            </div>

            <div style={{marginBottom:14}}>
              <Label>Company Description</Label>
              <Input rows={3} placeholder="Describe your towing company, experience, specialties..." value={form.description} onChange={set('description')}/>
            </div>

            {/* SERVICES */}
            <div style={{fontFamily:"'Bebas Neue'",fontSize:15,letterSpacing:2,color:R,marginBottom:10,marginTop:4}}>Services Offered</div>
            <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:14}}>
              {SERVICES.map(s=>(
                <div key={s} onClick={()=>toggleService(s)} style={{padding:'6px 14px',borderRadius:100,border:`1px solid ${form.services.includes(s)?R:'#2a2a2a'}`,background:form.services.includes(s)?'rgba(232,35,42,0.1)':'transparent',color:form.services.includes(s)?R:'#888',fontSize:11,fontWeight:600,letterSpacing:1,textTransform:'uppercase',cursor:'pointer'}}>
                  {s}
                </div>
              ))}
            </div>

            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18,padding:'12px 14px',background:'#0a0a0a',borderRadius:6,border:'1px solid #1e1e1e'}}>
              <div onClick={()=>setForm(p=>({...p,available24h:!p.available24h}))} style={{width:36,height:20,borderRadius:100,background:form.available24h?R:'#333',position:'relative',cursor:'pointer',transition:'background .2s'}}>
                <div style={{position:'absolute',top:2,left:form.available24h?18:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left .2s'}}/>
              </div>
              <div>
                <div style={{fontSize:12,fontWeight:700}}>Available 24/7</div>
                <div style={{fontSize:11,color:'#555'}}>Toggle on if you offer round-the-clock service</div>
              </div>
            </div>

            <Divider label="Account"/>
          </>}

          <div style={{marginBottom:12}}><Label>Email <span style={{color:R}}>*</span></Label><Input type="email" placeholder="dispatch@fasttow.com" value={form.email} onChange={set('email')}/></div>
          <div style={{marginBottom:20}}><Label>Password <span style={{color:R}}>*</span></Label><Input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')}/></div>

          {error&&<div style={{color:R,fontSize:12,marginBottom:14,background:'rgba(232,35,42,0.08)',border:'1px solid rgba(232,35,42,0.3)',borderRadius:6,padding:'10px 14px'}}>{error}</div>}
          <Btn onClick={handleSubmit} disabled={loading}>{loading?'Please wait...':mode==='signup'?'Join Towing Network':'Sign In'}</Btn>

          {mode==='signup'&&<div style={{fontSize:11,color:'#555',textAlign:'center',marginTop:10}}>By joining you agree to MECHA dispatch terms. Your info is visible to drivers requesting towing.</div>}
          <div style={{textAlign:'center',marginTop:14}}><Link to="/" style={{fontSize:11,color:'#444'}}>← Back to Home</Link></div>
        </Card>
      </div>
    </div>
  );
}
