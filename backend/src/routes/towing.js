const router=require('express').Router();
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {OAuth2Client}=require('google-auth-library');
const Towing=require('../models/Towing');
const {sendEmail,towWelcome}=require('../utils/email');
const sign=id=>jwt.sign({id,type:'towing'},process.env.JWT_SECRET,{expiresIn:'30d'});
const client=new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/register',async(req,res)=>{
  try{
    const{companyName,ownerName,email,password,phone,zip,serviceRadius,truckCount}=req.body;
    if(!companyName||!email||!password||!phone)return res.status(400).json({error:'Required fields missing'});
    if(await Towing.findOne({email:email.toLowerCase()}))return res.status(409).json({error:'Email already registered'});
    const company=await Towing.create({companyName,ownerName,email:email.toLowerCase(),password:await bcrypt.hash(password,12),phone,zip,serviceRadius,truckCount,authMethod:'email'});
    await sendEmail({to:email,subject:`${companyName} joined MECHA Towing!`,html:towWelcome(companyName)});
    res.status(201).json({token:sign(company._id),company:{id:company._id,companyName,email,type:'towing'}});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/login',async(req,res)=>{
  try{
    const{email,password}=req.body;
    const company=await Towing.findOne({email:email.toLowerCase()});
    if(!company)return res.status(404).json({error:'No company with that email'});
    if(!company.password)return res.status(400).json({error:'Use Google Sign-In'});
    if(!await bcrypt.compare(password,company.password))return res.status(401).json({error:'Incorrect password'});
    res.json({token:sign(company._id),company:{id:company._id,companyName:company.companyName,email:company.email,type:'towing'}});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/google/verify',async(req,res)=>{
  try{
    const ticket=await client.verifyIdToken({idToken:req.body.credential,audience:process.env.GOOGLE_CLIENT_ID});
    const{email,name,sub:googleId}=ticket.getPayload();
    let company=await Towing.findOne({$or:[{googleId},{email}]});
    const isNew=!company;
    if(company){if(!company.googleId){company.googleId=googleId;company.authMethod='both';await company.save();}}
    else{company=await Towing.create({companyName:`${name}'s Towing`,ownerName:name,email,googleId,authMethod:'google',phone:'pending'});}
    res.json({token:sign(company._id),company:{id:company._id,companyName:company.companyName,email:company.email,type:'towing',needsSetup:isNew}});
  }catch(e){res.status(401).json({error:'Google sign-in failed'});}
});

router.get('/nearby',async(req,res)=>{
  try{
    const{lat,lng,radius=30}=req.query;
    res.json(await Towing.find({location:{$near:{$geometry:{type:'Point',coordinates:[parseFloat(lng),parseFloat(lat)]},$maxDistance:radius*1609.34}},isActive:true}).select('-password').limit(10));
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
