async function sendMessage(){

let input=document.getElementById("msg")

if(!input.value) return

addMessage(input.value,"user")

let res=await fetch("/chat",{

method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({message:input.value})

})

let data=await res.json()

if(data.reply){

addMessage(data.reply,"bot")
input.value=""
return

}

let records=data.data.value || data.data

renderCards(records,data.type)

input.value=""

}


function renderCards(records,type){

let chat=document.getElementById("chatBox")

let msg=document.createElement("div")
msg.className="message bot"

let bubble=document.createElement("div")
bubble.className="bubble"

let container=document.createElement("div")
container.className="card-container"

records.slice(0,10).forEach(r=>{

let card=document.createElement("div")
card.className="card"

card.innerHTML=`

<div class="card-title">${type.toUpperCase()}</div>

<div class="card-row">
<span class="card-label">Doc No</span>
<span class="card-value">${r.DocNum || r.ItemCode}</span>
</div>

<div class="card-row">
<span class="card-label">Name</span>
<span class="card-value">${r.CardName || r.ItemName}</span>
</div>

<div class="card-row">
<span class="card-label">Total / Stock</span>
<span class="card-value">${r.DocTotal || r.OnHand || r.Quantity}</span>
</div>

<div class="card-row">
<span class="card-label">Date</span>
<span class="card-value">${r.DocDate ? r.DocDate.split("T")[0] : "-"}</span>
</div>

`

container.appendChild(card)

})

bubble.appendChild(container)

msg.appendChild(bubble)

chat.appendChild(msg)

chat.scrollTop=chat.scrollHeight

}


function addMessage(text,type){

let chat=document.getElementById("chatBox")

let div=document.createElement("div")
div.className="message "+type

let bubble=document.createElement("div")
bubble.className="bubble"

bubble.innerText=text

div.appendChild(bubble)

chat.appendChild(div)

chat.scrollTop=chat.scrollHeight

}


document.getElementById("msg")

.addEventListener("keydown",function(e){

if(e.key==="Enter"){

e.preventDefault()

sendMessage()

}

})