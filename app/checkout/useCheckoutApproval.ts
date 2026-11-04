import {useState} from 'react';

export function useCheckoutApproval(reviewKey:string) {
  const [approvedKey,setApprovedKey]=useState<string|null>(null);
  const approved=approvedKey===reviewKey;

  // Clear stale approval so returning to an earlier selection still requires a new check.
  if(approvedKey!==null&&!approved)setApprovedKey(null);

  function setApproved(checked:boolean) {
    setApprovedKey(checked?reviewKey:null);
  }

  return [approved,setApproved] as const;
}
