/* Purebaric, shared warm-site behavior: mobile nav */
function toggleMenu(){var m=document.getElementById('mobileMenu'),b=document.querySelector('.nav-toggle');if(!m)return;var open=m.classList.toggle('open');if(b)b.setAttribute('aria-expanded',open);}
