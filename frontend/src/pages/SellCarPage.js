import{useState,useRef}from'react';
import{useNavigate}from'react-router-dom';
import{useAuth}from'../context/AuthContext';
import{Label,Input,Btn,Card,TopBar,PAGE,R}from'../components/UI';

const MAKES=['Toyota','Honda','Ford','Chevrolet','BMW','Mercedes-Benz','Nissan','Hyundai','Kia','Subaru','Mazda','Volkswagen','Audi','Lexus','Ram','GMC','Jeep','Dodge','Tesla','Volvo'];
const YEARS=Array.from({length:30},(_,i)=>String(2025-i));
const TITLE_STATUS=['Clean Title','Salvage Title','Rebuilt Title','Lemon Law Buyback','Parts Only'];
const CONDITIONS=['Excellent','Good','Fair','Poor'];
const TRANSMISSIONS=['Automatic','Manual','CVT','Semi-Automatic'];
const DRIVETRAINS=['FWD','RWD','AWD','4WD'];

const Field=({label,required,children})=>(
  <div style={{marginBottom:14}}>
    <Label>{label}{required&&<span style={{color:R}}> *</span>}</Label>
    {children}
  </div>
);

const Sel=({value,onChange,options})=>(
  <select value={value} onChange={onChange} style={{width:'100%',background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:4,padding:'12px 10px',color:'#fff',fontFamily:'inherit',fontSize:14,outline:'none'}}>
    {options.map(o=><option key={o}>{o}</option>)}
  </select>
);

