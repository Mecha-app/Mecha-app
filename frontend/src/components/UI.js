import{useAuth}from'../context/AuthContext';
export const R='#E8232A',BORDER='#1e1e1e';
export const PAGE={minHeight:'100vh',background:'#080808',color:'#fff',fontFamily:"'Barlow',sans-serif"};
export const Label=({children,style})=><div style={{fontSize:11,fontWeight:700,letterSpacing:2,textTransform:'uppercase',color:'#888',marginBottom:6,...style}}>{children}</div>;
export const Input=({style,rows,...p})=>rows?<textarea rows={rows} style={{width:'100%',background:'#0a0a0a',border:`1px solid ${BORDER}`,borderRadius:4,padding:'12px 10px',color:'#fff',fontFamily:"'Barlow',sans-serif",fontSize:14,outline:'none',resize:'vertical',boxSizing:'border-box',...style}} {...p}/>:<input style={{width:'100%',background:'#0a0a0a',border:`1px solid ${BORDER}`,borderRadius:4,padding:'12px 10px',color:'#fff',fontFamily:"'Barlow',sans-serif",fontSize:14,outline:'none',boxSizing:'border-box',...style}} {...p}/>;
export const Btn=({children,variant,style,disabled,...p})=><button disabled={disabled} style={{width:'100%',padding:'13px 16px',background:disabled?'#222':variant==='ghost'?'transparent':R,color:disabled?'#555':'#fff',border:variant==='ghost'?`1px solid ${BORDER}`:'none',borderRadius:4,fontFamily:"'Barlow Condensed'",fontSize:13,fontWeight:700,letterSpacing:2,textTransform:'uppercase',cursor:disabled?'not-allowed':'pointer',opacity:disabled?0.6:1,...style}} {...p}>{children}</button>;
export const Card=({children,style,...p})=><div style={{background:'#111',border:`1px solid ${BORDER}`,borderRadius:8,padding:20,...style}} {...p}>{children}</div>;
export const Spinner=({size=32})=><div style={{width:size,height:size,border:`3px solid ${BORDER}`,borderTop:`3px solid ${R}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>;
export const Select=({style,...p})=><select style={{width:'100%',background:'#0a0a0a',border:`1px solid ${BORDER}`,borderRadius:4,padding:'12px 10px',color:'#fff',fontFamily:"'Barlow',sans-serif",fontSize:14,outline:'none',...style}} {...p}/>;
export const Divider=({label})=><div style={{display:'flex',alignItems:'center',gap:12,margin:'16px 0'}}><div style={{flex:1,height:1,background:BORDER}}/>{label&&<span style={{fontSize:11,color:'#555',letterSpacing:1,textTransform:'uppercase'}}>{label}</span>}<div style={{flex:1,height:1,background:BORDER}}/></div>;
export const TopBar=({onBack,title,right})=>{
  const goHome=()=>{try{const u=JSON.parse(localStorage.getItem('mechaUser'));if(u&&u.type){window.location.href={driver:'/dashboard',shop:'/shop',towing:'/towing'}[u.type]||'/dashboard';}else{window.location.href='/';}}catch(e){window.location.href='/';}};
  return(<div style={{background:'#0d0d0d',borderBottom:`1px solid ${BORDER}`,padding:'14px 20px',display:'flex',alignItems:'center',gap:14,position:'sticky',top:0,zIndex:50}}>
    {onBack&&<div onClick={onBack} style={{cursor:'pointer',color:'#555',fontSize:22}}>←</div>}
    <div onClick={goHome} style={{fontFamily:"'Bebas Neue'",fontSize:22,letterSpacing:4,cursor:'pointer'}}>MECH<span style={{color:R}}>A</span></div>
    {title&&<div style={{flex:1,fontSize:13,fontWeight:600,letterSpacing:1,textTransform:'uppercase',color:'#888',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{title}</div>}
    {right&&<div style={{marginLeft:'auto'}}>{right}</div>}
  </div>);
};