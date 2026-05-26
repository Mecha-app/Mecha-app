const router=require('express').Router();
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {OAuth2Client}=require('google-auth-library');
const Shop=require('../models/Shop');
const Message=require('../models/Message');
const User=require('../models/User');
const auth=require('../middleware/auth');
const {sendEmail,shopWelcome}=require('../utils/email');
const sign=id=>jwt.sign({id,type:'shop'},process.env.JWT_SECRET,{expiresIn:'30d'});
const client=new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/register',async(req,res)=>{
  try{
    const{shopName,ownerName,email,password,phone,address,city,state,zip,about,specialties,languages,hours}=req.body;
    if(!shopName||!email||!password||!phone||!zip)return res.status(400).json({error:'Required fields missing'});
    if(await Shop.findOne({email:email.toLowerCase()}))return res.status(409).json({error:'Email already registered'});
    const shop=await Shop.create({shopName,ownerName,email:email.toLowerCase(),password:await bcrypt.hash(password,12),phone,address,city,state,zip,about,authMethod:'email',specialties:specialties?specialties.split(',').map(s=>s.trim()):[],languages:languages?languages.split(',').map(l=>l.trim()):['EN'],hours});
    await sendEmail({to:email,subject:`${shopName} is live on MECHA!`,html:shopWelcome(shopName)});
    res.status(201).json({token:sign(shop._id),shop:{id:shop._id,shopName,email,type:'shop'}});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/login',async(req,res)=>{
  try{
    const{email,password}=req.body;
    const shop=await Shop.findOne({email:email.toLowerCase()});
    if(!shop)return res.status(404).json({error:'No shop with that email'});
    if(!shop.password)return res.status(400).json({error:'Use Google Sign-In'});
    if(!await bcrypt.compare(password,shop.password))return res.status(401).json({error:'Incorrect password'});
    res.json({token:sign(shop._id),shop:{id:shop._id,shopName:shop.shopName,email:shop.email,type:'shop'}});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/google/verify',async(req,res)=>{
  try{
    const ticket=await client.verifyIdToken({idToken:req.body.credential,audience:process.env.GOOGLE_CLIENT_ID});
    const{email,name,sub:googleId}=ticket.getPayload();
    let shop=await Shop.findOne({$or:[{googleId},{email}]});
    const isNew=!shop;
    if(shop){if(!shop.googleId){shop.googleId=googleId;shop.authMethod='both';await shop.save();}}
    else{shop=await Shop.create({shopName:`${name}'s Shop`,ownerName:name,email,googleId,authMethod:'google',phone:'pending',zip:'pending'});}
    res.json({token:sign(shop._id),shop:{id:shop._id,shopName:shop.shopName,email:shop.email,type:'shop',needsSetup:isNew}});
  }catch(e){res.status(401).json({error:'Google sign-in failed'});}
});

router.get('/nearby',async(req,res)=>{
  try{
    const{lat,lng,radius=25}=req.query;
    res.json(await Shop.find({location:{$near:{$geometry:{type:'Point',coordinates:[parseFloat(lng),parseFloat(lat)]},$maxDistance:radius*1609.34}},isActive:true}).select('-password').limit(20));
  }catch(e){res.status(500).json({error:e.message});}
});

router.get('/zip/:zip',async(req,res)=>{
  try{res.json(await Shop.find({zip:req.params.zip,isActive:true}).select('-password').limit(20));}
  catch(e){res.status(500).json({error:e.message});}
});

router.post('/contact',auth,async(req,res)=>{
  try{
    const{shopId,body}=req.body;
    const user=await User.findById(req.user.id);
    const shop=await Shop.findById(shopId);
    if(!shop)return res.status(404).json({error:'Shop not found'});
    const msg=await Message.create({from:req.user.id,fromEmail:user.email,toShop:shopId,body});
    await sendEmail({to:shop.email,subject:'New customer message on MECHA',html:`<p>From: ${user.email}</p><p>${body}</p>`});
    res.status(201).json(msg);
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
