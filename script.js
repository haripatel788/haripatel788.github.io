const menuButton=document.querySelector('.menu-button');const navLinks=document.querySelector('.nav-links');
function setMenu(open){menuButton.setAttribute('aria-expanded',String(open));menuButton.setAttribute('aria-label',open?'Close navigation':'Open navigation');navLinks.classList.toggle('open',open);document.body.classList.toggle('menu-open',open)}
menuButton.addEventListener('click',()=>setMenu(menuButton.getAttribute('aria-expanded')!=='true'));navLinks.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));document.addEventListener('keydown',event=>{if(event.key==='Escape')setMenu(false)});window.addEventListener('resize',()=>{if(window.innerWidth>820)setMenu(false)});
const reduceMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;const reveals=document.querySelectorAll('.reveal');if(reduceMotion||!('IntersectionObserver'in window)){reveals.forEach(element=>element.classList.add('visible'))}else{const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(!entry.isIntersecting)return;entry.target.classList.add('visible');observer.unobserve(entry.target)})},{threshold:.12,rootMargin:'0px 0px -40px'});reveals.forEach(element=>observer.observe(element))}

const finePointer=window.matchMedia('(hover: hover) and (pointer: fine)');
const cursorDot=document.querySelector('.cursor-dot');
const cursorRing=document.querySelector('.cursor-ring');

if(finePointer.matches&&!reduceMotion&&cursorDot&&cursorRing){
  document.body.classList.add('cursor-ready');
  let mouseX=-100,mouseY=-100,ringX=-100,ringY=-100,frameId;
  const renderCursor=()=>{
    ringX+=(mouseX-ringX)*.18;
    ringY+=(mouseY-ringY)*.18;
    cursorRing.style.transform=`translate3d(${ringX}px,${ringY}px,0)`;
    frameId=requestAnimationFrame(renderCursor);
  };
  const showCursor=(event)=>{
    mouseX=event.clientX;mouseY=event.clientY;
    cursorDot.style.transform=`translate3d(${mouseX}px,${mouseY}px,0)`;
    cursorDot.classList.add('is-visible');cursorRing.classList.add('is-visible');
  };
  window.addEventListener('pointermove',showCursor,{passive:true});
  document.addEventListener('pointerover',(event)=>{
    const interactive=event.target.closest('a,button,[role="button"],.project-card,.capability-grid article');
    cursorDot.classList.toggle('is-hovering',Boolean(interactive));
    cursorRing.classList.toggle('is-hovering',Boolean(interactive));
  });
  document.addEventListener('pointerdown',()=>cursorRing.classList.add('is-pressed'));
  document.addEventListener('pointerup',()=>cursorRing.classList.remove('is-pressed'));
  document.documentElement.addEventListener('mouseleave',()=>{cursorDot.classList.remove('is-visible');cursorRing.classList.remove('is-visible')});
  frameId=requestAnimationFrame(renderCursor);
  window.addEventListener('pagehide',()=>cancelAnimationFrame(frameId),{once:true});
}
