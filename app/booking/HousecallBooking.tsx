import './booking-request.css';

export default function HousecallBooking({bookingUrl,compact=false}:{bookingUrl:string|null;compact?:boolean}){
 return <section className={compact?'cpRequestReady':'bookingRequest'} aria-label="Book your cleaning">
  <h2>{bookingUrl?'Book your cleaning':'Arrange your cleaning'}</h2>
  <p>{bookingUrl?'Continue to Housecall Pro to choose your service and available appointment. Review your final service details, price and payment there.':'Contact Samson with your address and service needs. We will confirm the details and timing with you.'}</p>
  <a className="mockRedBtn" href={bookingUrl||'mailto:zach@samsonwindowcleaning.com?subject=Window%20cleaning%20request'}>{bookingUrl?'Book with Housecall Pro':'Email Samson'}</a>
  {bookingUrl&&<p className="bookingNote">This calculator is an estimate. Your selections are not transferred automatically. Confirm them in Housecall Pro; a selection here does not reserve a date or authorize a payment.</p>}
 </section>;
}
