const router=require('express').Router();
const multer=require('multer');
const Diagnosis=require('../models/Diagnosis');
const Vehicle=require('../models/Vehicle');
const auth=require('../middleware/auth');
const upload=multer({dest:'uploads/',limits:{fileSize:5*1024*1024}});
router.post('/',auth,upload.single('image'),async(req,res)=>{
  try{
    const{vehicleId,problemText,aiResult}=req.body;
    const imageUrl=req.file?`/uploads/${req.file.filename}`:null;
    const parsed=typeof aiResult==='string'?JSON.parse(aiResult):aiResult;
    const dx=await Diagnosis.create({vehicle:vehicleId,user:req.user.id,problemText,imageUrl,aiResult:parsed});
    await Vehicle.findByIdAndUpdate(vehicleId,{$push:{diagnoses:dx._id}});
    res.status(201).json(dx);
  }catch(e){res.status(500).json({error:e.message});}
});
router.get('/',auth,async(req,res)=>{try{res.json(await Diagnosis.find({user:req.user.id}).populate('vehicle').sort({createdAt:-1}));}catch(e){res.status(500).json({error:e.message});}});
module.exports=router;
