import{useNavigate}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{Btn,Card,TopBar,PAGE,R}from'../components/UI';
export default function ShopDashboard(){
  const{user,logout}=useAuth();
  const navigate=useNavigate();
  const out=()=>{logout();navigate('/');};
  const Chip=()=>(<div style={{display:'flex',alignItems:'center',gap:8}}>{user?.avatar?<img src={user.avatar} style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${R}`}} alt=""/>:<div style={{width:28,height:28,borderRadius:'50%',background:R,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{user?.name?.[0]}</div>}<span style={{fontSize:11,color:'#555',cursor:'pointer'}} onClick={out}>Sign Out</span></div>);
  return(
    <div style={PAGE}>
      <TopBar title="Shop Dashboard" right={<Chip/>}/>
      <div style={{padding:20,maxWidth:600,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,background:'rgba(232,35,42,0.08)',border:'1px solid rgba(232,35,42,0.25)',borderRadius:8,padding:20,marginBottom:16}}>
          <div style={{fontSize:36}}>🔧</div>
          <div><div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2}}>{user?.shopName||user?.name+"'s Shop"}</div><div style={{fontSize:11,color:'#888'}}>{user?.email}</div></div>
          <div style={{marginLeft:'auto',background:'#1a1a1a',border:'1px solid #333',borderRadius:100,padding:'4px 12px',fontSize:10,letterSpacing:1.5,textTransform:'uppercase',color:'#f59e0b'}}>Pending Verification</div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
          {[['0','Views'],['0','Leads'],['0','Reviews']].map(([v,l])=>(<div key={l} style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:16,textAlign:'center'}}><div style={{fontFamily:"'Bebas Neue'",fontSize:26,color:R}}>{v}</div><div style={{fontSize:9,color:'#555',letterSpacing:1.5,textTransform:'uppercase'}}>{l}</div></div>))}
        </div>
        <Card style={{marginBottom:14,textAlign:'center'}}><div style={{fontSize:28,marginBottom:8}}>📬</div><div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2,marginBottom:6}}>INBOX</div><div style={{fontSize:13,color:'#555'}}>Customer messages from MECHA drivers will appear here.</div></Card>
        <Card style={{textAlign:'center'}}><div style={{fontSize:28,marginBottom:8}}>🏅</div><div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2,marginBottom:6}}>GET VERIFIED</div><div style={{fontSize:13,color:'#555',marginBottom:16}}>Verified shops get 3x more views and appear first in search.</div><Btn style={{maxWidth:220,margin:'0 auto'}}>Apply for Verification</Btn></Card>
      </div>
    </div>
  );
}