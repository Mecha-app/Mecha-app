import{useState}from'react';
import{useNavigate,Link}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{registerDriver,loginDriver,googleVerify}from'../utils/api';
import{Label,Input,Btn,Card,Divider,PAGE,R}from'../components/UI';
import GoogleBtn from'../components/GoogleBtn';
export default function DriverAuth({mode:init}){
  const[mode,setMode]=useState(init||'login');
  const[form,setForm]=useState({name:'',email:'',password:''});
  const[error,setError]=useState('');
  const[loading,setLoading]=useState(false);
  const{login}=useAuth();const navigate=useNavigate();
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  const handleSubmit=async()=>{
    setError('');setLoading(true);
    try{
      const fn=mode==='login'?loginDriver:registerDriver;
      const payload=mode==='login'?{email:form.email,password:form.password}:form;
      const{data}=await fn(payload);
      login({...data.user,type:'driver'},data.token);navigate('/dashboard');
    }catch(e){setError(e.response?.data?.error||'Something went wrong');}
    finally{setLoading(false);}
  };
  const handleGoogle=async resp=>{
    setError('');setLoading(true);
    try{const{data}=await googleVerify(resp.credential);login({...data.user,type:'driver'},data.token);navigate('/dashboard');}
    catch{setError('Google sign-in failed.');}
    finally{setLoading(false);}
  };
  return(
    <div style={{...PAGE,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24}}>
      <Link to="/" style={{fontFamily:"'Bebas Neue'",fontSize:44,letterSpacing:6,marginBottom:28,color:'#fff'}}>MECH<span style={{color:R}}>A</span></Link>
      <Card style={{width:'100%',maxWidth:400}}>
        <div style={{display:'flex',gap:24,marginBottom:24,borderBottom:'1px solid #1e1e1e',paddingBottom:14}}>
          {[['signup','Create Account'],['login','Sign In']].map(([m,l])=>(
            <div key={m} onClick={()=>{setMode(m);setError('');}} style={{cursor:'pointer',fontSize:11,letterSpacing:2,textTransform:'uppercase',fontWeight:700,color:mode===m?R:'#444',borderBottom:mode===m?`2px solid ${R}`:'none',paddingBottom:4}}>{l}</div>
          ))}
        </div>
        <GoogleBtn onSuccess={handleGoogle} text={mode==='signup'?'signup_with':'continue_with'}/>
        <div style={{textAlign:'center',fontSize:11,color:'#444',marginTop:6,marginBottom:16}}>{mode==='signup'?'Fastest way — no password needed':'Sign in instantly with Google'}</div>
        <Divider/>
        {mode==='signup'&&<div style={{marginBottom:12}}><Label>Full Name</Label><Input placeholder="Your name" value={form.name} onChange={set('name')}/></div>}
        <div style={{marginBottom:12}}><Label>Email</Label><Input type="email" placeholder="you@email.com" value={form.email} onChange={set('email')}/></div>
        <div style={{marginBottom:20}}><Label>Password</Label><Input type="password" placeholder="Min 6 characters" value={form.password} onChange={set('password')}/></div>
        {error&&<div style={{color:R,fontSize:12,marginBottom:12,textAlign:'center'}}>{error}</div>}
        <Btn onClick={handleSubmit} disabled={loading}>{loading?'Please wait...':mode==='signup'?'Create Account':'Sign In'}</Btn>
        <div style={{textAlign:'center',marginTop:14,fontSize:12,color:'#555'}}>
          {mode==='login'?'No account? ':'Have one? '}
          <span style={{color:R,cursor:'pointer'}} onClick={()=>{setMode(m=>m==='login'?'signup':'login');setError('');}}>
            {mode==='login'?'Sign up free':'Sign in'}
          </span>
        </div>
        <div style={{textAlign:'center',marginTop:8}}><Link to="/" style={{fontSize:11,color:'#444'}}>← Back</Link></div>
      </Card>
    </div>
  );
}