export default function SellCarPage(){
  const{user}=useAuth();
  const navigate=useNavigate();
  if(!user){navigate('/register');return null;}
  const fileRef=useRef();
  const[images,setImages]=useState([]);
  const[previews,setPreviews]=useState([]);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState('');
  const[form,setForm]=useState({
    title:'',year:'',make:'',model:'',trim:'',mileage:'',price:'',
    titleStatus:'Clean Title',condition:'Good',color:'',
    transmission:'Automatic',drivetrain:'FWD',engine:'',
    description:'',knownProblems:'',phone:'',city:'',state:''
  });
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  const handleImages=e=>{
    const files=Array.from(e.target.files);
    const newImages=[...images,...files].slice(0,12);
    setImages(newImages);
    setPreviews(newImages.map(f=>URL.createObjectURL(f)));
  };
  const removeImage=i=>{
    const ni=images.filter((_,idx)=>idx!==i);
    setImages(ni);
    setPreviews(ni.map(f=>URL.createObjectURL(f)));
  };
  const handleSubmit=async()=>{
    setError('');
    if(images.length<6){setError('Please upload at least 6 photos.');return;}
    if(!form.title||!form.year||!form.make||!form.model||!form.mileage||!form.price||!form.description||!form.city||!form.state){
      setError('Please fill in all required fields.');return;
    }
    setLoading(true);
    try{
      const fd=new FormData();
      Object.entries(form).forEach(([k,v])=>fd.append(k,v));
      images.forEach(img=>fd.append('images',img));
      const token=localStorage.getItem('mechaToken');
      const res=await fetch('http://localhost:5001/api/listings',{
        method:'POST',
        headers:{Authorization:'Bearer '+token},
        body:fd
      });
      const data=await res.json();
      if(!res.ok)throw new Error(data.error||'Failed to create listing');
      navigate('/marketplace');
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  };

  return(
    <div style={PAGE}>
      <TopBar onBack={()=>navigate('/marketplace')} title="List Your Car For Sale"/>
      <div style={{padding:20,maxWidth:640,margin:'0 auto',paddingBottom:60}}>
        <div style={{fontFamily:"'Bebas Neue'",fontSize:28,letterSpacing:2,marginBottom:4}}>SELL YOUR CAR <span style={{color:R}}>ON MECHA</span></div>
        <div style={{fontSize:12,color:'#555',marginBottom:24}}>Reach thousands of buyers. Direct chat. No fees to list.</div>

        <Card style={{marginBottom:16}}>
          <Label>Vehicle Photos <span style={{color:R}}>* (minimum 6)</span></Label>
          <div style={{fontSize:12,color:'#555',marginBottom:12}}>Upload at least 6 photos: front, back, sides, interior, dashboard, engine bay, any damage.</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:12}}>
            {previews.map((p,i)=>(
              <div key={i} style={{position:'relative',aspectRatio:'4/3',borderRadius:6,overflow:'hidden'}}>
                <img src={p} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                <div onClick={()=>removeImage(i)} style={{position:'absolute',top:4,right:4,background:R,borderRadius:'50%',width:22,height:22,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:11,fontWeight:700}}>x</div>
                <div style={{position:'absolute',bottom:4,left:4,background:'rgba(0,0,0,0.7)',borderRadius:2,padding:'1px 6px',fontSize:9}}>{i+1}</div>
              </div>
            ))}
            {images.length<12&&(
              <div onClick={()=>fileRef.current?.click()} style={{aspectRatio:'4/3',border:'2px dashed #333',borderRadius:6,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',gap:6}}>
                <div style={{fontSize:24}}>📷</div>
                <div style={{fontSize:10,color:'#555',textAlign:'center'}}>{images.length<6?`Need ${6-images.length} more`:'Add more'}</div>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleImages}/>
          <div style={{fontSize:11,color:images.length>=6?'#22c55e':R,fontWeight:700}}>{images.length}/6 minimum photos uploaded</div>
        </Card>

        <Card style={{marginBottom:16}}>
          <Label>Listing Title <span style={{color:R}}>*</span></Label>
          <Input placeholder="e.g. 2020 Toyota Camry XLE — Low Miles, One Owner" value={form.title} onChange={set('title')}/>
          <div style={{fontSize:11,color:'#555',marginTop:6}}>Write a clear title that will attract buyers</div>
        </Card>

        <Card style={{marginBottom:16}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:14,color:R}}>Vehicle Details</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Field label="Year" required><Sel value={form.year} onChange={set('year')} options={['Select Year',...YEARS]}/></Field>
            <Field label="Make" required><Sel value={form.make} onChange={set('make')} options={['Select Make',...MAKES]}/></Field>
            <Field label="Model" required><Input placeholder="e.g. Camry" value={form.model} onChange={set('model')}/></Field>
            <Field label="Trim"><Input placeholder="e.g. XLE, Sport, LT" value={form.trim} onChange={set('trim')}/></Field>
            <Field label="Mileage" required><Input type="number" placeholder="e.g. 45000" value={form.mileage} onChange={set('mileage')}/></Field>
            <Field label="Color"><Input placeholder="e.g. Pearl White" value={form.color} onChange={set('color')}/></Field>
            <Field label="Transmission"><Sel value={form.transmission} onChange={set('transmission')} options={TRANSMISSIONS}/></Field>
            <Field label="Drivetrain"><Sel value={form.drivetrain} onChange={set('drivetrain')} options={DRIVETRAINS}/></Field>
            <Field label="Engine"><Input placeholder="e.g. 2.5L 4-Cylinder" value={form.engine} onChange={set('engine')}/></Field>
            <Field label="Condition"><Sel value={form.condition} onChange={set('condition')} options={CONDITIONS}/></Field>
          </div>
          <Field label="Title Status" required>
            <Sel value={form.titleStatus} onChange={set('titleStatus')} options={TITLE_STATUS}/>
            <div style={{fontSize:11,color:'#555',marginTop:6}}>Be honest — buyers can run a VIN check</div>
          </Field>
        </Card>

        <Card style={{marginBottom:16}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:14,color:R}}>Description & Honesty</div>
          <Field label="Vehicle Description" required>
            <Input placeholder="Describe your vehicle honestly..." value={form.description} onChange={set('description')} rows={5}/>
          </Field>
          <Field label="Known Problems or Issues">
            <Input placeholder="List any known issues, warning lights, damage, etc. Leave blank if none." value={form.knownProblems} onChange={set('knownProblems')} rows={3}/>
            <div style={{fontSize:11,color:'#888',marginTop:6}}>Buyers appreciate honesty. Disclosing issues builds trust.</div>
          </Field>
        </Card>

        <Card style={{marginBottom:16}}>
          <div style={{fontFamily:"'Bebas Neue'",fontSize:16,letterSpacing:2,marginBottom:14,color:R}}>Price & Contact</div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
            <Field label="Asking Price ($)" required><Input type="number" placeholder="e.g. 18500" value={form.price} onChange={set('price')}/></Field>
            <Field label="Phone (optional)"><Input placeholder="e.g. 305-555-0100" value={form.phone} onChange={set('phone')}/></Field>
            <Field label="City" required><Input placeholder="e.g. Miami" value={form.city} onChange={set('city')}/></Field>
            <Field label="State" required><Input placeholder="e.g. FL" value={form.state} onChange={set('state')}/></Field>
          </div>
        </Card>

        {error&&<div style={{color:R,fontSize:13,marginBottom:14,background:'rgba(232,35,42,0.08)',border:'1px solid rgba(232,35,42,0.3)',borderRadius:6,padding:'10px 14px'}}>{error}</div>}
        <Btn onClick={handleSubmit} disabled={loading} style={{padding:16,fontSize:15}}>
          {loading?'Publishing...':'Publish Listing — Free'}
        </Btn>
        <div style={{textAlign:'center',fontSize:11,color:'#555',marginTop:10}}>Your listing will be visible to all MECHA users immediately.</div>
      </div>
    </div>
  );
}
