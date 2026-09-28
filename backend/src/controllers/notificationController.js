const notifications=require('../services/notificationService');
const {sendError}=require('../utils/errorResponse');

async function list(req,res){
  try{return res.json(await notifications.listForUser(req.user.id,{category:req.query.category,unreadOnly:req.query.unreadOnly,page:req.query.page,limit:req.query.limit}))}
  catch(error){console.error('List notifications failed:',error.message);return sendError(res,500,error,'Failed to load notifications')}
}
async function unread(req,res){
  try{return res.json({unread:await notifications.unreadCount(req.user.id)})}
  catch(error){return sendError(res,500,error,'Failed to load notification count')}
}
async function read(req,res){
  try{const row=await notifications.markRead(req.user.id,req.params.id);if(!row)return res.status(404).json({error:'Notification not found'});return res.json(row)}
  catch(error){return sendError(res,500,error,'Failed to update notification')}
}
async function readAll(req,res){
  try{return res.json(await notifications.markAllRead(req.user.id))}
  catch(error){return sendError(res,500,error,'Failed to update notifications')}
}
async function preferences(req,res){
  try{return res.json(await notifications.getPreferences(req.user.id))}
  catch(error){return sendError(res,500,error,'Failed to load notification preferences')}
}
async function updatePreferences(req,res){
  try{return res.json(await notifications.updatePreferences(req.user.id,{emailEnabled:req.body?.emailEnabled}))}
  catch(error){return sendError(res,500,error,'Failed to update notification preferences')}
}
module.exports={list,unread,read,readAll,preferences,updatePreferences};
