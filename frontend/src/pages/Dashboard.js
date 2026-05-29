import{useState,useEffect}from'react';
import{useNavigate}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{getVehicles,addVehicle,deleteVehicle,createCheckout}from'../utils/api';
import{Label,Input,Select,Btn,Card,TopBar,PAGE,R}from'../components/UI';
const MAKES=['Toyota','Honda','Ford','Chevrolet','BMW','Mercedes-Benz','Nissan','Hyundai','Kia','Subaru','Mazda','Volkswagen','Audi','Lexus','Ram','GMC','Jeep','Dodge','Tesla','Volvo'];
const YEARS=Array.from({length:30},(_,i)=>String(2025-i));
export default function Dashboard(){
  const{user,logout}=useAuth();
  const navigate=useNavigate();
  const[vehicles,setVehicles]=useState([]);
  const[selVeh,setSelVeh]=useState(null);
  const[adding,setAdding]=useState(false);
  const[form,setForm]=useState({year:'',make:'',model:'',mileage:'',nickname:''});
  const[diagCount,setDiagCount]=useState(0);
  const diagLimit=5;

  useEffect(()=>{
    const count=parseInt(localStorage.getItem('mechaCount')||'0');
    const month=localStorage.getItem('mechaCountMonth');
    const nowMonth=String(new Date().getMonth());
    if(month!==nowMonth){localStorage.setItem('mechaCount','0');localStorage.setItem('mechaCountMonth',nowMonth);setDiagCount(0);}
    else setDiagCount(count);
  },[]);

  useEffect(()=>{
    getVehicles().then(r=>{
      setVehicles(r.data);
      if(r.data.length>0){setSelVeh(r.data[0]);sessionStorage.setItem('mechaVehicle',JSON.stringify(r.data[0]));}
    }).catch(()=>{});
  },[]);

  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));

  const handleAdd=async()=>{
    if(!form.year||!form.make||!form.model)return;
    try{
      const{data}=await addVehicle(form);
      setVehicles(p=>[...p,data]);
      setSelVeh(data);
      sessionStorage.setItem('mechaVehicle',JSON.stringify(data));
      setForm({year:'',make:'',model:'',mileage:'',nickname:''});
      setAdding(false);
    }catch{}
  };

  const handleDelete=async(id,e)=>{
    e.stopPropagation();
    try{
      await deleteVehicle(id);
      const updated=vehicles.filter(v=>v._id!==id);
      setVehicles(updated);
      if(selVeh?._id===id){setSelVeh(updated[0]||null);if(updated[0])sessionStorage.setItem('mechaVehicle',JSON.stringify(updated[0]));}
    }catch{}
  };

  const selectVeh=v=>{setSelVeh(v);sessionStorage.setItem('mechaVehicle',JSON.stringify(v));};

  const handleUpgrade=async()=>{
    try{const{data}=await createCheckout('pro');window.location.href=data.url;}
    catch(e){console.log('Upgrade error:',e);alert('Error: '+e.message);}
  };

  const remaining=Math.max(0,diagLimit-diagCount);

  const UserChip=()=>(
    <div style={{display:'flex',alignItems:'center',gap:8}}>
      {user?.avatar?<img src={user.avatar} style={{width:28,height:28,borderRadius:'50%',border:`2px solid ${R}`}} alt=""/>:<div style={{width:28,height:28,borderRadius:'50%',background:R,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700}}>{user?.name?.[0]}</div>}
      <span style={{fontSize:12,color:'#888'}}>{user?.name?.split(' ')[0]}</span>
      <span style={{fontSize:11,color:'#555',cursor:'pointer'}} onClick={()=>{logout();navigate('/');}}>Sign Out</span>
    </div>
  );

  return(
    <div style={PAGE}>
      <TopBar title={`Hi, ${user?.name?.split(' ')[0]}`} right={<UserChip/>}/>
      <div style={{padding:16,maxWidth:600,margin:'0 auto',width:'100%'}}>

        {/* Upgrade Banner */}
        <div style={{background:'rgba(232,35,42,0.1)',border:'1px solid rgba(232,35,42,0.3)',borderRadius:8,padding:'12px 16px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{fontSize:13,color:'#fff'}}>⚡ <strong style={{color:R}}>{remaining}</strong> free diagnoses left</div>
          <button onClick={handleUpgrade} style={{background:R,color:'#fff',padding:'8px 16px',borderRadius:4,fontSize:11,fontWeight:700,letterSpacing:1.5,textTransform:'uppercase',cursor:'pointer',border:'none'}}>UPGRADE PRO</button>
        </div>

        {/* Quick Actions */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:24}}>
          <Card onClick={()=>navigate('/shops')} style={{cursor:'pointer',textAlign:'center'}}>
            <div style={{fontSize:28,marginBottom:8}}>📍</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2,marginBottom:3}}>Find Mechanics</div>
            <div style={{fontSize:11,color:'#555'}}>Near my location</div>
          </Card>
          <Card onClick={()=>selVeh?navigate('/diagnose'):setAdding(true)} style={{cursor:'pointer',textAlign:'center',background:'rgba(232,35,42,0.08)',border:'1px solid rgba(232,35,42,0.25)'}}>
            <div style={{fontSize:28,marginBottom:8}}>⚡</div>
            <div style={{fontFamily:"'Bebas Neue'",fontSize:14,letterSpacing:2,marginBottom:3}}>AI Diagnosis</div>
            <div style={{fontSize:11,color:'#888'}}>{selVeh?selVeh.model:'Add a vehicle first'}</div>
          </Card>
        </div>

        {/* Vehicles */}
        <Label style={{marginBottom:14}}>My Vehicles</Label>
        {vehicles.map(v=>(
          <Card key={v._id} onClick={()=>selectVeh(v)} style={{marginBottom:10,cursor:'pointer',border:selVeh?._id===v._id?`1px solid ${R}`:'1px solid #1e1e1e'}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div>
                <div style={{fontFamily:"'Bebas Neue'",fontSize:18,letterSpacing:2}}>{v.nickname||`${v.year} ${v.make} ${v.model}`}</div>
                {v.mileage&&<div style={{fontSize:11,color:'#555'}}>{Number(v.mileage).toLocaleString()} mi</div>}
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                {selVeh?._id===v._id&&<div style={{background:R,borderRadius:100,padding:'3px 12px',fontSize:9,letterSpacing:2,textTransform:'uppercase',fontWeight:700}}>Selected</div>}
                <span onClick={e=>handleDelete(v._id,e)} style={{fontSize:16,cursor:'pointer',color:'#444',padding:4}}>🗑</span>
              </div>
            </div>
          </Card>
        ))}

        {/* Add Vehicle Form */}
        {adding&&(
          <Card style={{marginBottom:14}}>
            <Label>Add Vehicle</Label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <Select value={form.year} onChange={set('year')}><option value="">Year</option>{YEARS.map(y=><option key={y}>{y}</option>)}</Select>
              <Select value={form.make} onChange={set('make')}><option value="">Make</option>{MAKES.map(m=><option key={m}>{m}</option>)}</Select>
            </div>
            <Input placeholder="Model (e.g. Camry)" value={form.model} onChange={set('model')} style={{marginBottom:10}}/>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
              <Input placeholder="Mileage" value={form.mileage} onChange={set('mileage')}/>
              <Input placeholder="Nickname" value={form.nickname} onChange={set('nickname')}/>
            </div>
            <div style={{display:'flex',gap:10}}>
              <Btn onClick={handleAdd} style={{flex:1}}>Save Vehicle</Btn>
              <Btn onClick={()=>setAdding(false)} variant="ghost" style={{flex:1}}>Cancel</Btn>
            </div>
          </Card>
        )}

        {!adding&&<div onClick={()=>setAdding(true)} style={{textAlign:'center',fontSize:12,color:R,cursor:'pointer',letterSpacing:1.5,textTransform:'uppercase',padding:'10px 0'}}>+ Add Vehicle</div>}

        {/* Diagnose Button */}
        {selVeh&&!adding&&(
          <Btn onClick={()=>navigate('/diagnose')} style={{width:'100%',marginBottom:10}}>
            Diagnose {selVeh.nickname||selVeh.model}
          </Btn>
        )}

        {/* Other Actions */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:10}}>
          <Btn onClick={()=>navigate('/marketplace')} style={{fontSize:11,letterSpacing:1.5,gridColumn:'span 2',background:'#22c55e'}}>🚗 Marketplace — Buy & Sell Cars</Btn>
          <Btn onClick={()=>navigate('/shops')} variant="ghost" style={{fontSize:11,letterSpacing:1.5}}>Find Mechanics</Btn>
          <Btn onClick={()=>{logout();navigate('/');}} variant="ghost" style={{fontSize:11,letterSpacing:1.5}}>Sign Out</Btn>
          <Btn onClick={()=>navigate('/')} variant="ghost" style={{fontSize:11,letterSpacing:1.5}}>Home Page</Btn>
          <Btn onClick={()=>navigate('/shop/register')} variant="ghost" style={{fontSize:11,letterSpacing:1.5}}>List My Shop</Btn>
        </div>
      </div>
    </div>
  );
}
