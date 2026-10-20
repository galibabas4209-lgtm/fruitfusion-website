import {useEffect,useState} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import { supabase } from './lib/supabase';
import {ShoppingBag,Plus,Minus,X,LogIn,LogOut,Upload,Pencil,Trash2,MapPin,MessageCircle,Star,ArrowRight,Sparkles,Clock,Instagram} from 'lucide-react';

type P={id:string;name:string;category:string;price:number;description:string;image:string;imagePath?:string;available:boolean;featured?:boolean;stock:number};
const seed:P[]=[
{id:'1',name:'Classic Fruit Parfait',category:'Parfait',price:3500,description:'Creamy yoghurt layered with fresh fruit and crunchy toppings.',image:'/resources/product-1.jpeg',available:true,featured:true},
{id:'2',name:'Berry Fruit Parfait',category:'Parfait',price:4000,description:'Rich yoghurt topped with strawberries, grapes and seasonal berries.',image:'/resources/product-2.jpeg',available:true,featured:true},
{id:'3',name:'Fruit Fusion Yoghurt',category:'Yoghurt',price:3000,description:'Fresh yoghurt cups prepared with Fruit Fusion toppings.',image:'/resources/product-3.jpeg',available:true}
];
const money=(n:number)=>'₦'+n.toLocaleString('en-NG');
const fade={hidden:{opacity:0,y:28},show:{opacity:1,y:0,transition:{duration:.55,ease:'easeOut'}}};

export default function App(){
 const[ps,setPs]=useState<P[]>(seed),[cart,setCart]=useState<P[]>([]),[toast,setToast]=useState(''),[drawer,setDrawer]=useState(false),[owner,setOwner]=useState<any>(null),[admin,setAdmin]=useState(false),[edit,setEdit]=useState<P|null>(null),[mobile,setMobile]=useState(false),[delivery,setDelivery]=useState<'pickup'|'home'>('pickup'),[deliveryDetails,setDeliveryDetails]=useState({name:'',phone:'',address:'',landmark:'',note:''});
 useEffect(() => {
  const loadProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('available', true)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Could not load products:', error.message);
      return;
    }

    if (data?.length) {
      setPs(
        data
          .filter((p) => Number(p.stock) > 0)
          .map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            price: Number(p.price),
            description: p.description ?? '',
            image: p.image_url?.startsWith('http')
              ? p.image_url
              : p.image_url || '/resources/product-1.jpeg',
            available: p.available,
            stock: Number(p.stock ?? 0),
          }))
      );
    }
  };

  loadProducts();

  const checkOwner = async () => {
    const { data: { user } } = await supabase.auth.getUser();

    if (user?.email?.toLowerCase() === 'ekunola99@gmail.com') {
      setOwner(user);
    }
  };

  checkOwner();
}, []);
 const add=(p:P)=>{const already=cart.filter(x=>x.id===p.id).length;if((p.stock??10)<=already){setToast(p.name+' is out of stock or at its available limit.');setTimeout(()=>setToast(''),2200);return}setCart(c=>[...c,p]);setToast(p.name+' added to your order');setTimeout(()=>setToast(''),2200)};
 const total=cart.reduce((s,p)=>s+p.price,0);
 const deliveryFee=delivery==='home'?1000:0;
 const grandTotal=total+deliveryFee;
 const deliveryReady=delivery==='pickup'||(deliveryDetails.name.trim()!==''&&deliveryDetails.phone.trim()!==''&&deliveryDetails.address.trim()!=='');
 const whatsappText='Hi Fruit Fusion, I would like to order: '+cart.map(p=>p.name).join(', ')+' | Subtotal: '+money(total)+' | Delivery: '+(delivery==='home'?money(deliveryFee):'Pickup')+' | Total: '+money(grandTotal)+(delivery==='home'?' | Customer: '+deliveryDetails.name+' | Phone: '+deliveryDetails.phone+' | Address: '+deliveryDetails.address+' | Landmark: '+deliveryDetails.landmark+' | Note: '+deliveryDetails.note:'');
 

const login = async () => {
  const email = window.prompt('Enter your owner email:');
  if (!email) return;

  const password = window.prompt('Enter your password:');
  if (!password) return;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    setToast('Sign-in failed: ' + error.message);
    setTimeout(() => setToast(''), 3000);
  }
};

