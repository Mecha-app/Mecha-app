const router=require('express').Router();
const User=require('../models/User');
const Diagnosis=require('../models/Diagnosis');
const Listing=require('../models/Listing');
const Shop=require('../models/Shop');

const adminAuth=(req,res,next)=>{
  const key=req.headers['x-admin-key'];
  if(key!==process.env.ADMIN_KEY)return res.status(401).json({error:'Unauthorized'});
  next();
};

router.get('/stats',adminAuth,async(req,res)=>{
  try{
    const [users,diagnoses,listings,shops,proUsers]=await Promise.all([
      User.countDocuments(),
      Diagnosis.countDocuments(),
      Listing.countDocuments(),
      Shop.countDocuments(),
      User.countDocuments({plan:'pro'})
    ]);
    const recentUsers=await User.find().sort({createdAt:-1}).limit(10).select('name email plan createdAt diagnosisCount');
    res.json({users,diagnoses,listings,shops,proUsers,revenue:proUsers*9.99,recentUsers});
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
