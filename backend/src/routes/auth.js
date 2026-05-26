const router=require('express').Router();
const bcrypt=require('bcryptjs');
const jwt=require('jsonwebtoken');
const {OAuth2Client}=require('google-auth-library');
const User=require('../models/User');
const auth=require('../middleware/auth');
const {sendEmail,welcomeEmail,resetEmail}=require('../utils/email');
const sign=(id,type)=>jwt.sign({id,type},process.env.JWT_SECRET,{expiresIn:'30d'});
const client=new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post('/register',async(req,res)=>{
  try{
    const{name,email,password,phone}=req.body;
    if(!name||!email||!password)return res.status(400).json({error:'Name, email and password required'});
    if(password.length<6)return res.status(400).json({error:'Password must be at least 6 characters'});
    if(await User.findOne({email:email.toLowerCase()}))return res.status(409).json({error:'Email already registered'});
    const user=await User.create({name,email:email.toLowerCase(),password:await bcrypt.hash(password,12),phone,authMethod:'email'});
    await sendEmail({to:email,subject:'Welcome to MECHA! 🚗',html:welcomeEmail(name)});
    res.status(201).json({token:sign(user._id,'driver'),user:{id:user._id,name,email,type:'driver',authMethod:'email'}});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/login',async(req,res)=>{
  try{
    const{email,password}=req.body;
    const user=await User.findOne({email:email.toLowerCase()});
    if(!user)return res.status(404).json({error:'No account with that email'});
    if(!user.password)return res.status(400).json({error:'This account uses Google Sign-In'});
    if(!await bcrypt.compare(password,user.password))return res.status(401).json({error:'Incorrect password'});
    res.json({token:sign(user._id,'driver'),user:{id:user._id,name:user.name,email:user.email,avatar:user.avatar,type:'driver',authMethod:user.authMethod}});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/google/verify',async(req,res)=>{
  try{
    const ticket=await client.verifyIdToken({idToken:req.body.credential,audience:process.env.GOOGLE_CLIENT_ID});
    const{email,name,sub:googleId,picture:avatar}=ticket.getPayload();
    let user=await User.findOne({$or:[{googleId},{email}]});
    if(user){if(!user.googleId){user.googleId=googleId;user.avatar=avatar;user.authMethod='both';await user.save();}}
    else{user=await User.create({name,email,googleId,avatar,authMethod:'google',isVerified:true});await sendEmail({to:email,subject:'Welcome to MECHA! 🚗',html:welcomeEmail(name)});}
    res.json({token:sign(user._id,'driver'),user:{id:user._id,name:user.name,email:user.email,avatar:user.avatar,type:'driver',authMethod:user.authMethod}});
  }catch(e){res.status(401).json({error:'Google sign-in failed: '+e.message});}
});

router.post('/forgot-password',async(req,res)=>{
  try{
    const user=await User.findOne({email:req.body.email?.toLowerCase()});
    if(!user)return res.status(404).json({error:'No account with that email'});
    if(!user.password)return res.json({message:'This account uses Google Sign-In'});
    const token=jwt.sign({id:user._id},process.env.JWT_SECRET,{expiresIn:'1h'});
    user.resetToken=token;user.resetExpires=new Date(Date.now()+3600000);await user.save();
    await sendEmail({to:req.body.email,subject:'Reset your MECHA password',html:resetEmail(user.name,`${process.env.CLIENT_URL}/reset-password?token=${token}`)});
    res.json({message:'Reset link sent'});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/reset-password',async(req,res)=>{
  try{
    const{token,newPassword}=req.body;
    const decoded=jwt.verify(token,process.env.JWT_SECRET);
    const user=await User.findById(decoded.id);
    if(!user||user.resetToken!==token||user.resetExpires<new Date())return res.status(400).json({error:'Invalid or expired link'});
    user.password=await bcrypt.hash(newPassword,12);user.resetToken=null;user.resetExpires=null;await user.save();
    res.json({message:'Password updated'});
  }catch{res.status(400).json({error:'Invalid or expired link'});}
});

router.get('/me',auth,async(req,res)=>{
  try{res.json(await User.findById(req.user.id).select('-password -resetToken'));}
  catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
