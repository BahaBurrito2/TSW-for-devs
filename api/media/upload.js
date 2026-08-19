import { storage } from "hatchable";
export const access = "admin";
export const methods = ["POST"];
export default async function(req,res){
  const file=req.files&&req.files[0];
  if(!file)return res.status(400).json({error:"Choose an image file to upload."});
  if(!["image/png","image/jpeg","image/webp","image/svg+xml"].includes(file.contentType))return res.status(400).json({error:"Only PNG, JPG, WebP, or SVG images are supported."});
  if(file.buffer.length>5*1024*1024)return res.status(400).json({error:"Images must be 5 MB or smaller."});
  const ext={"image/png":"png","image/jpeg":"jpg","image/webp":"webp","image/svg+xml":"svg"}[file.contentType];
  const key="media/"+Date.now()+"-"+Math.random().toString(36).slice(2)+"."+ext;
  const url=await storage.put(key,file.buffer,file.contentType);
  // `url` is a ~1h presigned link (fine for an instant preview). `key` is the
  // durable reference callers must persist and resolve via lib/media.js at
  // render time, or the image breaks after an hour.
  res.json({url,key});
}