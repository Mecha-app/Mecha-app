import{useState}from'react';
import{useNavigate}from'react-router-dom';
import{getNearbyShops,getShopsByZip}from'../utils/api';
import{Input,Btn,Card,TopBar,PAGE,R}from'../components/UI';
export default function FindShopsPage(){
  const navigate=useNavigate();
  const[zip,setZip]=useState('');
  const[shops,setShops]=useState([]);
  const[loaded,setLoaded]=useState(false);
  const[locLoad,setLocLoad]=useState(false);
  const[error,setError]=useState('');
  const findGPS=()=>{
    if(!navigator.geolocation){setError('GPS not available.');return;}
    setLocLoad(true);setError('');
    navigator.geolocation.getCurrentPosition(async pos=>{
      try{const{data}=await getNearbyShops(pos.coords.latitude,pos.coords.longitude,25);setShops(data);setLoaded(true);}
      catch{setError('Could not load shops. Try ZIP code.');}
      finally{setLocLoad(false);}
    },()=>{setError('Could not get location. Try ZIP code.');setLocLoad(false);});
  };
  const findZip=async()=>{
    if(zip.length<5){setError('Enter a valid 5-digit ZIP.');return;}
    setError('');
    try{const{data}=await getShopsByZip(zip);setShops(data);setLoaded(true);}
    catch{setError('No shops found for that ZIP.');}
  };
  return(
    <div style={PAGE}>
      <TopBar onBack={()=>navigate('/dashboard')} title="Find Mechanics"/>
      <div style={{padding:20,maxWidth:600,margin:'0 auto'}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:30,letterSpacing:2,marginBottom:20,lineHeight:1.1}}>HONEST MECHANICS<br/><span style={{color:R}}>NEAR YOU.</span></div>
        <Btn onClick={findGPS} disabled={locLoad} style={{marginBottom:12}}>{locLoad?'Getting your location...':'Use My GPS Location'}</Btn>
        <div style={{display:'flex',gap:10,marginBottom:8}}><Input placeholder="Or enter ZIP Code" value={zip} onChange={e=>setZip(e.target.value)} style={{flex:1}}/><Btn onClick={findZip} style={{width:'auto',padding:'12px 18px',flexShrink:0}}>Search</Btn></div>
        {error&&<div style={{color:R,fontSize:12,marginBottom:12}}>{error}</div>}
        {loaded&&shops.length===0&&<div style={{textAlign:'center',color:'#555',marginTop:32}}>No shops found in that area yet.</div>}
        {shops.map(shop=>(<Card key={shop._id} style={{marginBottom:12,cursor:'pointer'}} onClick={()=>{sessionStorage.setItem('mechaShop',JSON.stringify(shop));navigate(`/shops/${shop._id}`);}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:12}}>
            <div style={{flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:1.5}}>{shop.shopName}</div>
                {shop.isVerified&&<span style={{background:R,fontSize:8,letterSpacing:1.5,padding:'2px 7px',borderRadius:100,fontWeight:700,textTransform:'uppercase'}}>Verified</span>}
              </div>
              <div style={{fontSize:12,color:'#888',marginBottom:6}}>{shop.address}, {shop.city}</div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                {(shop.languages||[]).map(l=><span key={l} style={{background:'#1a1a1a',border:'1px solid #2a2a2a',borderRadius:100,padding:'2px 8px',fontSize:10,color:'#888'}}>{l}</span>)}
                {(shop.specialties||[]).slice(0,2).map(s=><span key={s} style={{background:'rgba(232,35,42,0.08)',border:'1px solid rgba(232,35,42,0.2)',borderRadius:100,padding:'2px 8px',fontSize:10,color:R}}>{s}</span>)}
              </div>
            </div>
            <div style={{fontSize:11,color:'#555',flexShrink:0}}>{shop.zip}</div>
          </div>
        </Card>))}
      </div>
    </div>
  );
}