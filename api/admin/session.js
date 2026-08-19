export const access = "admin";
export const methods = ["GET"];
export default async function(req,res) {
  res.json({admin:true,handle:req.member.handle,display_name:req.member.display_name||req.member.handle,email:req.member.email||null});
}