const go = (id: string) => {
  setMobile(false);
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};


 return <div className="min-h-screen overflow-x-hidden bg-[#FFFDF9] text-[#18221B]">
  <div className="fixed inset-x-0 top-0 z-50">
   <div className="bg-[#18221B] px-4 py-2 text-center text-[11px] font-black uppercase tracking-[.2em] text-yellow-300">Freshly layered in Lagos • Order on WhatsApp</div>
   <nav className="border-b border-green-900/10 bg-[#FFFDF9]/95 backdrop-blur-xl">
    <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
     <button onClick={()=>go('home')} className="flex items-center gap-2"><img src="/resources/logo.jpeg" alt="Fruit Fusion" className="h-14 w-28 object-contain sm:h-16 sm:w-32"/><span className="sr-only">Fruit Fusion</span></button>
     <div className="hidden items-center gap-8 text-sm font-black md:flex"><button onClick={()=>go('about')}>Our story</button><button onClick={()=>go('menu')}>Menu</button><button onClick={()=>go('contact')}>Order</button></div>
     <div className="flex items-center gap-2"><button onClick={()=>setDrawer(true)} className="relative rounded-full bg-green-500 p-3.5 text-white shadow-lg shadow-green-500/25 hover:bg-green-600"><ShoppingBag size={18}/>{cart.length>0&&<b className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-orange-500 text-[10px]">{cart.length}</b>}</button><button onClick={()=>setMobile(!mobile)} className="rounded-full border border-slate-200 p-3 md:hidden">{mobile?<X size={18}/>:<span className="text-lg">☰</span>}</button></div>
    </div>
    <AnimatePresence>{mobile&&<motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden border-t bg-white md:hidden"><div className="grid gap-1 p-4 font-black"><button onClick={()=>go('about')} className="rounded-xl p-3 text-left hover:bg-green-50">Our story</button><button onClick={()=>go('menu')} className="rounded-xl p-3 text-left hover:bg-green-50">Menu</button><button onClick={()=>go('contact')} className="rounded-xl p-3 text-left hover:bg-green-50">Order now</button></div></motion.div>}</AnimatePresence>
   </nav>
  </div>

  <section id="home" className="relative overflow-hidden px-4 pb-20 pt-40 sm:px-6 lg:px-8 lg:pb-28 lg:pt-48">
   <div className="pointer-events-none absolute -left-24 top-32 h-64 w-64 rounded-full bg-yellow-300/35 blur-3xl"/><div className="pointer-events-none absolute -right-24 top-44 h-80 w-80 rounded-full bg-green-400/25 blur-3xl"/>
   <motion.div initial={{opacity:0,scale:.8}} animate={{opacity:1,scale:1}} transition={{duration:.7}} className="pointer-events-none absolute right-[7%] top-36 hidden h-16 w-16 rotate-12 items-center justify-center rounded-full bg-yellow-300 text-4xl shadow-lg lg:flex">🍋</motion.div>
   <motion.div animate={{y:[0,-14,0],rotate:[-5,5,-5]}} transition={{duration:5,repeat:Infinity}} className="pointer-events-none absolute left-[3%] top-[56%] hidden text-5xl lg:block">🍓</motion.div>
   <motion.div animate={{y:[0,12,0],rotate:[5,-5,5]}} transition={{duration:6,repeat:Infinity}} className="pointer-events-none absolute right-[3%] top-[65%] hidden text-6xl lg:block">🍊</motion.div>
   <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.03fr_.97fr]">
    <motion.div initial="hidden" animate="show" variants={fade}>
     <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-xs font-black uppercase tracking-[.18em] text-green-700"><Sparkles size={14}/> Lagos' fruity little obsession</div>
     <h1 className="mt-6 max-w-3xl text-[3.7rem] font-black leading-[.88] tracking-[-.065em] sm:text-7xl lg:text-[6.7rem]">Layered with<br/><span className="text-green-500">goodness.</span><br/><span className="text-orange-500">Made to smile.</span></h1>
     <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">Creamy yoghurt. Fresh fruit. Beautiful layers. Fruit Fusion brings a colourful, feel-good treat to Abule Egba and beyond.</p>
     <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={()=>go('menu')} className="group inline-flex items-center justify-center gap-2 rounded-full bg-green-500 px-7 py-4 font-black text-white shadow-xl shadow-green-500/25 hover:bg-green-600">Shop parfaits <ArrowRight size={18} className="transition group-hover:translate-x-1"/></button><a href="https://wa.me/2348050639359" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-orange-200 bg-white px-7 py-4 font-black text-orange-600 hover:border-orange-400">WhatsApp us <MessageCircle size={18}/></a></div>
     <div className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-xs font-black text-slate-500"><span>🍓 Fresh fruit</span><span>🥄 Creamy yoghurt</span><span>💚 Made with care</span></div>
    </motion.div>
    <div className="relative mx-auto w-full max-w-xl">
     <div className="absolute -inset-5 rounded-[3rem] bg-gradient-to-br from-yellow-200 via-orange-100 to-green-200 blur-2xl opacity-80"/>
     <motion.div initial={{opacity:0,rotate:-5,x:30}} animate={{opacity:1,rotate:-3,x:0}} transition={{duration:.8}} className="relative z-10 overflow-hidden rounded-[2.5rem] border-8 border-white bg-white shadow-2xl"><img src="/resources/product-1.jpeg" alt="Fruit Fusion classic parfait" className="aspect-[4/5] w-full object-cover"/><div className="absolute bottom-5 left-5 rounded-2xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur"><p className="text-[10px] font-black uppercase tracking-widest text-green-600">Customer favourite</p><b className="text-lg">Classic Fruit Parfait</b></div></motion.div>
     <motion.div animate={{y:[0,-10,0],rotate:[3,6,3]}} transition={{duration:5,repeat:Infinity}} className="absolute -bottom-5 -left-5 z-20 w-36 overflow-hidden rounded-3xl border-4 border-white bg-white shadow-xl sm:w-44"><img src="/resources/product-2.jpeg" alt="Fruit Fusion berry parfait" className="aspect-square object-cover"/></motion.div>
     <motion.div animate={{y:[0,9,0],rotate:[-3,-7,-3]}} transition={{duration:6,repeat:Infinity}} className="absolute -right-3 -top-5 z-20 grid h-24 w-24 place-items-center rounded-full bg-yellow-300 text-center shadow-xl sm:-right-5 sm:h-28 sm:w-28"><div><b className="block text-2xl">5★</b><span className="text-[9px] font-black uppercase">Happy<br/>spoons</span></div></motion.div>
    </div>
   </div>
  </section>

  <div className="overflow-hidden bg-orange-500 py-4 text-white"><motion.div animate={{x:['0%','-45%']}} transition={{duration:18,repeat:Infinity,ease:'linear'}} className="flex w-max items-center gap-8 whitespace-nowrap text-sm font-black uppercase tracking-[.18em]"><span>Fresh • Creamy • Delicious</span><span>🍓 Fresh • Creamy • Delicious</span><span>🥭 Fresh • Creamy • Delicious</span><span>🍊 Fresh • Creamy • Delicious</span><span>🥝 Fresh • Creamy • Delicious</span><span>Fresh • Creamy • Delicious</span><span>🍓 Fresh • Creamy • Delicious</span><span>🥭 Fresh • Creamy • Delicious</span></motion.div></div>

  <section id="about" className="relative overflow-hidden bg-[#18221B] px-4 py-20 text-white sm:px-6 lg:px-8 lg:py-28">
   <div className="absolute -right-20 top-10 text-[11rem] opacity-10">🍓</div>
   <motion.div initial="hidden" whileInView="show" viewport={{once:true}} variants={fade} className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="font-black uppercase tracking-[.25em] text-yellow-300">The Fruit Fusion way</p><h2 className="mt-4 text-5xl font-black leading-none sm:text-6xl">A little cup of<br/><span className="text-orange-400">happiness.</span></h2></div><div><p className="text-xl leading-9 text-slate-300">We layer smooth yoghurt with fresh fruit and delicious toppings to create colourful treats that look as good as they taste.</p><p className="mt-5 text-lg leading-8 text-slate-400">From breakfast to afternoon cravings, every cup is prepared with care in Abule Egba, Lagos.</p></div></motion.div>
  </section>

  <section id="menu" className="relative px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-orange-100/50 blur-3xl"/><div className="relative mx-auto max-w-7xl">
   <motion.div initial="hidden" whileInView="show" viewport={{once:true}} variants={fade} className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="font-black uppercase tracking-[.25em] text-orange-500">Our menu</p><h2 className="mt-2 text-5xl font-black tracking-tight sm:text-6xl">Pick your happy.</h2><p className="mt-3 max-w-xl text-slate-500">Real Fruit Fusion products, real photos. Choose your favourite and order in a few taps.</p></div><div className="rounded-2xl bg-yellow-100 px-4 py-3 text-sm font-black text-yellow-900">🍓 Made fresh for you</div></motion.div>
   <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{ps.filter(p=>p.available).map((p,i)=><motion.article initial="hidden" whileInView="show" viewport={{once:true}} variants={fade} transition={{delay:i*.08}} whileHover={{y:-9}} key={p.id} className="group overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-[0_10px_40px_rgba(24,34,27,.07)] hover:shadow-[0_20px_55px_rgba(34,197,94,.16)]">
    <div className="relative aspect-[4/4.2] overflow-hidden bg-green-50"><img src={p.image} alt={p.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-110"/><div className="absolute inset-x-4 top-4 flex items-start justify-between">{p.featured&&<span className="rounded-full bg-yellow-300 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-yellow-950 shadow">⭐ Best seller</span>}<span className="ml-auto rounded-full bg-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-green-700 backdrop-blur">{p.category}</span></div><div className="absolute bottom-4 right-4 rounded-2xl bg-white px-3 py-2 font-black text-orange-500 shadow-lg">{money(p.price)}</div></div>
    <div className="p-5"><h3 className="text-2xl font-black">{p.name}</h3><p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{p.description}</p><button onClick={()=>add(p)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#18221B] py-4 font-black text-white hover:bg-green-600"><Plus size={17}/> Add to order</button></div>
   </motion.article>)}</div>
  </div></section>

  <section className="bg-[#FFF7ED] px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-5 md:grid-cols-3">{[['🍓','Fresh ingredients','Fresh fruit and creamy yoghurt in every colourful layer.'],['💚','Made with care','Beautifully prepared so every spoonful feels special.'],['🛵','Lagos delivery','Easy local ordering through WhatsApp for delivery or pickup.']].map(([icon,title,desc],i)=><motion.div initial="hidden" whileInView="show" viewport={{once:true}} variants={fade} transition={{delay:i*.1}} key={title} className="rounded-[2rem] border border-orange-100 bg-white p-7 shadow-sm"><div className="grid h-16 w-16 place-items-center rounded-2xl bg-green-100 text-3xl">{icon}</div><h3 className="mt-6 text-2xl font-black">{title}</h3><p className="mt-2 leading-7 text-slate-500">{desc}</p></motion.div>)}</div></div></section>

  <section className="px-4 py-20 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="text-center"><p className="font-black uppercase tracking-[.25em] text-green-500">Happy customers</p><h2 className="mt-2 text-4xl font-black sm:text-5xl">Spoonfuls of love.</h2></div><div className="mt-10 grid gap-5 md:grid-cols-3">{[['Fresh and filling. I ordered again the next week.','Ada N.'],['Beautiful presentation and really creamy yoghurt.','Tomi A.'],['The fruit layers make this such an easy treat.','Mariam O.']].map(([q,n])=><motion.div whileHover={{y:-5}} key={n} className="rounded-[2rem] bg-slate-50 p-7"><div className="flex gap-1 text-yellow-400">{[1,2,3,4,5].map(x=><Star key={x} size={17} fill="currentColor"/>)}</div><p className="mt-5 text-lg font-bold leading-8">“{q}”</p><p className="mt-5 text-sm font-black text-slate-400">{n}</p></motion.div>)}</div></div></section>

  <section id="contact" className="relative overflow-hidden bg-green-500 px-4 py-20 sm:px-6 lg:px-8 lg:py-28"><div className="pointer-events-none absolute -right-16 -top-16 text-[13rem] opacity-20">🍊</div><div className="pointer-events-none absolute -bottom-20 -left-10 text-[12rem] opacity-15">🍓</div><div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center"><div className="text-white"><p className="font-black uppercase tracking-[.25em] text-green-950">Order & contact</p><h2 className="mt-3 text-5xl font-black leading-none sm:text-6xl">Your next<br/>favourite cup<br/><span className="text-yellow-300">is waiting.</span></h2><p className="mt-6 max-w-lg text-lg leading-8 text-green-950/80">Visit us or send your order request. For the fastest response, chat with Fruit Fusion on WhatsApp.</p><a className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#18221B] px-7 py-4 font-black text-white shadow-xl hover:bg-orange-500" href="https://wa.me/2348050639359" target="_blank" rel="noreferrer"><MessageCircle size={19}/> Order on WhatsApp</a></div><form onSubmit={async e=>{e.preventDefault();const f=new FormData(e.currentTarget);try{await api.post('/api/leads',{name:f.get('name'),phone:f.get('phone'),message:f.get('message')});setToast('Order request sent!');(e.currentTarget as HTMLFormElement).reset()}catch{setToast('Please use WhatsApp to order.')}setTimeout(()=>setToast(''),2500)}} className="rounded-[2rem] bg-white p-6 shadow-2xl sm:p-8"><h3 className="text-2xl font-black">Place an enquiry</h3><p className="mt-1 text-sm text-slate-500">Tell us what you would like.</p><div className="mt-5 grid gap-3"><input required name="name" placeholder="Your name" className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-green-500"/><input required name="phone" placeholder="Phone number" className="rounded-2xl border border-slate-200 p-4 outline-none focus:border-green-500"/><textarea required name="message" placeholder="What would you like to order?" rows={4} className="resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-green-500"/><button className="rounded-2xl bg-orange-500 py-4 font-black text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600">Send request</button></div></form></div></section>

  <footer className="bg-[#18221B] px-4 py-12 text-white sm:px-6 lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4"><div className="sm:col-span-2"><img src="/resources/logo.jpeg" alt="Fruit Fusion" className="h-16 w-36 rounded-xl bg-white object-contain p-1"/><p className="mt-4 max-w-sm text-slate-400">Fresh yoghurt & parfaits made with love in Abule Egba, Lagos.</p></div><div><h4 className="font-black">Find us</h4><div className="mt-4 grid gap-3 text-sm text-slate-400"><span className="flex gap-2"><MapPin size={16}/>21 Ifelodun St, off Sunny Balogun, Abule Egba, Lagos 100001</span><a href="tel:+2348050639359" className="flex gap-2"><MessageCircle size={16}/>0805 063 9359</a><span className="flex gap-2"><Clock size={16}/>Open · Closes 7:30 PM</span></div></div><div><h4 className="font-black">Quick links</h4><div className="mt-4 grid gap-3 text-sm text-slate-400"><button className="text-left" onClick={()=>go('menu')}>Menu</button><button className="text-left" onClick={()=>go('about')}>Our story</button><a href="https://www.instagram.com/" className="flex gap-2"><Instagram size={16}/>Instagram</a></div></div></div><div className="mx-auto mt-10 flex max-w-7xl flex-col gap-4 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:justify-between"><span>© 2026 Fruit Fusion. All rights reserved.</span><button onClick={()=>owner?setAdmin(true):login()} className="flex items-center gap-2 self-start font-bold text-slate-400 hover:text-white">{owner?<Pencil size={14}/>:<LogIn size={14}/>} {owner?'Owner dashboard':'Owner login'}</button></div></footer>

  <AnimatePresence>{toast&&<motion.div initial={{opacity:0,y:20,scale:.95}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:20}} className="fixed bottom-5 left-1/2 z-[90] -translate-x-1/2 rounded-full bg-[#18221B] px-5 py-3 text-sm font-black text-white shadow-2xl"><span className="mr-2 text-green-400">✓</span>{toast}</motion.div>}</AnimatePresence>
  <AnimatePresence>{drawer&&<><motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setDrawer(false)} className="fixed inset-0 z-[60] bg-black/50"/><motion.aside initial={{x:'100%'}} animate={{x:0}} exit={{x:'100%'}} transition={{type:'spring',damping:28}} className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-white p-6 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-3xl font-black">Your order</h2><button onClick={()=>setDrawer(false)} className="rounded-full border p-2"><X size={18}/></button></div><div className="mt-6 flex-1 overflow-auto">{cart.length===0?<div className="py-24 text-center text-slate-400"><ShoppingBag className="mx-auto" size={40}/><p className="mt-4 font-bold">Your order is empty.</p><button onClick={()=>{setDrawer(false);go('menu')}} className="mt-5 rounded-full bg-green-500 px-5 py-3 font-black text-white">Browse menu</button></div>:<div className="grid gap-3">{cart.map((p,i)=><div key={i} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3"><img src={p.image} alt="" className="h-16 w-16 rounded-xl object-cover"/><div className="flex-1"><b>{p.name}</b><p className="text-sm text-slate-500">{money(p.price)}</p></div><button onClick={()=>setCart(c=>c.filter((_,j)=>j!==i))} className="rounded-full border p-2"><Minus size={14}/></button></div>)}</div>}</div>{cart.length>0&&<div className="border-t pt-5"><h3 className="mb-3 text-lg font-black">How would you like to receive your order?</h3><div className="grid grid-cols-2 gap-2"><button type="button" onClick={()=>setDelivery('pickup')} className={'rounded-xl border-2 p-3 text-sm font-black '+(delivery==='pickup'?'border-green-500 bg-green-50 text-green-700':'border-slate-200')}>🏪 Pickup</button><button type="button" onClick={()=>setDelivery('home')} className={'rounded-xl border-2 p-3 text-sm font-black '+(delivery==='home'?'border-green-500 bg-green-50 text-green-700':'border-slate-200')}>🛵 Home delivery</button></div>{delivery==='home'&&<div className="mt-4 grid gap-2"><p className="text-sm font-bold text-slate-500">Delivery fee: {money(deliveryFee)}</p><input value={deliveryDetails.name} onChange={e=>setDeliveryDetails({...deliveryDetails,name:e.target.value})} required placeholder="Full name" className="rounded-xl border p-3"/><input value={deliveryDetails.phone} onChange={e=>setDeliveryDetails({...deliveryDetails,phone:e.target.value})} required placeholder="Phone number" className="rounded-xl border p-3"/><textarea value={deliveryDetails.address} onChange={e=>setDeliveryDetails({...deliveryDetails,address:e.target.value})} required placeholder="Full delivery address" rows={2} className="rounded-xl border p-3"/><input value={deliveryDetails.landmark} onChange={e=>setDeliveryDetails({...deliveryDetails,landmark:e.target.value})} placeholder="Nearest landmark (optional)" className="rounded-xl border p-3"/><textarea value={deliveryDetails.note} onChange={e=>setDeliveryDetails({...deliveryDetails,note:e.target.value})} placeholder="Delivery note (optional)" rows={2} className="rounded-xl border p-3"/></div>}<div className="my-4 flex justify-between text-lg font-black"><span>Total</span><span className="text-orange-500">{money(grandTotal)}</span></div><a href="#" onClick={async e=>{e.preventDefault();if(!deliveryReady){setToast('Please complete your delivery name, phone and address.');setTimeout(()=>setToast(''),2500);return}try{const grouped=cart.reduce((a,p)=>{const found=a.find(x=>x.id===p.id);if(found)found.qty+=1;else a.push({id:p.id,qty:1});return a},[] as Array<{id:string;qty:number}>);await api.post('/api/orders',{items:grouped,delivery,deliveryDetails,total:grandTotal});setDrawer(false);window.location.href='https://wa.me/2348050639359?text='+encodeURIComponent(whatsappText)}catch{setToast('Could not save your order. Please try again.');setTimeout(()=>setToast(''),3000)}}} className={'block rounded-2xl py-4 text-center font-black text-white '+(deliveryReady?'bg-green-500':'bg-slate-300')}>Checkout on WhatsApp</a></div>}</motion.aside></>}</AnimatePresence>
  {admin&&<Admin owner={owner} products={ps} setProducts={setPs} edit={edit} setEdit={setEdit} close={()=>setAdmin(false)} logout={async()=>{await auth.signOut();setOwner(null);setAdmin(false)}}/>}
 </div>
}

