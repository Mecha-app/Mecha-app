const mongoose=require('mongoose');
const S=new mongoose.Schema({
  listingId:{type:mongoose.Schema.Types.ObjectId,ref:'Listing',required:true},
  senderId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  senderName:{type:String},
  receiverId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  text:{type:String,required:true},
  createdAt:{type:Date,default:Date.now},
  read:{type:Boolean,default:false},
});
module.exports=mongoose.model('ChatMessage',S);
