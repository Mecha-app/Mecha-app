const router=require('express').Router();
const Listing=require('../models/Listing');
const ChatMessage=require('../models/ChatMessage');
const User=require('../models/User');
const auth=require('../middleware/auth');
const multer=require('multer');
const path=require('path');

const storage=multer.diskStorage({
  destination:(req,file,cb)=>cb(null,'uploads/'),
  filename:(req,file,cb)=>cb(null,Date.now()+'-'+Math.round(Math.random()*1e9)+path.extname(file.originalname))
});
const upload=multer({storage,limits:{fileSize:10*1024*1024},fileFilter:(req,file,cb)=>{
  if(file.mimetype.startsWith('image/'))cb(null,true);
  else cb(new Error('Images only'));
}});

router.get('/',async(req,res)=>{
  try{
    const{make,maxPrice,city,minYear,titleStatus}=req.query;
    let q={status:'active'};
    if(make)q.make=new RegExp(make,'i');
    if(maxPrice)q.price={$lte:Number(maxPrice)};
    if(city)q.city=new RegExp(city,'i');
    if(minYear)q.year={$gte:minYear};
    if(titleStatus)q.titleStatus=titleStatus;
    res.json(await Listing.find(q).sort({createdAt:-1}).limit(50));
  }catch(e){res.status(500).json({error:e.message});}
});

router.get('/mine',auth,async(req,res)=>{
  try{res.json(await Listing.find({seller:req.user.id}).sort({createdAt:-1}));}
  catch(e){res.status(500).json({error:e.message});}
});

router.post('/',auth,upload.array('images',12),async(req,res)=>{
  try{
    const user=await User.findById(req.user.id);
    const images=req.files?req.files.map(f=>'/uploads/'+f.filename):[];
    if(images.length<6)return res.status(400).json({error:'Please upload at least 6 photos of your vehicle'});
    const{title,year,make,model,trim,mileage,price,titleStatus,condition,color,transmission,drivetrain,engine,description,knownProblems,phone,city,state}=req.body;
    if(!title||!year||!make||!model||!mileage||!price||!description||!city||!state)
      return res.status(400).json({error:'Please fill in all required fields'});
    const listing=await Listing.create({
      title,year,make,model,trim,mileage:Number(mileage),price:Number(price),
      titleStatus,condition,color,transmission,drivetrain,engine,
      description,knownProblems,phone,city,state,
      seller:req.user.id,sellerName:user.name,sellerEmail:user.email,images
    });
    res.status(201).json(listing);
  }catch(e){res.status(500).json({error:e.message});}
});

router.put('/:id',auth,async(req,res)=>{
  try{res.json(await Listing.findOneAndUpdate({_id:req.params.id,seller:req.user.id},req.body,{new:true}));}
  catch(e){res.status(500).json({error:e.message});}
});

router.delete('/:id',auth,async(req,res)=>{
  try{await Listing.findOneAndDelete({_id:req.params.id,seller:req.user.id});res.json({message:'Deleted'});}
  catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id',async(req,res)=>{
  try{
    const l=await Listing.findById(req.params.id);
    if(!l)return res.status(404).json({error:'Not found'});
    l.views++;await l.save();
    res.json(l);
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/:id/messages',auth,async(req,res)=>{
  try{
    const listing=await Listing.findById(req.params.id);
    if(!listing)return res.status(404).json({error:'Not found'});
    const user=await User.findById(req.user.id);
    const receiverId=listing.seller.toString()===req.user.id?req.body.receiverId:listing.seller;
    const msg=await ChatMessage.create({
      listingId:req.params.id,senderId:req.user.id,
      senderName:user.name,receiverId,text:req.body.text
    });
    res.status(201).json(msg);
  }catch(e){res.status(500).json({error:e.message});}
});

router.get('/:id/messages',auth,async(req,res)=>{
  try{
    const msgs=await ChatMessage.find({
      listingId:req.params.id,
      $or:[{senderId:req.user.id},{receiverId:req.user.id}]
    }).sort({createdAt:1});
    res.json(msgs);
  }catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
