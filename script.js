document.addEventListener('DOMContentLoaded', function () {

  /* ---------- Mobile nav toggle ---------- */
  const menuBtn = document.getElementById('menuBtn');
  const mainNav = document.getElementById('mainNav');
  if(menuBtn && mainNav){
    menuBtn.addEventListener('click', () => {
      const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!expanded));
      if(!expanded){
        mainNav.style.display = 'flex';
      } else {
        mainNav.style.display = 'none';
      }
    });

    document.addEventListener('click', (e) => {
      if(window.innerWidth < 920){
        if(!menuBtn.contains(e.target) && !mainNav.contains(e.target)){
          mainNav.style.display = 'none';
          menuBtn.setAttribute('aria-expanded', 'false');
        }
      }
    });

    window.addEventListener('resize', () => {
      if(window.innerWidth >= 920){
        mainNav.style.display = 'flex';
      } else {
        mainNav.style.display = 'none';
        menuBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Reviews card slider (auto + manual + touch) ---------- */
  (function(){
    const track = document.getElementById('reviewsTrack');
    const prev = document.getElementById('prevReview');
    const next = document.getElementById('nextReview');
    const dotsWrap = document.getElementById('reviewDots');
    if(!track) return;

    const slides = Array.from(track.children);
    const total = slides.length;
    let index = 0;
    let slideWidth = slides[0].getBoundingClientRect().width + parseInt(getComputedStyle(track).gap || 12);

    // set up dots
    for(let i=0;i<total;i++){
      const dot = document.createElement('button');
      dot.className = 'dot' + (i===0 ? ' active' : '');
      dot.setAttribute('data-index', i);
      dotsWrap.appendChild(dot);
      dot.addEventListener('click', ()=> goTo(i));
    }

    function updateDims(){
      slideWidth = slides[0].getBoundingClientRect().width + (parseInt(getComputedStyle(track).gap) || 12);
      goTo(index, true);
    }

    function goTo(i, instant){
      index = Math.max(0, Math.min(i, total-1));
      const x = index * slideWidth;
      if(instant) track.style.transition = 'none';
      else track.style.transition = 'transform .45s cubic-bezier(.2,.9,.3,1)';
      track.style.transform = `translateX(${-x}px)`;
      // update dots
      document.querySelectorAll('.dot').forEach(d=>d.classList.remove('active'));
      const activeDot = document.querySelector(`.dot[data-index="${index}"]`);
      if(activeDot) activeDot.classList.add('active');
      // restore transition
      if(instant) setTimeout(()=> track.style.transition = 'transform .45s cubic-bezier(.2,.9,.3,1)', 50);
    }

    next?.addEventListener('click', ()=> goTo(index + 1));
    prev?.addEventListener('click', ()=> goTo(index - 1));

    // touch support for track
    let startX = 0, currentX = 0, grabbing=false;
    track.addEventListener('touchstart', (e)=> {
      startX = e.touches[0].clientX;
      grabbing = true;
    }, {passive:true});
    track.addEventListener('touchmove', (e)=> {
      if(!grabbing) return;
      currentX = e.touches[0].clientX;
      const dx = currentX - startX;
      track.style.transform = `translateX(${-index * slideWidth + -dx}px)`;
      track.style.transition = 'none';
    }, {passive:true});
    track.addEventListener('touchend', (e)=> {
      grabbing = false;
      const dx = (e.changedTouches && e.changedTouches[0].clientX) ? (e.changedTouches[0].clientX - startX) : 0;
      if(Math.abs(dx) > 50){
        if(dx < 0) goTo(index + 1);
        else goTo(index - 1);
      } else {
        goTo(index);
      }
    });

    // auto play
    let autoplay = setInterval(()=> {
      index = (index + 1) % total;
      goTo(index);
    }, 5000);

    // pause on hover/focus
    track.addEventListener('mouseenter', ()=> clearInterval(autoplay));
    track.addEventListener('mouseleave', ()=> autoplay = setInterval(()=> { index = (index + 1) % total; goTo(index); }, 5000));
    window.addEventListener('resize', updateDims);

    // initial
    updateDims();
  })();

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-target');
      const a = document.getElementById(id);
      if(!a) return;
      document.querySelectorAll('.faq-a').forEach(x => { if(x !== a) x.style.maxHeight = '0' });
      if(a.style.maxHeight && a.style.maxHeight !== '0px'){
        a.style.maxHeight = '0';
      } else {
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Modal preview ---------- */
  const modal = document.getElementById('modal');
  const previewBtn = document.getElementById('previewBtn');
  const closeModal = document.getElementById('closeModal');
  previewBtn?.addEventListener('click', ()=> {
    if(modal){ modal.classList.remove('hidden'); modal.setAttribute('aria-hidden','false'); }
  });
  closeModal?.addEventListener('click', ()=> {
    if(modal){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); }
  });
  modal?.addEventListener('click', (e)=> { if(e.target === modal){ modal.classList.add('hidden'); modal.setAttribute('aria-hidden','true'); } });

  /* ---------- Razorpay checkout flow ----------
     Note: Razorpay order creation must be done on your server.
     - POST /create_order  -> returns { orderId, key }
     - POST /verify_payment -> verify signature server-side
  ----------------------------------------------- */
  const priceINR = 39;
  const amountPaise = priceINR * 100;

  async function createOrderOnServer() {
    const res = await fetch('/create_order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: `AIWB_${Date.now()}`,
        product: 'AI Wealth Blueprint (eBook)'
      })
    });
    if(!res.ok) throw new Error('Order creation failed');
    return res.json(); // expected { orderId, key }
  }

  function loadRazorpayScript() {
    return new Promise((resolve, reject) => {
      if(window.Razorpay) return resolve(true);
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error('Razorpay SDK failed to load'));
      document.head.appendChild(s);
    });
  }

  async function openCheckout() {
    try {
      await loadRazorpayScript();
      const data = await createOrderOnServer();
      const options = {
        key: data.key || 'rzp_test_YOUR_KEY',
        amount: amountPaise,
        currency: 'INR',
        name: 'AI Wealth Blueprint',
        description: '365-day eBook + Templates',
        order_id: data.orderId,
        handler: async function (response){
          // response contains razorpay_payment_id, razorpay_order_id, razorpay_signature
          // verify on server
          const verify = await fetch('/verify_payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(response)
          });
          const result = await verify.json();
          if(verify.ok && result.success){
            alert('Payment successful! Check your email for download link.');
            window.location.href = '/thankyou';
          } else {
            alert('Payment verification failed. Contact support.');
          }
        },
        prefill: { name: '', email: '' },
        theme: { color: '#211C84' }
      };
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error(err);
      alert('Could not open payment gateway. See console for details.');
    }
  }

  document.getElementById('buyBtn')?.addEventListener('click', openCheckout);
  document.getElementById('buyBtn2')?.addEventListener('click', openCheckout);

});
