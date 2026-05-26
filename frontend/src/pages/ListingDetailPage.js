import{useState,useEffect,useRef}from'react';
import{useNavigate,useParams}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{Btn,Card,TopBar,PAGE,R,Label,Input}from'../components/UI';
import api from'../utils/api';
export default function ListingDetailPage(){
  const{user}=useAuth();
  const navigate=useNavigate();
  const{id}=useParams();
  const[listing,setListing]=useState(null);
  const[msgs,setMsgs]=useState([]);
  const[text,setText]=useState('');
  const[sending,setSending]=useState(false);
  const[photo,setPhoto]=useState(0);
  const chatRef=useRef();
  useEffect(()=>{
    api.get('/api/listings/'+id).then(r=>setListing(r.data)).catch(()=>{});
    if(user){api.get('/api/listings/'+id+'/messages').then(r=>setMsgs(r.data)).catch(()=>{});}
  },[id,user]);
  useEffect(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;},[msgs]);
  const sendMsg=async()=>{
    if(!text.trim()||!user)return;
    setSending(true);
    try{
      const{data}=await api.post('/api/listings/'+id+'/messages',{text,receiverId:listing.seller});
      setMsgs(p=>[...p,data]);setText('');
    }catch{}
    setSending(false);
  };
  const titleColor=ts=>({
    'Clean Title':'#22c55e','Salvage Title':R,'Rebuilt Title':'#f59e0b',
    'Lemon Law Buyback':'#f59e0b','Parts Only':'#888'
  }[ts]||'#888');
  if(!listing)return(<div style={{...PAGE,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{color:'#555'}}>Loading...</div></div>);
  const isOwner=user&&listing.seller===user.id;
  return(
    <div style={PAGE}>
      <TopBar onBack={()=>navigate('/marketplace')} title={listing.title}/>
      <div style={{padding:20,maxWidth:860,margin:'0 auto',paddingBottom:60}}>
        {/* PHOTO GALLERY */}
        <div style={{borderRadius:8,overflow:'hidden',marginBottom:8,position:'relative',background:'#111',aspectRatio:'16/9'}}>
          {listing.images&&listing.images.length>0?(
            <img src={`http://localhost:5001${listing.images[photo]}`} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
          ):(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:60}}>🚗</div>
          )}
          {listing.images&&listing.images.length>1&&(
            <>
              <div onClick={()=>setPhoto(p=>(p-1+listing.images.length)%listing.images.length)} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.6)',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18}}>‹</div>
              <div onClick={()=>setPhoto(p=>(p+1)%listing.images.length)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.6)',borderRadius:'50%',width:36,height:36,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:18}}>›</div>
              <div style={{position:'absolute',bottom:12,left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.6)',borderRadius:100,padding:'4px 12px',fontSize:11}}>{photo+1} / {listing.images.length}</div>
            </>
          )}
        </div>
        {listing.images&&listing.images.length>1&&(
          <div style={{display:'flex',gap:6,marginBottom:16,overflowX:'auto'}}>
            {listing.images.map((img,i)=>(
              <img key={i} src={`http://localhost:5001${img}`} alt="" onClick={()=>setPhoto(i)} style={{width:70,height:50,objectFit:'cover',borderRadius:4,cursor:'pointer',border:i===photo?`2px solid ${R}`:'2px solid transparent',flexShrink:0}}/>
            ))}
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:16,marginBottom:20,alignItems:'start'}}>
          <div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:28,letterSpacing:2,lineHeight:1,marginBottom:6}}>{listing.title}</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
              <span style={{background:titleColor(listing.titleStatus),borderRadius:100,padding:'3px 12px',fontSize:10,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase'}}>{listing.titleStatus}</span>
              <span style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:100,padding:'3px 12px',fontSize:10,color:'#888'}}>{listing.condition}</span>
              <span style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:100,padding:'3px 12px',fontSize:10,color:'#888'}}>{listing.transmission}</span>
              <span style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:100,padding:'3px 12px',fontSize:10,color:'#888'}}>{listing.drivetrain}</span>
            </div>
            <div style={{fontSize:13,color:'#888'}}>{listing.city}, {listing.state} · {Number(listing.mileage).toLocaleString()} miles · {listing.views} views</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:40,color:'#22c55e',lineHeight:1}}>${Number(listing.price).toLocaleString()}</div>
            <div style={{fontSize:11,color:'#555'}}>Listed by {listing.sellerName}</div>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:14}}>
          {/* VEHICLE SPECS */}
          <Card>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:12,color:R}}>Vehicle Specs</div>
            {[[listing.year+' '+listing.make+' '+listing.model+(listing.trim?' '+listing.trim:''),'Vehicle'],[listing.color,'Color'],[listing.engine,'Engine'],[Number(listing.mileage).toLocaleString()+' mi','Mileage'],[listing.transmission,'Transmission'],[listing.drivetrain,'Drivetrain']].filter(([v])=>v&&v!=='undefined').map(([v,l])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #1e1e1e',fontSize:12}}>
                <span style={{color:'#555'}}>{l}</span><span style={{fontWeight:600}}>{v}</span>
              </div>
            ))}
          </Card>
          {/* SELLER CONTACT */}
          <Card>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:12,color:R}}>Seller Info</div>
            <div style={{fontSize:14,fontWeight:700,marginBottom:4}}>{listing.sellerName}</div>
            <div style={{fontSize:12,color:'#888',marginBottom:16}}>{listing.sellerEmail}</div>
            {listing.phone&&<a href={`tel:${listing.phone}`} style={{textDecoration:'none'}}><Btn style={{marginBottom:8}}>Call Seller</Btn></a>}
            {isOwner&&(
              <div>
                <div style={{fontSize:11,color:R,letterSpacing:1.5,textTransform:'uppercase',fontWeight:700,marginBottom:8}}>You own this listing</div>
                <Btn onClick={async()=>{if(window.confirm('Delete this listing?')){await api.delete('/api/listings/'+id);navigate('/marketplace');}}} variant="ghost" style={{fontSize:11}}>Delete Listing</Btn>
              </div>
            )}
          </Card>
        </div>
        {/* DESCRIPTION */}
        <Card style={{marginBottom:14}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:10,color:R}}>Description</div>
          <div style={{fontSize:13,color:'#ccc',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{listing.description}</div>
        </Card>
        {/* KNOWN PROBLEMS */}
        {listing.knownProblems&&(
          <Card style={{marginBottom:14,border:'1px solid rgba(232,35,42,0.3)',background:'rgba(232,35,42,0.05)'}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:10,color:R}}>Known Problems / Issues</div>
            <div style={{fontSize:13,color:'#ccc',lineHeight:1.8,whiteSpace:'pre-wrap'}}>{listing.knownProblems}</div>
          </Card>
        )}
        {/* CHAT */}
        {user&&!isOwner&&(
          <Card style={{marginBottom:14}}>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:14,color:R}}>Chat with Seller</div>
            <div ref={chatRef} style={{height:240,overflowY:'auto',marginBottom:12,display:'flex',flexDirection:'column',gap:8}}>
              {msgs.length===0&&<div style={{textAlign:'center',color:'#555',fontSize:12,marginTop:60}}>Ask the seller a question about this vehicle...</div>}
              {msgs.map((m,i)=>{
                const mine=m.senderId===user.id;
                return(
                  <div key={i} style={{display:'flex',justifyContent:mine?'flex-end':'flex-start'}}>
                    <div style={{background:mine?R:'#1a1a1a',borderRadius:mine?'12px 12px 2px 12px':'12px 12px 12px 2px',padding:'8px 12px',maxWidth:'75%'}}>
                      {!mine&&<div style={{fontSize:10,color:'#888',marginBottom:2}}>{m.senderName}</div>}
                      <div style={{fontSize:13,lineHeight:1.5}}>{m.text}</div>
                      <div style={{fontSize:9,color:mine?'rgba(255,255,255,0.5)':'#555',marginTop:3,textAlign:'right'}}>{new Date(m.createdAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:'flex',gap:8}}>
              <Input placeholder="Ask about this car..." value={text} onChange={e=>setText(e.target.value)} onKeyPress={e=>e.key==='Enter'&&sendMsg()} style={{flex:1}}/>
              <Btn onClick={sendMsg} disabled={!text.trim()||sending} style={{width:'auto',padding:'12px 16px',flexShrink:0}}>Send</Btn>
            </div>
          </Card>
        )}
        {!user&&(
          <Card style={{textAlign:'center',padding:32}}>
            <div style={{fontSize:24,marginBottom:12}}>💬</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2,marginBottom:8}}>Sign In to Contact Seller</div>
            <div style={{fontSize:13,color:'#555',marginBottom:16}}>Create a free account to chat with the seller.</div>
            <Btn onClick={()=>navigate('/register')} style={{maxWidth:200,margin:'0 auto'}}>Sign Up Free</Btn>
          </Card>
        )}
      </div>
    </div>
  );
}
