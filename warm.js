/* Purebaric, shared warm-site behavior: mobile nav */
function toggleMenu(){var m=document.getElementById('mobileMenu'),b=document.querySelector('.nav-toggle');if(!m)return;var open=m.classList.toggle('open');if(b)b.setAttribute('aria-expanded',open);}

/* Booking mode: when the admin has switched the site to "book with a delivery date", every
   reserve/request call to action reads as booking. Elements with data-book-text swap their copy. */
(function(){
  try{
    fetch('/api/delivery-availability').then(function(r){return r.json();}).then(function(j){
      if(!j||j.mode!=='book')return;
      document.body.classList.add('bookmode-site');
      var map=[[/^Request a business rental( →)?$/,'Book a business rental$1'],[/^Request reservation$/,'Book a chamber'],[/^Reserve a chamber( →)?$/,'Book a chamber$1'],[/^Reserve( →)?$/,'Book$1']];
      document.querySelectorAll('a[href^="/book"]').forEach(function(a){
        var t=a.textContent.trim();
        map.forEach(function(m){ if(m[0].test(t)) a.textContent=t.replace(m[0],m[1]); });
      });
      document.querySelectorAll('[data-book-text]').forEach(function(el){ el.textContent=el.getAttribute('data-book-text'); });
    }).catch(function(){});
  }catch(e){}
})();
