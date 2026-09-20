/* Purebaric, shared warm-site behavior: mobile nav + cookie consent */
function toggleMenu(){var m=document.getElementById('mobileMenu'),b=document.querySelector('.nav-toggle');if(!m)return;var open=m.classList.toggle('open');if(b)b.setAttribute('aria-expanded',open);}
function cookieChoice(accept){try{localStorage.setItem('pb_cookie',accept?'accept':'decline');}catch(e){}var c=document.getElementById('cookie');if(c)c.hidden=true;}
(function(){try{if(!localStorage.getItem('pb_cookie')){var c=document.getElementById('cookie');if(c)c.hidden=false;}}catch(e){}})();
