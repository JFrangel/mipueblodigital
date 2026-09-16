// Explicitly invoked live smoke test. Only synthetic private fixtures; cleanup in finally.
import assert from "node:assert/strict";
import { initializeApp,applicationDefault } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { randomUUID,createHash } from "node:crypto";
import sharp from "sharp";
const base=process.env.TEST_BASE_URL || "http://127.0.0.1:3101";
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw new Error("Use a local app server for this smoke test.");
initializeApp({credential:applicationDefault(),projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID});
const auth=getAuth(),db=getFirestore(),uid=`mpd-test-${randomUUID()}`,other=`mpd-test-${randomUUID()}`,requestId=randomUUID();
const id=createHash("sha256").update(`${uid}:${requestId}`).digest("hex");
async function session(user){const password=randomUUID()+"Aa!9"; await auth.createUser({uid:user,email:`${user}@example.test`,emailVerified:true,password});await db.doc(`accounts/${user}`).set({active:true,role:"citizen",fixture:true});const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email:`${user}@example.test`,password,returnSecureToken:true}),signal:AbortSignal.timeout(15000)});const d=await r.json();if(!r.ok)throw new Error(`Test authentication failed HTTP ${r.status}: ${d.error?.message?.slice(0,140)}`);return d.idToken;}
async function call(path,token,method="GET",data){return fetch(base+path,{method,headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:data?JSON.stringify(data):undefined,signal:AbortSignal.timeout(60000)});}
try{
 const token=await session(uid),stranger=await session(other);
 const bytes=await sharp({create:{width:8,height:8,channels:3,background:"green"}}).png().toBuffer();
 const payload={requestId,category:"infraestructura",vereda:"PRUEBA TÉCNICA PRIVADA",description:"Prueba técnica temporal del envío y conservación de evidencia. No corresponde a una incidencia ciudadana.",phone:"",sensitive:true,photo:`data:image/png;base64,${bytes.toString("base64")}`};
 const first=await call("/api/incidents/",token,"POST",payload);assert.equal(first.status,200,`Send HTTP ${first.status}`);const receipt=await first.json();assert.equal(receipt.id,id);
 const repeat=await call("/api/incidents/",token,"POST",payload);assert.equal(repeat.status,200);assert.deepEqual(await repeat.json(),receipt);
 assert.equal((await call("/api/incidents/",token,"POST",{...payload,description:"Otro contenido"})).status,409);
 const mine=await(await call("/api/incidents/",token)).json();assert(mine.items.some(i=>i.id===id));assert(!("photo" in mine.items[0]));
 const theirs=await(await call("/api/incidents/",stranger)).json();assert(!theirs.items.some(i=>i.id===id));
 assert.equal((await call(`/api/incidents/${id}/evidence/`,stranger)).status,404);
 const original=await call(`/api/incidents/${id}/evidence/`,token);assert.equal(original.status,200);assert.deepEqual(Buffer.from(await original.arrayBuffer()),bytes);
 const notification=await(await call("/api/notifications/",token)).json();assert(notification.items.some(i=>i.incidentId===id));
 assert.equal((await call("/api/admin/incidents/",token)).status,403);
 const shared=await(await call("/api/community/reports/",stranger)).json();assert(!shared.items.some(i=>i.id===id));
 console.log("PASS live: receipt, idempotency, changed-payload conflict, owner-only listing and originals, byte equality, notification, admin denial, sensitive privacy.");
}catch(error){ console.error("Live test failed: "+String(error.code||"assertion")+" "+String(error.message||"").slice(0,220)); process.exitCode=1; }finally{
 const evidenceKey=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(evidenceKey){const headers={apikey:evidenceKey};if(!evidenceKey.startsWith("sb_secret_"))headers.Authorization=`Bearer ${evidenceKey}`;const r=await fetch(`${process.env.SUPABASE_URL}/rest/v1/mpd_evidence_originals?incident_id=eq.${id}&owner_uid=eq.${uid}`,{method:"DELETE",headers,signal:AbortSignal.timeout(15000)});assert(r.ok,"Evidence cleanup failed");}
 const events=await db.collection(`incidents/${id}/events`).get();for(const d of events.docs)await d.ref.delete();
 for(const path of [`incidents/${id}`,`incidentIntake/${id}`,`incidentLimits/${uid}`,`councilNotifications/${id}-received`,`notifications/${uid}/items/${id}-received`,`accounts/${uid}`,`accounts/${other}`])await db.doc(path).delete();
 for(const user of [uid,other])await auth.deleteUser(user).catch(e=>{if(e.code!=="auth/user-not-found")throw e;});
 console.log("Synthetic private fixtures removed.");
}


