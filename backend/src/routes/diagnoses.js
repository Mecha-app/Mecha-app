const router=require('express').Router();
const multer=require('multer');
const Anthropic=require('@anthropic-ai/sdk');
const Diagnosis=require('../models/Diagnosis');
const Vehicle=require('../models/Vehicle');
const auth=require('../middleware/auth');
const upload=multer({dest:'uploads/',limits:{fileSize:5*1024*1024}});

router.post('/check-limit',auth,async(req,res)=>{
  try{
    const User=require('../models/User');
    const user=await User.findById(req.user.id);
    const now=new Date();
    const resetDate=new Date(user.diagnosisResetDate||now);
    const monthDiff=(now.getFullYear()-resetDate.getFullYear())*12+(now.getMonth()-resetDate.getMonth());
    if(monthDiff>=1){
      await User.findByIdAndUpdate(req.user.id,{diagnosisCount:0,diagnosisResetDate:now});
      return res.json({count:0,limit:5,canDiagnose:true,plan:user.plan});
    }
    const limit=user.plan==='pro'?999:5;
    res.json({count:user.diagnosisCount||0,limit,canDiagnose:(user.diagnosisCount||0)<limit,plan:user.plan});
  }catch(e){res.status(500).json({error:e.message});}
});

router.post('/ai',auth,upload.single('image'),async(req,res)=>{
  try{
    const{problem,vehicleInfo,language}=req.body;
    const client=new Anthropic({apiKey:process.env.ANTHROPIC_API_KEY});
    const langInstruction=language&&language!=='en'?`IMPORTANT: Respond entirely in ${language} language.`:'';
    const prompt=`${langInstruction}
You are MECHA, an expert automotive AI diagnostic assistant. Analyze this car problem and respond with ONLY a valid JSON object.

Vehicle: ${vehicleInfo||'Unknown'}
Problem: ${problem}

Return JSON:
{
  "severity": "Critical"|"Moderate — Fix Soon"|"Minor — Monitor",
  "safeToDriver": true|false,
  "diagnosis": "2-3 sentence plain language explanation",
  "estimatedCost": {"min": number, "max": number},
  "laborHours": {"min": number, "max": number},
  "parts": [{"name": "part name", "estimatedCost": "$X-Y", "likelihood": "likely"|"conditional", "description": "brief description"}],
  "steps": ["step 1", "step 2"],
  "tip": "one insider tip"
}`;

    const message=await client.messages.create({
      model:'claude-haiku-4-5',
      max_tokens:1500,
      messages:[{role:'user',content:prompt}]
    });

    const text=message.content[0].text;
    const jsonMatch=text.match(/\{[\s\S]*\}/);
    if(!jsonMatch)throw new Error('Invalid AI response');
    const result=JSON.parse(jsonMatch[0]);

    const User=require('../models/User');
    await User.findByIdAndUpdate(req.user.id,{$inc:{diagnosisCount:1}});

    res.json(result);
  }catch(e){res.status(500).json({error:e.message});}
});

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

router.get('/',auth,async(req,res)=>{
  try{res.json(await Diagnosis.find({user:req.user.id}).populate('vehicle').sort({createdAt:-1}));}
  catch(e){res.status(500).json({error:e.message});}
});

module.exports=router;
