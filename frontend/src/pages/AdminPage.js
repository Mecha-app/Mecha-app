import{useState,useEffect}from'react';
import{useNavigate}from'react-router-dom';
const R='#E8232A';
const API='https://mecha-backend.onrender.com';
const ADMIN_KEY='MechaAdmin2026!';

export default function AdminPage(){
  const navigate=useNavigate();
  const[stats,setStats]=useState(null);
  const[loading,setLoading]=useState(true);
  const[authed,setAuthed]=useState(false);
  const[pass,setPass]=useState('');
  const[error,setError]=useState('');

  const login=()=>{
    if(pass==='MechaAdmin2026!'){setAuthed(true);loadStats();}
    else setError('Wrong password');
  };

  const loadStats=async()=>{
    try{
      const res=await fetch(`${API}/api/admin/stats`,{headers:{'x-admin-key':ADMIN_KEY}});
      const data=await res.json();
      setStats(data);
    }catch(e){setError('Failed to load stats');}
    finally{setLoading(false);}
  };

  if(!authed)return(
    <div style={{minHeight:'100vh',background:'#080808',color:'#fff',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:32,fontFamily:"'Barlow',sans-serif"}}>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:'2.5rem',letterSpacing:6,marginBottom:32}}>MECH<span style={{color:R}}>A</span> ADMIN</div>
      <input type="password" placeholder="Admin password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==='Enter'&&login()} style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:4,padding:'12px 16px',color:'#fff',fontSize:14,width:'100%',maxWidth:300,marginBottom:12,outline:'none'}}/>
      {error&&<div style={{color:R,fontSize:12,marginBottom:12}}>{error}</div>}
      <button onClick={login} style={{background:R,color:'#fff',padding:'12px 32px',border:'none',borderRadius:4,fontWeight:700,letterSpacing:2,textTransform:'uppercase',cursor:'pointer',width:'100%',maxWidth:300}}>Sign In</button>
    </div>
  );

  if(loading)return(
    <div style={{minHeight:'100vh',background:'#080808',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.5rem',letterSpacing:2}}>Loading...</div>
    </div>
  );

  return(
    <div style={{minHeight:'100vh',background:'#080808',color:'#fff',fontFamily:"'Barlow',sans-serif"}}>
      <div style={{background:'#0d0d0d',borderBottom:'1px solid #1e1e1e',padding:'16px 24px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.8rem',letterSpacing:6}}>MECH<span style={{color:R}}>A</span> ADMIN</div>
        <button onClick={()=>navigate('/')} style={{background:'transparent',border:'1px solid #333',color:'#888',padding:'8px 16px',borderRadius:4,cursor:'pointer',fontSize:12}}>Exit</button>
      </div>
      <div style={{padding:24,maxWidth:900,margin:'0 auto'}}>
        {/* Stats Cards */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:16,marginBottom:32}}>
          {[
            ['👥','Total Users',stats?.users||0,''],
            ['⭐','Pro Users',stats?.proUsers||0,'paying'],
            ['💰','Monthly Revenue','$'+((stats?.proUsers||0)*9.99).toFixed(2),'est.'],
            ['⚡','Diagnoses',stats?.diagnoses||0,'total'],
            ['🚗','Listings',stats?.listings||0,'cars'],
            ['🔧','Shops',stats?.shops||0,'registered'],
          ].map(([icon,label,value,sub])=>(
            <div key={label} style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:20,textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:8}}>{icon}</div>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.8rem',color:R,lineHeight:1}}>{value}</div>
              <div style={{fontSize:11,color:'#888',marginTop:4,letterSpacing:1,textTransform:'uppercase'}}>{label}</div>
              {sub&&<div style={{fontSize:10,color:'#555',marginTop:2}}>{sub}</div>}
            </div>
          ))}
        </div>

        {/* Recent Users */}
        <div style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:20}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.2rem',letterSpacing:2,marginBottom:16,color:R}}>RECENT USERS</div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{borderBottom:'1px solid #1e1e1e'}}>
                  {['Name','Email','Plan','Diagnoses','Joined'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'8px 12px',color:'#555',fontSize:10,letterSpacing:1.5,textTransform:'uppercase',fontWeight:600}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats?.recentUsers?.map((u,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #0a0a0a'}}>
                    <td style={{padding:'10px 12px',color:'#fff'}}>{u.name||'—'}</td>
                    <td style={{padding:'10px 12px',color:'#888'}}>{u.email}</td>
                    <td style={{padding:'10px 12px'}}>
                      <span style={{background:u.plan==='pro'?'rgba(232,35,42,0.2)':'#1a1a1a',color:u.plan==='pro'?R:'#555',padding:'2px 8px',borderRadius:100,fontSize:10,fontWeight:700,letterSpacing:1,textTransform:'uppercase'}}>{u.plan||'free'}</span>
                    </td>
                    <td style={{padding:'10px 12px',color:'#888'}}>{u.diagnosisCount||0}</td>
                    <td style={{padding:'10px 12px',color:'#555',fontSize:11}}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
