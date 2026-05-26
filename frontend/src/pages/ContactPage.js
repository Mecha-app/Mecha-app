import{useState}from'react';
import{useNavigate}from'react-router-dom';
const R='#E8232A';
export default function ContactPage(){
  const navigate=useNavigate();
  const[form,setForm]=useState({name:'',email:'',subject:'',message:''});
  const[sent,setSent]=useState(false);
  const set=f=>e=>setForm(p=>({...p,[f]:e.target.value}));
  const inp={width:'100%',background:'#0a0a0a',border:'1px solid #1e1e1e',borderRadius:4,padding:'12px 14px',color:'#fff',fontFamily:"'Barlow',sans-serif",fontSize:14,outline:'none',boxSizing:'border-box',marginBottom:14};
  return(<div style={{minHeight:'100vh',background:'#080808',color:'#fff',fontFamily:"'Barlow',sans-serif"}}>
    <nav style={{background:'#0d0d0d',borderBottom:'1px solid #1e1e1e',padding:'16px 48px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
      <div onClick={()=>navigate('/')} style={{fontFamily:"'Bebas Neue'",fontSize:'1.8rem',letterSpacing:6,cursor:'pointer'}}>MECH<span style={{color:R}}>A</span></div>
      <button onClick={()=>navigate(-1)} style={{background:'transparent',border:'1px solid #333',color:'#888',padding:'8px 16px',borderRadius:4,cursor:'pointer',fontSize:12}}>Back</button>
    </nav>
    <div style={{maxWidth:900,margin:'0 auto',padding:'60px 48px'}}>
      <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,marginBottom:8}}>Get In Touch</div>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:'clamp(2rem,5vw,4rem)',letterSpacing:2,marginBottom:48}}>CONTACT <span style={{color:R}}>MECHA.</span></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:60}}>
        <div>
          {sent?(
            <div style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',borderRadius:8,padding:32,textAlign:'center'}}>
              <div style={{fontSize:'2rem',marginBottom:12}}>✅</div>
              <div style={{fontFamily:"'Bebas Neue'",fontSize:'1.4rem',letterSpacing:2,marginBottom:8}}>Message Sent!</div>
              <div style={{fontSize:'.85rem',color:'#888'}}>We will get back to you within 24 hours.</div>
            </div>
          ):(
            <>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:0}}>
                <div><div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#888',fontWeight:700,marginBottom:6}}>Name</div><input style={inp} placeholder="John Smith" value={form.name} onChange={set('name')}/></div>
                <div><div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#888',fontWeight:700,marginBottom:6}}>Email</div><input style={inp} placeholder="john@email.com" value={form.email} onChange={set('email')}/></div>
              </div>
              <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#888',fontWeight:700,marginBottom:6}}>Subject</div>
              <input style={inp} placeholder="How can we help?" value={form.subject} onChange={set('subject')}/>
              <div style={{fontSize:10,letterSpacing:2,textTransform:'uppercase',color:'#888',fontWeight:700,marginBottom:6}}>Message</div>
              <textarea rows={6} style={{...inp,resize:'vertical'}} placeholder="Tell us what you need..." value={form.message} onChange={set('message')}/>
              <button onClick={()=>{if(form.name&&form.email&&form.message)setSent(true);}} style={{width:'100%',padding:14,background:R,color:'#fff',border:'none',borderRadius:4,fontFamily:"'Barlow Condensed'",fontSize:13,fontWeight:700,letterSpacing:2,textTransform:'uppercase',cursor:'pointer'}}>Send Message</button>
            </>
          )}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:24}}>
          {[['Support','support@mechaai.com','For all questions, issues, and inquiries']].map(([title,email,desc])=>(
            <div key={title} style={{display:'flex',gap:16,alignItems:'flex-start'}}>
              <div style={{width:44,height:44,background:'rgba(232,35,42,0.1)',border:'1px solid rgba(232,35,42,0.2)',borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',fontSize:'.7rem',fontWeight:700,color:R,flexShrink:0,letterSpacing:1}}>{title.slice(0,2).toUpperCase()}</div>
              <div>
                <div style={{fontFamily:"'Barlow Condensed'",fontSize:'.9rem',fontWeight:700,letterSpacing:1,textTransform:'uppercase',marginBottom:2}}>{title}</div>
                <div style={{fontSize:'.85rem',color:R,marginBottom:2}}>{email}</div>
                <div style={{fontSize:'.78rem',color:'#555'}}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>);
}
