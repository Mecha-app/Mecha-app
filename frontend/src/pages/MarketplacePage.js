import{useState,useEffect}from'react';
import{useNavigate}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{Input,Btn,Card,TopBar,PAGE,R}from'../components/UI';
import api from'../utils/api';
const MAKES=['Any','Toyota','Honda','Ford','Chevrolet','BMW','Mercedes-Benz','Nissan','Hyundai','Kia','Subaru','Mazda','Volkswagen','Audi','Lexus','Ram','GMC','Jeep','Dodge','Tesla'];
export default function MarketplacePage(){
  const{user}=useAuth();
  const navigate=useNavigate();
  const[listings,setListings]=useState([]);
  const[loading,setLoading]=useState(true);
  const[filters,setFilters]=useState({make:'',maxPrice:'',city:'',minYear:''});
  const set=f=>e=>setFilters(p=>({...p,[f]:e.target.value}));
  const load=async()=>{
    setLoading(true);
    try{
      const params=new URLSearchParams();
      if(filters.make&&filters.make!=='Any')params.append('make',filters.make);
      if(filters.maxPrice)params.append('maxPrice',filters.maxPrice);
      if(filters.city)params.append('city',filters.city);
      if(filters.minYear)params.append('minYear',filters.minYear);
      const{data}=await api.get('/api/listings?'+params.toString());
      setListings(data);
    }catch{}
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  return(
    <div style={PAGE}>
      <TopBar onBack={()=>navigate('/dashboard')} title="Car Marketplace" right={<button onClick={()=>navigate('/sell')} style={{background:R,color:'#fff',border:'none',borderRadius:4,padding:'8px 16px',fontFamily:"'Barlow Condensed'",fontSize:12,fontWeight:700,letterSpacing:2,textTransform:'uppercase',cursor:'pointer'}}>+ Sell My Car</button>}/>
      <div style={{padding:20,maxWidth:900,margin:'0 auto'}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:28,letterSpacing:2,marginBottom:4}}>CARS FOR SALE <span style={{color:R}}>NEAR YOU</span></div>
        <div style={{fontSize:12,color:'#555',marginBottom:20}}>Buy directly from owners. Chat instantly. No dealership fees.</div>
        {/* FILTERS */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:20,background:'#111',border:'1px solid #1e1e1e',borderRadius:8,padding:16}}>
          <div>
            <div style={{fontSize:10,color:R,letterSpacing:2,textTransform:'uppercase',marginBottom:6,fontWeight:700}}>Make</div>
            <select value={filters.make} onChange={set('make')} style={{width:'100%',background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:4,padding:'10px 8px',color:'#fff',fontSize:13,outline:'none'}}>
              {MAKES.map(m=><option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <div style={{fontSize:10,color:R,letterSpacing:2,textTransform:'uppercase',marginBottom:6,fontWeight:700}}>Max Price</div>
            <Input placeholder="e.g. 15000" value={filters.maxPrice} onChange={set('maxPrice')}/>
          </div>
          <div>
            <div style={{fontSize:10,color:R,letterSpacing:2,textTransform:'uppercase',marginBottom:6,fontWeight:700}}>City</div>
            <Input placeholder="e.g. Miami" value={filters.city} onChange={set('city')}/>
          </div>
          <div>
            <div style={{fontSize:10,color:R,letterSpacing:2,textTransform:'uppercase',marginBottom:6,fontWeight:700}}>Min Year</div>
            <Input placeholder="e.g. 2015" value={filters.minYear} onChange={set('minYear')}/>
          </div>
        </div>
        <Btn onClick={load} style={{marginBottom:24,maxWidth:200}}>Search Cars</Btn>
        {loading&&<div style={{textAlign:'center',color:'#555',padding:40}}>Loading...</div>}
        {!loading&&listings.length===0&&(
          <div style={{textAlign:'center',padding:60}}>
            <div style={{fontSize:40,marginBottom:16}}>🚗</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:2,marginBottom:8}}>No Listings Yet</div>
            <div style={{fontSize:13,color:'#555',marginBottom:20}}>Be the first to list your car!</div>
            <Btn onClick={()=>navigate('/sell')} style={{maxWidth:200,margin:'0 auto'}}>Sell My Car</Btn>
          </div>
        )}
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
          {listings.map(l=>(
            <Card key={l._id} onClick={()=>{sessionStorage.setItem('mechaListing',JSON.stringify(l));navigate('/listing/'+l._id);}} style={{cursor:'pointer',padding:0,overflow:'hidden'}} className="card-hover">
              <div style={{height:180,background:'#1a1a1a',position:'relative',overflow:'hidden'}}>
                {l.images&&l.images[0]?(
                  <img src={`http://localhost:5001${l.images[0]}`} alt={l.title} style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                ):(
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',fontSize:40}}>🚗</div>
                )}
                <div style={{position:'absolute',top:10,left:10,background:l.titleStatus==='Clean Title'?'rgba(34,197,94,0.9)':R,borderRadius:100,padding:'3px 10px',fontSize:9,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase'}}>{l.titleStatus}</div>
                <div style={{position:'absolute',bottom:10,right:10,background:'rgba(0,0,0,0.7)',borderRadius:4,padding:'3px 8px',fontSize:10,color:'#ccc'}}>{l.images?.length||0} photos</div>
              </div>
              <div style={{padding:14}}>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:1.5,marginBottom:2}}>{l.title}</div>
                <div style={{fontSize:11,color:'#555',marginBottom:8}}>{Number(l.mileage).toLocaleString()} mi · {l.transmission} · {l.condition}</div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <div style={{fontFamily:"'Bebas Neue'",fontSize:24,color:'#22c55e'}}>${Number(l.price).toLocaleString()}</div>
                  <div style={{fontSize:11,color:'#555'}}>{l.city}, {l.state}</div>
                </div>
                <div style={{fontSize:11,color:'#888',marginTop:6}}>Listed by {l.sellerName}</div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
