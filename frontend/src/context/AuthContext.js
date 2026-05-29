import{createContext,useContext,useState,useEffect}from'react';
const Ctx=createContext(null);
export function AuthProvider({children}){
  const[user,setUser]=useState(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{const s=localStorage.getItem('mechaUser'),t=localStorage.getItem('mechaToken');if(s&&t){try{setUser(JSON.parse(s));}catch{}}setLoading(false);},[]);
  const login=(u,t)=>{const prevUser=localStorage.getItem('mechaUser');const prev=prevUser?JSON.parse(prevUser):null;if(!prev||(prev._id||prev.id)!==(u._id||u.id)){localStorage.setItem('mechaCount','0');localStorage.setItem('mechaCountMonth',String(new Date().getMonth()));}setUser(u);localStorage.setItem('mechaUser',JSON.stringify(u));localStorage.setItem('mechaToken',t);};
  const logout=()=>{setUser(null);localStorage.removeItem('mechaUser');localStorage.removeItem('mechaToken');};
  return<Ctx.Provider value={{user,loading,login,logout}}>{!loading&&children}</Ctx.Provider>;
}
export const useAuth=()=>useContext(Ctx);
