"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import styles from "./MyOrders.module.css";
const API=process.env.NEXT_PUBLIC_API_URL||"http://localhost:4000";
type O={orderNumber:string;status:string;productName:string;variantLabel?:string;finalPrice:number;pickupDate:string;createdAt?:string};
const label=(s:string)=>s.replace(/_/g," ");
const money=(v:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number(v||0));
export default function MyOrders(){
 const [orders,setOrders]=useState<O[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{fetch(`${API}/orders/my-orders`,{credentials:"include",cache:"no-store"}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.message||"Unable to load orders");return d}).then(d=>setOrders(Array.isArray(d)?d:[])).catch(e=>setError(e.message)).finally(()=>setLoading(false))},[]);
 return <main className={styles.page}><div className={styles.shell}><div className={styles.heading}><span>MY ORDERS</span><h1>Your orders</h1><p>All orders linked to your verified mobile number.</p></div>
 {loading&&<div className={styles.empty}>Loading...</div>}{error&&<div className={styles.error}>{error}</div>}
 {!loading&&!error&&!orders.length&&<div className={styles.empty}>No orders found.</div>}
 <div className={styles.list}>{orders.map(o=><article className={styles.order} key={o.orderNumber}><div className={styles.top}><div><small>{o.orderNumber}</small><h2>{o.productName}</h2><p>{o.variantLabel||"—"}</p></div><span>{label(o.status)}</span></div><div className={styles.bottom}><strong>{money(o.finalPrice)}</strong><Link href={`/my-orders/${encodeURIComponent(o.orderNumber)}`}>View Details</Link></div></article>)}</div>
 </div></main>
}