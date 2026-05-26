import{Routes,Route,Navigate}from'react-router-dom';
import{useAuth}from'./context/AuthContext';
import LandingPage from'./pages/LandingPage';
import DriverAuth from'./pages/DriverAuth';
import ShopAuth from'./pages/ShopAuth';
import TowingAuth from'./pages/TowingAuth';
import Dashboard from'./pages/Dashboard';
import DiagnosePage from'./pages/DiagnosePage';
import ResultPage from'./pages/ResultPage';
import MarketplacePage from './pages/MarketplacePage';
import SellCarPage from './pages/SellCarPage';
import ListingDetailPage from './pages/ListingDetailPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import FindShopsPage from'./pages/FindShopsPage';
import ShopDetail from'./pages/ShopDetail';
import ShopDashboard from'./pages/ShopDashboard';
import TowDashboard from'./pages/TowingDashboard';
const Guard=({children,allowed})=>{const{user}=useAuth();if(!user)return<Navigate to="/" replace/>;if(allowed&&!allowed.includes(user.type))return<Navigate to="/" replace/>;return children;};
export default function App(){
  return(
    <Routes>
      <Route path="/" element={<LandingPage/>}/>
      <Route path="/login" element={<DriverAuth mode="login"/>}/>
      <Route path="/register" element={<DriverAuth mode="signup"/>}/>
      <Route path="/shop/login" element={<ShopAuth mode="login"/>}/>
      <Route path="/shop/register" element={<ShopAuth mode="signup"/>}/>
      <Route path="/towing/login" element={<TowingAuth mode="login"/>}/>
      <Route path="/towing/register" element={<TowingAuth mode="signup"/>}/>
      <Route path="/dashboard" element={<Guard allowed={['driver']}><Dashboard/></Guard>}/>
      <Route path="/diagnose" element={<Guard allowed={['driver']}><DiagnosePage/></Guard>}/>
      <Route path="/result" element={<Guard allowed={['driver']}><ResultPage/></Guard>}/>
      <Route path="/marketplace" element={<MarketplacePage/>}/>
        <Route path="/sell" element={<SellCarPage/>}/>
        <Route path="/listing/:id" element={<ListingDetailPage/>}/>
        <Route path="/privacy" element={<PrivacyPage/>}/>
        <Route path="/terms" element={<TermsPage/>}/>
        <Route path="/about" element={<AboutPage/>}/>
        <Route path="/contact" element={<ContactPage/>}/>
        <Route path="/shops" element={<Guard allowed={['driver']}><FindShopsPage/></Guard>}/>
      <Route path="/shops/:id" element={<Guard allowed={['driver']}><ShopDetail/></Guard>}/>
      <Route path="/shop" element={<Guard allowed={['shop']}><ShopDashboard/></Guard>}/>
      <Route path="/towing" element={<Guard allowed={['towing']}><TowDashboard/></Guard>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
}
