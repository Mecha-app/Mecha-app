import{useEffect,useRef}from'react';
export default function GoogleBtn({onSuccess,text='continue_with'}){
  const ref=useRef();
  useEffect(()=>{
    if(!window.google||!ref.current)return;
    window.google.accounts.id.initialize({client_id:process.env.REACT_APP_GOOGLE_CLIENT_ID,callback:onSuccess,ux_mode:'popup'});
    window.google.accounts.id.renderButton(ref.current,{type:'standard',theme:'filled_black',size:'large',text,shape:'rectangular',width:360});
  },[onSuccess,text]);
  return<div style={{width:'100%',display:'flex',justifyContent:'center'}}><div ref={ref}/></div>;
}
