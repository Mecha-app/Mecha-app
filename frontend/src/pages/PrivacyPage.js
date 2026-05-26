import{useNavigate}from'react-router-dom';
const R='#E8232A';
export default function PrivacyPage(){
  const navigate=useNavigate();
  const S={page:{minHeight:'100vh',background:'#080808',color:'#fff',fontFamily:"'Barlow',sans-serif"},nav:{background:'#0d0d0d',borderBottom:'1px solid #1e1e1e',padding:'16px 48px',display:'flex',alignItems:'center',justifyContent:'space-between'},wrap:{maxWidth:800,margin:'0 auto',padding:'60px 48px'},h2:{fontFamily:"'Bebas Neue'",fontSize:'1.4rem',letterSpacing:2,color:R,marginTop:36,marginBottom:10},p:{fontSize:'.9rem',color:'#ccc',lineHeight:1.9,marginBottom:14},ul:{fontSize:'.9rem',color:'#ccc',lineHeight:2,paddingLeft:20,marginBottom:14}};
  return(<div style={S.page}>
    <nav style={S.nav}><div onClick={()=>navigate('/')} style={{fontFamily:"'Bebas Neue'",fontSize:'1.8rem',letterSpacing:6,cursor:'pointer'}}>MECH<span style={{color:R}}>A</span></div><button onClick={()=>navigate(-1)} style={{background:'transparent',border:'1px solid #333',color:'#888',padding:'8px 16px',borderRadius:4,cursor:'pointer',fontSize:12}}>Back</button></nav>
    <div style={S.wrap}>
      <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,marginBottom:8}}>Legal</div>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:'3rem',letterSpacing:2,marginBottom:4}}>Privacy Policy</div>
      <p style={{...S.p,color:'#555',marginBottom:32}}>Last updated: January 1, 2026</p>
      <h2 style={S.h2}>1. Introduction</h2>
      <p style={S.p}>MECHA Technologies, Inc. operates the MECHA platform. This Privacy Policy explains how we collect, use, and protect your information.</p>
      <h2 style={S.h2}>2. Information We Collect</h2>
      <ul style={S.ul}><li>Account info (name, email, password)</li><li>Vehicle information (make, model, year, mileage)</li><li>Diagnostic descriptions and photos</li><li>Location data for mechanic/towing searches</li><li>Messages with mechanics, shops, or other users</li></ul>
      <h2 style={S.h2}>3. How We Use Your Information</h2>
      <ul style={S.ul}><li>Provide AI-powered vehicle diagnostics</li><li>Connect you with mechanics and towing services</li><li>Send maintenance reminders and service alerts</li><li>Improve our platform and services</li><li>Comply with legal obligations</li></ul>
      <h2 style={S.h2}>4. Information Sharing</h2>
      <p style={S.p}>We do not sell your personal information. We may share data with service providers, mechanics when you request services, and law enforcement when required by law.</p>
      <h2 style={S.h2}>5. Data Security</h2>
      <p style={S.p}>We use industry-standard encryption to protect your data in transit and at rest. Your car data is never sold to third parties.</p>
      <h2 style={S.h2}>6. Your Rights</h2>
      <p style={S.p}>You may access, update, or delete your account at any time. Contact us at privacy@mechaai.com to exercise these rights.</p>
      <h2 style={S.h2}>7. Cookies</h2>
      <p style={S.p}>We use cookies to improve your experience. You can control cookie settings through your browser preferences.</p>
      <h2 style={S.h2}>8. Contact</h2>
      <p style={S.p}>Questions? Email privacy@mechaai.com</p>
    </div>
  </div>);
}
