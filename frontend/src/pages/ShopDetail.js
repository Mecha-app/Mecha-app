import{useState}from'react';
import{useNavigate}from'react-router-dom';
import{contactShop}from'../utils/api';
import{Label,Input,Btn,Card,TopBar,PAGE,R}from'../components/UI';
export default function ShopDetail(){
  const navigate=useNavigate();
  const shop=JSON.parse(sessionStorage.getItem('mechaShop')||'null');
  const[msg,setMsg]=useState('');
  const[sent,setSent]=useState(false);
  const[sending,setSending]=useState(false);
  const send=async()=>{
    if(!msg.trim())return;
    setSending(true);
    try{await contactShop(shop._id,msg);setSent(true);setMsg('');}
    catch{alert('Message failed. Please try again.');}
    finally{setSending(false);}
  };
  if(!shop)return(<div style={{...PAGE,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{textAlign:'center'}}><div style={{color:'#888',marginBottom:16}}>Shop not found.</div><Btn onClick={()=>navigate('/shops')} style={{maxWidth:200,margin:'0 auto'}}>Find Shops</Btn></div></div>);
  return(
    <div style={PAGE}>
      <TopBar onBack={()=>navigate('/shops')} title="Shop Details"/>
      <div style={{padding:20,maxWidth:600,margin:'0 auto'}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:26,letterSpacing:2,marginBottom:4}}>{shop.shopName}</div>
        {shop.isVerified&&<div style={{display:'inline-block',background:R,fontSize:9,letterSpacing:2,padding:'3px 10px',borderRadius:100,fontWeight:700,textTransform:'uppercase',marginBottom:10}}>MECHA Verified</div>}
        <div style={{fontSize:13,color:'#888',marginBottom:18}}>{shop.address}, {shop.city}, {shop.state} {shop.zip}</div>
        {shop.about&&<Card style={{marginBottom:12}}><Label>About</Label><div style={{fontSize:13,color:'#ccc',lineHeight:1.8,fontStyle:'italic'}}>"{shop.about}"</div></Card>}
        {shop.hours&&<Card style={{marginBottom:12}}><Label>Hours</Label><div style={{fontSize:13,color:'#ccc'}}>{shop.hours}</div></Card>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {shop.phone&&<a href={`tel:${shop.phone}`} style={{textDecoration:'none'}}><Btn variant="secondary" style={{background:'#1a1a1a',border:'1px solid #333'}}>Call Shop</Btn></a>}
          {shop.email&&<a href={`mailto:${shop.email}`} style={{textDecoration:'none'}}><Btn variant="secondary" style={{background:'#1a1a1a',border:'1px solid #333'}}>Email Shop</Btn></a>}
        </div>
        <Card>
          <Label>Send a Message</Label>
          {sent?(<div style={{textAlign:'center',padding:20}}><div style={{fontSize:32,marginBottom:8}}>✅</div><div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2,color:'#22c55e'}}>Message Sent!</div></div>):(
            <><Input placeholder="Describe your car problem..." value={msg} onChange={e=>setMsg(e.target.value)} rows={4} style={{marginBottom:12}}/><Btn onClick={send} disabled={!msg.trim()||sending}>{sending?'Sending...':'Send Message'}</Btn></>
          )}
        </Card>
      </div>
    </div>
  );
}