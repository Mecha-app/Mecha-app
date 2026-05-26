import{useNavigate}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{Btn,Card,TopBar,PAGE,R}from'../components/UI';
export default function TowingDashboard(){
  const{user,logout}=useAuth();
  const navigate=useNavigate();
  const out=()=>{logout();navigate('/');};
  const Chip=()=>(<div style={{display:'flex',alignItems:'center',gap:8}}><span style={{fontSize:12,color:'#888'}}>{user?.name?.split(' ')[0]}</span><span style={{fontSize:11,color:'#555',cursor:'pointer'}} onClick={out}>Sign Out</span></div>);
  return(
    <div style={PAGE}>
      <TopBar title="Dispatch Dashboard" right={<Chip/>}/>
      <div style={{padding:20,maxWidth:600,margin:'0 auto'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,background:'rgba(232,35,42,0.08)',border:'1px solid rgba(232,35,42,0.2)',borderRadius:8,padding:20,marginBottom:16}}>
          <div style={{fontSize:36}}>🚛</div>
          <div><div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2}}>{user?.companyName||user?.name+"'s Towing"}</div><div style={{fontSize:11,color:'#888'}}>{user?.email}</div></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10,marginBottom:16}}>
          {[['$0','Revenue'],['0','Jobs'],['--','Rating']].map(([v,l])=>(<div key={l} style={{background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:16,textAlign:'center'}}><div style={{fontFamily:"'Bebas Neue'",fontSize:26,color:R}}>{v}</div><div style={{fontSize:9,color:'#555',letterSpacing:1.5,textTransform:'uppercase'}}>{l}</div></div>))}
        </div>
        <Card style={{textAlign:'center',padding:32,marginBottom:14}}><div style={{fontSize:36,marginBottom:12}}>📲</div><div style={{fontFamily:"'Bebas Neue'",fontSize:20,letterSpacing:2,marginBottom:8}}>WAITING FOR DISPATCH</div><div style={{fontSize:13,color:'#555',marginBottom:20}}>Job requests from nearby drivers will appear here in real time.</div><div style={{display:'flex',gap:10}}><Btn variant="ghost" style={{flex:1,fontSize:12}}>Set My Location</Btn><Btn style={{flex:1,fontSize:12}}>Go Available</Btn></div></Card>
        <div style={{background:'rgba(232,35,42,0.07)',border:'1px solid rgba(232,35,42,0.2)',borderRadius:8,padding:'16px 20px',display:'flex',alignItems:'center',gap:16}}><div style={{fontFamily:"'Bebas Neue'",fontSize:28,color:R,flexShrink:0}}>$4.99</div><div style={{fontSize:12,color:'#888',lineHeight:1.7}}>Platform fee per completed dispatch. Guaranteed payment, funds deposited same day.</div></div>
      </div>
    </div>
  );
}