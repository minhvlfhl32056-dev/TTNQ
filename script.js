// FINORA - JavaScript co ban
// Du lieu duoc luu trong localStorage tren trinh duyet hien tai.

let transactions = JSON.parse(localStorage.getItem("finora_transactions")) || [];
let customers = JSON.parse(localStorage.getItem("finora_customers")) || [];
let selectedCustomer = null;

const $ = id => document.getElementById(id);
const today = () => {
  const d = new Date();
  return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
};
const money = n => Number(n || 0).toLocaleString("vi-VN")+" ₫";
const dateText = d => d ? new Date(d+"T00:00:00").toLocaleDateString("vi-VN") : "-";
const debt = c => Math.max(0,Number(c.total)-Number(c.paid));
const save = () => {
  localStorage.setItem("finora_transactions",JSON.stringify(transactions));
  localStorage.setItem("finora_customers",JSON.stringify(customers));
};
const safe = text => String(text).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

function page(name){
  document.querySelectorAll(".page").forEach(p=>p.classList.remove("active"));
  document.querySelectorAll(".nav").forEach(b=>b.classList.remove("active"));
  $(name).classList.add("active");
  document.querySelector('[data-page="'+name+'"]').classList.add("active");
  const names={home:"Tổng quan",transactions:"Thu – chi",customers:"Khách hàng & công nợ",reminders:"Lịch nhắc thu tiền",reports:"Báo cáo"};
  $("title").textContent=names[name];
  if(name==="reports") charts();
}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>page(b.dataset.page)));
$("quickAdd").onclick=()=>page("transactions");

function addIncome(customer,amount){
  transactions.push({id:Date.now(),type:"income",amount,note:"Khách thanh toán: "+customer.name,date:today()});
}
function render(){
  save(); renderHome(); renderTransactions(); renderCustomers(); renderReminders();
  if($("reports").classList.contains("active")) charts();
}
function renderHome(){
  let inc=0,exp=0;
  transactions.forEach(t=>{if(t.type==="income")inc+=Number(t.amount);else exp+=Number(t.amount);});
  const totalDebt=customers.reduce((s,c)=>s+debt(c),0);
  $("income").textContent=money(inc);$("expense").textContent=money(exp);
  $("balance").textContent=money(inc-exp);$("debt").textContent=money(totalDebt);
  const recent=[...transactions].sort((a,b)=>b.id-a.id).slice(0,6);
  $("recent").innerHTML=recent.length?recent.map(t=>`<tr><td><strong>${safe(t.note)}</strong></td><td>${t.type==="income"?"Thu":"Chi"}</td><td>${dateText(t.date)}</td><td class="${t.type==="income"?"green":"red"}">${t.type==="income"?"+":"-"}${money(t.amount)}</td></tr>`).join(""):'<tr><td colspan="4" class="empty">Chưa có giao dịch.</td></tr>';
  const due=getDue().slice(0,4);
  $("homeDue").innerHTML=due.length?due.map(reminderHTML).join(""):'<p class="muted">Hiện không có khoản cần thu.</p>';
}
function renderTransactions(){
  const list=[...transactions].sort((a,b)=>b.id-a.id);
  $("transactionRows").innerHTML=list.length?list.map(t=>`<tr><td><strong>${safe(t.note)}</strong></td><td>${t.type==="income"?"Thu":"Chi"}</td><td>${dateText(t.date)}</td><td class="${t.type==="income"?"green":"red"}">${money(t.amount)}</td><td><button class="action delete" onclick="removeTransaction(${t.id})">Xóa</button></td></tr>`).join(""):'<tr><td colspan="5" class="empty">Chưa có giao dịch.</td></tr>';
}
function renderCustomers(){
  $("customerRows").innerHTML=customers.length?customers.map(c=>{
    const left=debt(c);
    let status=left===0?'<span class="tag good">Đã thanh toán</span>':c.due<today()?'<span class="tag bad">Quá hạn</span>':'<span class="tag warn">Chưa đủ</span>';
    return `<tr><td><strong>${safe(c.name)}</strong><br><small>${safe(c.phone||"")}</small></td><td>${dateText(c.due)}</td><td>${money(c.total)}</td><td>${money(c.paid)}</td><td class="${left?"red":"green"}">${money(left)}</td><td>${status}</td><td>${left?`<button class="action" onclick="openPayment(${c.id})">Thu tiền</button>`:""}<button class="action delete" onclick="removeCustomer(${c.id})">Xóa</button></td></tr>`;
  }).join(""):'<tr><td colspan="7" class="empty">Chưa có khách hàng.</td></tr>';
}
function getDue(){return customers.filter(c=>debt(c)>0).sort((a,b)=>a.due.localeCompare(b.due));}
function status(c){
  if(c.due<today())return ["Quá hạn","bad","Đã quá hạn"];
  if(c.due===today())return ["Đến hạn hôm nay","warn","Hạn hôm nay"];
  const days=Math.ceil((new Date(c.due+"T00:00:00")-new Date(today()+"T00:00:00"))/86400000);
  if(days<=7)return ["Sắp đến hạn","tag","Còn "+days+" ngày"];
  return ["Chưa đến hạn","tag","Hạn "+dateText(c.due)];
}
function reminderHTML(c){
  const s=status(c);
  return `<div class="reminder"><div><b>${safe(c.name)}</b><small>${s[2]} · Hạn: ${dateText(c.due)}</small></div><div class="right"><b>${money(debt(c))}</b><span class="tag ${s[1]}">${s[0]}</span></div></div>`;
}
function renderReminders(){
  const list=getDue();
  $("overdue").textContent=list.filter(c=>c.due<today()).length;
  $("dueToday").textContent=list.filter(c=>c.due===today()).length;
  const end=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  $("upcoming").textContent=list.filter(c=>c.due>today()&&c.due<=end).length;
  $("reminderRows").innerHTML=list.length?list.map(reminderHTML).join(""):'<p class="empty">Không có khoản nợ cần thu.</p>';
}

