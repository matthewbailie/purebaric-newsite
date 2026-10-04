/* Purebaric, shared warm-site behavior: mobile nav */
function toggleMenu(){var m=document.getElementById('mobileMenu'),b=document.querySelector('.nav-toggle');if(!m)return;var open=m.classList.toggle('open');if(b)b.setAttribute('aria-expanded',open);}

/* Booking mode: the pages are written in "book" wording. When the admin has the site in request mode,
   the calls to action read as reservation requests instead. The last known mode is remembered so a
   returning visitor sees the right wording on first paint, with no swap. */
(function(){
  var KEY='pb_booking_mode';
  function apply(mode){
    var req=mode==='request';
    document.documentElement.classList.toggle('reqmode-site',req);
    var map=req?[[/^Book a business rental( →)?$/,'Request a business rental$1'],[/^Book a chamber( →)?$/,'Reserve a chamber$1'],[/^Book now$/,'Reserve'],[/^Book →$/,'Reserve →']]
               :[[/^Request a business rental( →)?$/,'Book a business rental$1'],[/^Request reservation$/,'Book a chamber'],[/^Reserve a chamber( →)?$/,'Book a chamber$1'],[/^Reserve$/,'Book now'],[/^Reserve →$/,'Book →']];
    document.querySelectorAll('a[href^="/book"]').forEach(function(a){ var t=a.textContent.trim(); map.forEach(function(m){ if(m[0].test(t)) a.textContent=t.replace(m[0],m[1]); }); });
    document.querySelectorAll('[data-request-text]').forEach(function(el){ if(!el.dataset.bookText)el.dataset.bookText=el.textContent; el.textContent=req?el.getAttribute('data-request-text'):el.dataset.bookText; });
  }
  var cached=null; try{cached=localStorage.getItem(KEY);}catch(e){}
  if(cached==='request')apply('request');
  try{
    fetch('/api/delivery-availability').then(function(r){return r.json();}).then(function(j){
      var mode=j&&j.mode==='book'?'book':'request';
      try{localStorage.setItem(KEY,mode);}catch(e){}
      if(mode!==(cached||'book'))apply(mode);
    }).catch(function(){});
  }catch(e){}
})();
