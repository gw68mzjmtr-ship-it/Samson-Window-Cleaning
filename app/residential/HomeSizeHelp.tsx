'use client';
import {useId,useState} from 'react';
import './home-size-help.css';

export default function HomeSizeHelp(){
 const addressId=useId();
 const [address,setAddress]=useState('');
 return <details className="rhSqftFinder">
  <summary>Don’t know your square footage? Find it here.</summary>
  <p>Search your home address, then enter the home’s living area above. Use the house size, rather than the lot size. We’ll verify square footage on site and confirm any price change before work begins.</p>
  <form action="https://www.google.com/search" method="get" target="_blank" rel="noopener noreferrer">
   <label htmlFor={addressId}>Home address for your search</label>
   <div className="rhSqftSearchRow">
    <input id={addressId} type="text" autoComplete="street-address" maxLength={250} placeholder="Street address, city and state" value={address} onChange={event=>setAddress(event.target.value)}/>
    <input type="hidden" name="q" value={address.trim()+' home square footage'}/>
    <button type="submit" disabled={!address.trim()}>Look up on Google ↗</button>
   </div>
   <small>Opens Google in a new tab. Check the result, then enter the square footage in the calculator.</small>
  </form>
 </details>;
}
