const router=require('express').Router();
const Vehicle=require('../models/Vehicle');
const User=require('../models/User');
const auth=require('../middleware/auth');
router.get('/',auth,async(req,res)=>{try{res.json(await Vehicle.find({owner:req.user.id}));}catch(e){res.status(500).json({error:e.message});}});
router.post('/',auth,async(req,res)=>{try{const v=await Vehicle.create({...req.body,owner:req.user.id});await User.findByIdAndUpdate(req.user.id,{$push:{vehicles:v._id}});res.status(201).json(v);}catch(e){res.status(500).json({error:e.message});}});
router.put('/:id',auth,async(req,res)=>{try{res.json(await Vehicle.findOneAndUpdate({_id:req.params.id,owner:req.user.id},req.body,{new:true}));}catch(e){res.status(500).json({error:e.message});}});
router.delete('/:id',auth,async(req,res)=>{try{await Vehicle.findOneAndDelete({_id:req.params.id,owner:req.user.id});await User.findByIdAndUpdate(req.user.id,{$pull:{vehicles:req.params.id}});res.json({message:'Removed'});}catch(e){res.status(500).json({error:e.message});}});
module.exports=router;