$("transactionForm").addEventListener("submit",e=>{
  e.preventDefault();
  const amount=Number($("amount").value);
  if(amount<=0)return alert("Số tiền phải lớn hơn 0.");
  transactions.push({id:Date.now(),type:$("type").value,amount,note:$("note").value.trim(),date:$("date").value});
  e.target.reset();$("date").value=today();render();alert("Đã lưu giao dịch.");
});
$("customerForm").addEventListener("submit",e=>{
  e.preventDefault();
  const total=Number($("total").value),paid=Number($("paid").value);
  if(total<=0||paid<0||paid>total)return alert("Kiểm tra lại số tiền cần đóng và đã đóng.");
  const c={id:Date.now(),name:$("customerName").value.trim(),phone:$("phone").value.trim(),total,paid,due:$("due").value,note:$("customerNote").value.trim()};
  customers.push(c);if(paid>0)addIncome(c,paid);
  e.target.reset();$("paid").value=0;render();alert("Đã thêm khách hàng.");
});
function openPayment(id){
  selectedCustomer=customers.find(c=>c.id===id);
  if(!selectedCustomer)return;
  $("modalName").textContent=selectedCustomer.name;
  $("paymentHint").textContent="Còn phải thu: "+money(debt(selectedCustomer));
  $("paymentAmount").max=debt(selectedCustomer);$("paymentAmount").value="";
  $("modal").classList.add("show");
}
$("closeModal").onclick=()=>$("modal").classList.remove("show");
$("modal").onclick=e=>{if(e.target===$("modal"))$("modal").classList.remove("show");};
$("paymentForm").addEventListener("submit",e=>{
  e.preventDefault();const amount=Number($("paymentAmount").value);
  if(!selectedCustomer||amount<=0||amount>debt(selectedCustomer))return alert("Số tiền không hợp lệ hoặc lớn hơn khoản còn nợ.");
  selectedCustomer.paid+=amount;addIncome(selectedCustomer,amount);
  $("modal").classList.remove("show");render();
});
function removeTransaction(id){
  if(confirm("Bạn chắc chắn muốn xóa giao dịch này?")){transactions=transactions.filter(t=>t.id!==id);render();}
}
function removeCustomer(id){
  if(confirm("Xóa khách hàng này? Các giao dịch đã ghi nhận vẫn được giữ.")){customers=customers.filter(c=>c.id!==id);render();}
}

function draw(canvas,items){
  const ctx=canvas.getContext("2d"),w=canvas.width,h=canvas.height;
  ctx.clearRect(0,0,w,h);
  const max=Math.max(1,...items.map(x=>x.value));
  ctx.strokeStyle="#e7edf5";ctx.beginPath();ctx.moveTo(45,20);ctx.lineTo(45,h-35);ctx.lineTo(w-20,h-35);ctx.stroke();
  items.forEach((x,i)=>{
    const bx=150+i*270,bh=x.value/max*165;
    ctx.fillStyle=x.color;ctx.fillRect(bx,h-36-bh,100,bh);
    ctx.fillStyle="#35445e";ctx.textAlign="center";ctx.font="16px Arial";
    ctx.fillText(x.value.toLocaleString("vi-VN"),bx+50,h-47-bh);
    ctx.fillStyle="#718098";ctx.fillText(x.label,bx+50,h-10);
  });
}
function charts(){
  draw($("financeChart"),[
    {label:"Tiền thu",value:transactions.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0),color:"#159b72"},
    {label:"Tiền chi",value:transactions.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0),color:"#df5b64"}
  ]);
  draw($("debtChart"),[
    {label:"Đã đóng",value:customers.reduce((s,c)=>s+c.paid,0),color:"#3269d8"},
    {label:"Còn nợ",value:customers.reduce((s,c)=>s+debt(c),0),color:"#f0ad4e"}
  ]);
}
function csv(name,rows){
  const content="\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
  const blob=new Blob([content],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);
}
$("exportTransactions").onclick=()=>csv("lich_su_thu_chi.csv",[["Noi dung","Loai","Ngay","So tien"],...transactions.map(t=>[t.note,t.type==="income"?"Thu":"Chi",t.date,t.amount])]);
$("exportCustomers").onclick=()=>csv("cong_no_khach_hang.csv",[["Khach hang","Dien thoai","Han dong","Phai dong","Da dong","Con no"],...customers.map(c=>[c.name,c.phone,c.due,c.total,c.paid,debt(c)])]);
$("exportAll").onclick=()=>csv("bao_cao_finora.csv",[["BAO CAO THU CHI"],["Loai","Noi dung","Ngay","So tien"],...transactions.map(t=>[t.type,t.note,t.date,t.amount]),[],["CONG NO"],["Khach hang","Han dong","Phai dong","Da dong","Con no"],...customers.map(c=>[c.name,c.due,c.total,c.paid,debt(c)])]);

$("date").value=today();
render();
