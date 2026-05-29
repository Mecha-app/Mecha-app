const express=require('express');
const router=express.Router();
const stripe=require('stripe')(process.env.STRIPE_SECRET_KEY);
const auth=require('../middleware/auth');

router.post('/create-checkout',auth,async(req,res)=>{
  try{
    const{plan}=req.body;
    const priceId=plan==='pro'?process.env.STRIPE_PRO_PRICE_ID:process.env.STRIPE_BUSINESS_PRICE_ID;
    const session=await stripe.checkout.sessions.create({
      mode:'subscription',
      payment_method_types:['card'],
      line_items:[{price:priceId,quantity:1}],
      success_url:`${process.env.CLIENT_URL}/dashboard?success=true`,
      cancel_url:`${process.env.CLIENT_URL}/#pricing`,
      customer_email:req.user.email,
      metadata:{userId:req.user.id,plan}
    });
    res.json({url:session.url});
  }catch(e){
    res.status(500).json({error:e.message});
  }
});

router.post('/webhook',express.raw({type:'application/json'}),async(req,res)=>{
  const sig=req.headers['stripe-signature'];
  let event;
  try{
    event=stripe.webhooks.constructEvent(req.body,sig,process.env.STRIPE_WEBHOOK_SECRET);
  }catch(e){
    return res.status(400).json({error:e.message});
  }
  if(event.type==='checkout.session.completed'){
    const session=event.data.object;
    const{userId,plan}=session.metadata;
    const User=require('../models/User');
    await User.findByIdAndUpdate(userId,{plan,stripeCustomerId:session.customer});
  }
  res.json({received:true});
});

module.exports=router;
