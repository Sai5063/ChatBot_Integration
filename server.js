require("dotenv").config();

const express = require("express");
const axios = require("axios");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

let sessionId="";
let sessionTime=0;


/* LOGIN */

async function login(){

const now=Date.now()

if(sessionId && (now-sessionTime<25*60*1000))
return

const res=await axios.post(process.env.SAP_URL+"Login",{

CompanyDB:process.env.SAP_COMPANY,
UserName:process.env.SAP_USER,
Password:process.env.SAP_PASSWORD

})

sessionId=res.data.SessionId
sessionTime=now

}


/* SAP CALL */

async function sapGet(endpoint){

await login()

const res=await axios.get(

process.env.SAP_URL+endpoint,

{headers:{Cookie:`B1SESSION=${sessionId}`}}

)

return res.data

}


/* DATE RANGE */

function range(type){

let today=new Date()
let from=new Date()

if(type==="week")
from.setDate(today.getDate()-7)

if(type==="month")
from.setMonth(today.getMonth()-1)

if(type==="year")
from.setFullYear(today.getFullYear()-1)

return{
from:from.toISOString().split("T")[0],
to:today.toISOString().split("T")[0]
}

}


/* PARSER */

function parse(msg){

msg=msg.toLowerCase()

return{

num:msg.match(/\d+/)?.[0],

today:msg.includes("today"),
week:msg.includes("week"),
month:msg.includes("month"),
year:msg.includes("year"),

sales:msg.includes("sales"),
purchase:msg.includes("purchase"),
ar:msg.includes("ar"),
ap:msg.includes("ap"),

stock:msg.includes("stock")||msg.includes("item"),

top:msg.includes("top"),
zero:msg.includes("zero"),

fast:msg.includes("fast"),
slow:msg.includes("slow")

}

}


/* QUERY BUILDER */

function build(base,intent){

if(intent.num)
return `${base}(${intent.num})`

let q=`${base}?$top=20`

if(intent.today){

let d=new Date().toISOString().split("T")[0]

q+=`&$filter=DocDate eq '${d}'`

}

if(intent.week||intent.month||intent.year){

let type=intent.week?"week":intent.month?"month":"year"

let r=range(type)

q+=`&$filter=DocDate ge '${r.from}' and DocDate le '${r.to}'`

}

if(intent.top)
q+=`&$orderby=DocTotal desc`

return q

}


/* TOP ITEMS */

function aggregate(docs){

let map={}

docs.forEach(doc=>{

doc.DocumentLines?.forEach(l=>{

if(!map[l.ItemCode])
map[l.ItemCode]=0

map[l.ItemCode]+=l.Quantity

})

})

return Object.entries(map)

.sort((a,b)=>b[1]-a[1])

.slice(0,5)

.map(i=>({

ItemCode:i[0],
Quantity:i[1]

}))

}


/* CHAT */

app.post("/chat",async(req,res)=>{

try{

let intent=parse(req.body.message)

/* SALES */

if(intent.sales){

let data=await sapGet(build("Orders",intent))

return res.json({type:"sales",data})

}

/* PURCHASE */

if(intent.purchase){

let data=await sapGet(build("PurchaseOrders",intent))

return res.json({type:"purchase",data})

}

/* AR */

if(intent.ar){

let data=await sapGet(build("Invoices",intent))

return res.json({type:"ar",data})

}

/* AP */

if(intent.ap){

let data=await sapGet(build("PurchaseInvoices",intent))

return res.json({type:"ap",data})

}

/* STOCK */

if(intent.stock){

if(intent.zero){

let data=await sapGet("Items?$filter=OnHand eq 0")

return res.json({type:"stock",data})

}

if(intent.top){

let data=await sapGet("Items?$orderby=OnHand desc&$top=5")

return res.json({type:"stock",data})

}

let data=await sapGet("Items?$top=20")

return res.json({type:"stock",data})

}

/* FAST MOVING */

if(intent.fast){

let data=await sapGet("Invoices?$expand=DocumentLines&$top=100")

let result=aggregate(data.value)

return res.json({type:"topSold",data:result})

}

/* SLOW MOVING */

if(intent.slow){

let data=await sapGet("Items?$orderby=OnHand asc&$top=5")

return res.json({type:"stock",data})

}

res.json({reply:"Ask about sales, purchase, invoices or stock"})

}

catch(e){

console.log(e.message)

res.json({reply:"❌ SAP Error"})

}

})
app.use((req,res,next)=>{
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "*");
    res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    res.header("Access-Control-Allow-Credentials", "true");
    res.removeHeader("X-Frame-Options");
    next();
});
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
})