import{useNavigate}from'react-router-dom';
const R='#E8232A';
export default function TermsPage(){
  const navigate=useNavigate();
  const S={page:{minHeight:'100vh',background:'#080808',color:'#fff',fontFamily:"'Barlow',sans-serif"},nav:{background:'#0d0d0d',borderBottom:'1px solid #1e1e1e',padding:'16px 48px',display:'flex',alignItems:'center',justifyContent:'space-between'},wrap:{maxWidth:800,margin:'0 auto',padding:'60px 48px'},h2:{fontFamily:"'Bebas Neue'",fontSize:'1.4rem',letterSpacing:2,color:R,marginTop:36,marginBottom:10},p:{fontSize:'.9rem',color:'#ccc',lineHeight:1.9,marginBottom:14},ul:{fontSize:'.9rem',color:'#ccc',lineHeight:2,paddingLeft:20,marginBottom:14}};
  return(<div style={S.page}>
    <nav style={S.nav}><div onClick={()=>navigate('/')} style={{fontFamily:"'Bebas Neue'",fontSize:'1.8rem',letterSpacing:6,cursor:'pointer'}}>MECH<span style={{color:R}}>A</span></div><button onClick={()=>navigate(-1)} style={{background:'transparent',border:'1px solid #333',color:'#888',padding:'8px 16px',borderRadius:4,cursor:'pointer',fontSize:12}}>Back</button></nav>
    <div style={S.wrap}>
      <div style={{fontSize:'.7rem',letterSpacing:3,textTransform:'uppercase',color:R,marginBottom:8}}>Legal</div>
      <div style={{fontFamily:"'Bebas Neue'",fontSize:'3rem',letterSpacing:2,marginBottom:4}}>Terms of Service</div>
      <p style={{...S.p,color:'#555',marginBottom:32}}>Last updated: January 1, 2026</p>
      <h2 style={S.h2}>1. Acceptance of Terms</h2>
      <p style={S.p}>By using MECHA you agree to these Terms of Service. If you do not agree, please do not use our Service.</p>
      <h2 style={S.h2}>2. Description of Service</h2>
      <p style={S.p}>MECHA provides AI-powered vehicle diagnostics, repair cost estimates, mechanic finding, vehicle marketplace, and towing services. AI results are informational only and do not replace professional mechanical advice.</p>
      <h2 style={S.h2}>3. User Accounts</h2>
      <ul style={S.ul}><li>You must be 18 or older to create an account</li><li>You are responsible for your account security</li><li>You must provide accurate information</li><li>One person may not maintain multiple accounts</li></ul>
      <h2 style={S.h2}>4. AI Diagnostic Disclaimer</h2>
      <p style={S.p}>MECHA AI diagnostics are estimates based on information you provide. Always consult a certified mechanic before making repair decisions. MECHA is not liable for damage resulting from AI diagnostic results.</p>
      <h2 style={S.h2}>5. Marketplace Rules</h2>
      <ul style={S.ul}><li>All listings must be accurate and truthful</li><li>Sellers must disclose all known defects</li><li>MECHA is not a party to buyer-seller transactions</li><li>Fraudulent listings result in immediate termination</li></ul>
      <h2 style={S.h2}>6. Prohibited Uses</h2>
      <ul style={S.ul}><li>Using the platform for illegal purposes</li><li>Posting false or misleading information</li><li>Harassing other users</li><li>Attempting to hack or disrupt the platform</li></ul>
      <h2 style={S.h2}>7. Limitation of Liability</h2>
      <p style={S.p}>MECHA shall not be liable for indirect or consequential damages. Our total liability shall not exceed amounts paid in the past 12 months.</p>
      <h2 style={S.h2}>8. Governing Law</h2>
      <p style={S.p}>These terms are governed by Florida law. Disputes resolved in Miami-Dade County courts.</p>
      <h2 style={S.h2}>9. Contact</h2>
      <p style={S.p}>Questions? Email legal@mechaai.com</p>
    </div>
  </div>);
}
