import{useState}from'react';
import{useNavigate,Link}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{registerShop,loginShop,googleShop}from'../utils/api';
import{Label,Input,Btn,Card,Divider,PAGE,R}from'../components/UI';
import GoogleBtn from'../components/GoogleBtn';
export default function ShopAuth({mode:init}){
  const[mode,setMode]=useState(init||'login');
  const[form,setForm]=useState({shopName:'',ownerName:'',email:'',password:'',phone:'',address:'',city:'',state:'',zip:'',about:'',specialties:'',languages:'',hours:''});
  const[error,setError]=useState('');const[loading,setLoading]=useState(false);
  const{login}=useAuth();const navigate=useNavigate();
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  const handleSubmit=async()=>{
    setError('');setLoading(true);
    try{
      const{data}=await(mode==='login'?loginShop({email:form.email,password:form.password}):registerShop(form));
      login({...(data.shop||data.user),type:'shop'},data.token);navigate('/shop');
    }catch(e){setError(e.response?.data?.error||'Something went wrong');}
    finally{setLoading(false);}
  };
  const handleGoogle=async resp=>{
    setError('');setLoading(true);
    try{const{data}=await googleShop(resp.credential);login({...data.shop,type:'shop'},data.token);navigate('/shop');}
    catch{setError('Google sign-in failed.');}
    finally{setLoading(false);}
  };
  return(
    <div style={{...PAGE,display:'flex',flexDirection:'column',alignItems:'center',padding:24,paddingTop:40,paddingBottom:40,overflowY:'auto'}}>
      <Link to="/" style={{fontFamily:"'Bebas Neue'",fontSize:36,letterSpacing:6,marginBottom:24,color:'#fff'}}>MECH<span style={{color:R}}>A</span></Link>
      <Card style={{width:'100%',maxWidth:500}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:2,marginBottom:18}}>{mode==='signup'?'List Your Shop':'Shop Sign In'}</div>
        <div style={{display:'flex',gap:20,marginBottom:20,borderBottom:'1px solid #1e1e1e',paddingBottom:12}}>
          {[['signup','Register'],['login','Sign In']].map(([m,l])=><div key={m} onClick={()=>{setMode(m);setError('');}} style={{cursor:'pointer',fontSize:11,letterSpacing:2,textTransform:'uppercase',fontWeight:700,color:mode===m?R:'#444',borderBottom:mode===m?`2px solid ${R}`:'none',paddingBottom:4}}>{l}</div>)}
        </div>
        <GoogleBtn onSuccess={handleGoogle} text={mode==='signup'?'signup_with':'continue_with'}/>
        <div style={{textAlign:'center',fontSize:11,color:'#444',marginTop:6,marginBottom:16}}>{mode==='signup'?'Quick setup — complete profile after':'Sign in instantly'}</div>
        <Divider/>
        {mode==='signup'&&<>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><Label>Shop Name *</Label><Input placeholder="Mike's Auto" value={form.shopName} onChange={set('shopName')}/></div>
            <div><Label>Owner Name</Label><Input placeholder="Mike J." value={form.ownerName} onChange={set('ownerName')}/></div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><Label>Phone *</Label><Input placeholder="305-555-0100" value={form.phone} onChange={set('phone')}/></div>
            <div><Label>ZIP *</Label><Input placeholder="33101" value={form.zip} onChange={set('zip')}/></div>
          </div>
          <div style={{marginBottom:10}}><Label>Address</Label><Input placeholder="123 Main St, Miami FL" value={form.address} onChange={set('address')}/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
            <div><Label>Specialties</Label><Input placeholder="Brakes, Engine, AC" value={form.specialties} onChange={set('specialties')}/></div>
            <div><Label>Languages</Label><Input placeholder="EN, ES, FR" value={form.languages} onChange={set('languages')}/></div>
          </div>
          <div style={{marginBottom:10}}><Label>Hours</Label><Input placeholder="Mon-Sat 8am-6pm" value={form.hours} onChange={set('hours')}/></div>
          <div style={{marginBottom:10}}><Label>About</Label><Input placeholder="What makes your shop great..." value={form.about} onChange={set('about')} rows={2}/></div>
        </>}
        <div style={{marginBottom:12}}><Label>Email *</Label><Input type="email" placeholder="shop@email.com" value={form.email} onChange={set('email')}/></div>
        <div style={{marginBottom:20}}><Label>Password *</Label><Input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')}/></div>
        {error&&<div style={{color:R,fontSize:12,marginBottom:12,textAlign:'center'}}>{error}</div>}
        <Btn onClick={handleSubmit} disabled={loading}>{loading?'Please wait...':mode==='signup'?'Register My Shop':'Sign In'}</Btn>
        <div style={{textAlign:'center',marginTop:10}}><Link to="/" style={{fontSize:11,color:'#444'}}>← Back</Link></div>
      </Card>
    </div>
  );
}