function Admin({owner,products,setProducts,edit,setEdit,close,logout}:{owner:any;products:P[];setProducts:(p:P[])=>void;edit:P|null;setEdit:(p:P|null)=>void;close:()=>void;logout:()=>void}){
 const blank=():P=>({id:'',name:'',category:'Parfait',price:0,description:'',image:'',imagePath:'',available:true,featured:false,stock:10});
 const[f,setF]=useState<P>(edit||blank());
 const[busy,setBusy]=useState(false);
 const[tab,setTab]=useState<'products'|'orders'>('products');
 const[orders,setOrders]=useState<any[]>([]);
 const[notice,setNotice]=useState('');
 useEffect(()=>setF(edit||blank()),[edit]);
 
async function refreshOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;

  setOrders(
    (data || []).map((o) => ({
      id: o.id,
      createdAt: o.created_at,
      delivery:
        o.fulfillment_method === 'delivery' ? 'home' : 'pickup',
      total: Number(o.total_amount),
      deliveryDetails: {
        name: o.customer_name,
        phone: o.customer_phone,
        address: o.delivery_address || '',
      },
      items: (o.order_items || []).map((item) => ({
        name: item.product_name,
        qty: item.quantity,
        price: Number(item.unit_price),
        subtotal: Number(item.subtotal),
      })),
      status: ({
        pending: 'New',
        confirmed: 'Confirmed',
        preparing: 'Preparing',
        out_for_delivery: 'Ready for delivery',
        completed: 'Completed',
        cancelled: 'Cancelled',
      } as Record<string, string>)[o.status] || o.status,
    }))
  );
}

 
useEffect(() => {
  async function loadProducts() {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setNotice('Could not load products: ' + error.message);
      return;
    }

    setProducts(
      (data || []).map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category || 'Parfait',
        price: Number(p.price),
        description: p.description || '',
        image: p.image_url || '',
        available: p.available,
        featured: p.featured ?? false,
        stock: p.stock ?? 0,
      }))
    );
  }

  loadProducts().catch(() =>
    setNotice('Could not load products. Please refresh.')
  );

  refreshOrders().catch(() =>
    setNotice('Could not load orders. Please refresh.')
  );
}, []);

 const upload=async(x:File)=>{if(!x.type.startsWith('image/')){setNotice('Please choose an image file.');return}const reader=new FileReader();reader.onload=async()=>{setBusy(true);try{const raw=String(reader.result);const q=await api.post('/api/uploads',{filename:x.name,content:raw.split(',')[1],contentType:x.type});setF(old=>({...old,image:q.data.url,imagePath:q.data.path}));setNotice('Photo uploaded. Save the product to keep it.')}catch{setNotice('Image upload failed. Please try again.')}finally{setBusy(false)}};reader.readAsDataURL(x)};
 
const save = async (e: React.FormEvent) => {
  e.preventDefault();

  if (!f.name.trim() || f.price < 0 || f.stock < 0) {
    setNotice('Enter a name, valid price and stock quantity.');
    return;
  }

  setBusy(true);
  setNotice('');

  try {
    const payload = {
      name: f.name.trim(),
      category: f.category,
      price: Number(f.price),
      description: f.description,
      image_url: f.image,
      available: f.available,
      featured: f.featured ?? false,
      stock: Number(f.stock),
    };

    const result = f.id
      ? await supabase
          .from('products')
          .update(payload)
          .eq('id', f.id)
          .select()
          .single()
      : await supabase
          .from('products')
          .insert(payload)
          .select()
          .single();

    if (result.error) throw result.error;

    const p = result.data;

    const savedProduct: P = {
      id: p.id,
      name: p.name,
      category: p.category || 'Parfait',
      price: Number(p.price),
      description: p.description || '',
      image: p.image_url || '',
      imagePath: f.imagePath,
      available: p.available,
      featured: p.featured ?? false,
      stock: p.stock ?? 0,
    };

    setProducts((current) =>
      f.id
        ? current.map((item) =>
            item.id === savedProduct.id ? savedProduct : item
          )
        : [savedProduct, ...current]
    );

    setEdit(null);
    setF(blank());
    setNotice('Product saved successfully.');
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown error';
    setNotice('Could not save product: ' + message);
  } finally {
    setBusy(false);
  }
};

 const remove=async(p:P)=>{if(!confirm('Delete '+p.name+'? This cannot be undone.'))return;try{await api.delete('/api/products/'+p.id);setProducts(products.filter(x=>x.id!==p.id));if(edit?.id===p.id){setEdit(null);setF(blank())}setNotice('Product deleted.')}catch{setNotice('Could not delete product.')}};
 const status=async(id:string,value:string)=>{try{await api.put('/api/admin/orders/'+id,{status:value});await refreshOrders();setNotice('Order status updated.')}catch{setNotice('Could not update order status.')}};
 const startNew=()=>{setEdit(null);setF(blank())};
 return <div className="fixed inset-0 z-[100] overflow-auto bg-black/70 p-3 sm:p-5"><div className="mx-auto my-3 max-w-6xl rounded-[2rem] bg-white p-5 shadow-2xl sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-widest text-green-600">Private owner area</p><h2 className="mt-1 text-3xl font-black">Fruit Fusion dashboard</h2><p className="mt-1 text-sm text-slate-500">{owner?.email}</p></div><div className="flex gap-2"><button onClick={logout} className="flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-bold"><LogOut size={16}/> Sign out</button><button onClick={close} className="rounded-full border p-3" aria-label="Close dashboard"><X size={16}/></button></div></div>
 <div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-green-50 p-4"><p className="text-sm font-bold text-green-700">Products</p><p className="mt-1 text-3xl font-black">{products.length}</p></div><div className="rounded-2xl bg-orange-50 p-4"><p className="text-sm font-bold text-orange-700">Orders</p><p className="mt-1 text-3xl font-black">{orders.length}</p></div><div className="rounded-2xl bg-yellow-50 p-4"><p className="text-sm font-bold text-yellow-800">Needs attention</p><p className="mt-1 text-3xl font-black">{orders.filter(o=>!['Completed','Cancelled'].includes(o.status)).length}</p></div></div>
 <div className="mt-6 flex gap-2"><button onClick={()=>setTab('products')} className={'rounded-full px-5 py-3 text-sm font-black '+(tab==='products'?'bg-[#18221B] text-white':'bg-slate-100')}>Products & stock</button><button onClick={()=>{setTab('orders');refreshOrders().catch(()=>setNotice('Could not refresh orders.'))}} className={'rounded-full px-5 py-3 text-sm font-black '+(tab==='orders'?'bg-[#18221B] text-white':'bg-slate-100')}>Orders</button></div>
 {notice&&<p className="mt-4 rounded-xl bg-green-50 p-3 text-sm font-semibold text-green-800">{notice}</p>}
 {tab==='products'?<div className="mt-5 grid gap-6 lg:grid-cols-[.95fr_1.05fr]"><form onSubmit={save} className="order-2 grid h-fit gap-3 rounded-3xl bg-slate-50 p-5 lg:order-1"><div className="flex items-center justify-between"><h3 className="text-xl font-black">{f.id?'Edit product':'Add a product'}</h3>{f.id&&<button type="button" onClick={startNew} className="text-sm font-bold text-slate-500">Cancel edit</button>}</div><label className="grid gap-1 text-sm font-bold">Product name<input required value={f.name} onChange={e=>setF({...f,name:e.target.value})} placeholder="e.g. Mango parfait" className="rounded-xl border bg-white p-3 font-normal"/></label><div className="grid grid-cols-2 gap-3"><label className="grid gap-1 text-sm font-bold">Category<input required value={f.category} onChange={e=>setF({...f,category:e.target.value})} placeholder="Parfait" className="min-w-0 rounded-xl border bg-white p-3 font-normal"/></label><label className="grid gap-1 text-sm font-bold">Price (₦)<input required min="0" type="number" value={f.price} onChange={e=>setF({...f,price:Number(e.target.value)})} className="min-w-0 rounded-xl border bg-white p-3 font-normal"/></label><label className="grid gap-1 text-sm font-bold">Stock quantity<input required min="0" step="1" type="number" value={f.stock??0} onChange={e=>setF({...f,stock:Number(e.target.value)})} className="min-w-0 rounded-xl border bg-white p-3 font-normal"/></label></div><label className="grid gap-1 text-sm font-bold">Description<textarea required rows={3} value={f.description} onChange={e=>setF({...f,description:e.target.value})} className="rounded-xl border bg-white p-3 font-normal"/></label><label className="flex items-center gap-2 rounded-xl border bg-white p-3 text-sm font-bold"><Upload size={16}/> Upload product photo<input type="file" accept="image/*" className="min-w-0 flex-1 text-xs font-normal" onChange={e=>e.target.files?.[0]&&upload(e.target.files[0])}/></label>{f.image&&<img src={f.image} alt="Product preview" className="h-40 w-full rounded-xl object-cover"/>}<label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={f.available} onChange={e=>setF({...f,available:e.target.checked})}/> Show product on the public menu</label><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" checked={!!f.featured} onChange={e=>setF({...f,featured:e.target.checked})}/> Mark as bestseller</label><button disabled={busy} className="rounded-xl bg-green-500 py-3.5 font-black text-white disabled:opacity-50">{busy?'Working…':f.id?'Save changes':'Add product'}</button></form>
 <div className="order-1 space-y-3 lg:order-2"><div className="flex items-center justify-between"><h3 className="font-black">Your products ({products.length})</h3><button onClick={()=>api.get('/api/products').then(r=>setProducts(r.data.products||[])).catch(()=>setNotice('Refresh failed.'))} className="text-sm font-bold text-green-700">Refresh</button></div>{products.map(p=><article key={p.id} className="flex gap-3 rounded-2xl border p-3"><img src={p.image} alt={p.name} className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 object-cover"/><div className="min-w-0 flex-1"><b className="block truncate">{p.name}</b><p className="mt-1 text-sm text-slate-500">{money(p.price)} · Stock: {p.stock??0}</p><p className="text-xs text-slate-400">{p.available?'Visible on menu':'Hidden from menu'}</p></div><div className="flex gap-1"><button onClick={()=>{setEdit(p);setF(p)}} className="rounded-full border p-2" aria-label={'Edit '+p.name}><Pencil size={15}/></button><button onClick={()=>remove(p)} className="rounded-full border p-2 text-red-500" aria-label={'Delete '+p.name}><Trash2 size={15}/></button></div></article>)}</div></div>:<div className="mt-5 space-y-3">{orders.length===0?<div className="rounded-2xl bg-slate-50 p-8 text-center text-slate-500">No saved orders yet. Orders placed through website checkout will appear here.</div>:orders.map(o=><article key={o.id} className="rounded-2xl border p-4 sm:p-5"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="font-black">Order #{String(o.id).slice(0,8)}</p><p className="mt-1 text-sm text-slate-500">{new Date(o.createdAt).toLocaleString()}</p><p className="mt-2 text-sm font-bold">{o.delivery==='home'?'Home delivery':'Pickup'} · {money(o.total)}</p>{o.deliveryDetails?.name&&<p className="mt-1 text-sm text-slate-600">{o.deliveryDetails.name} · {o.deliveryDetails.phone}<br/>{o.deliveryDetails.address}</p>}</div><select value={o.status||'New'} onChange={e=>status(o.id,e.target.value)} className="h-fit rounded-xl border p-3 text-sm font-bold"><option>New</option><option>Confirmed</option><option>Preparing</option><option>Ready for delivery</option><option>Completed</option><option>Cancelled</option></select></div><div className="mt-4 border-t pt-3 text-sm text-slate-600">{(o.items||[]).map((i:any,n:number)=><span key={n} className="mr-3 inline-block">{i.name} × {i.qty}</span>)}</div></article>)}</div>}
 </div></div>
}
