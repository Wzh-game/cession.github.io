
(function(){
  const intro=document.getElementById('gameIntro');
  if(!intro)return;
  intro.addEventListener('animationend',function(e){
    if(e.target===intro&&e.animationName==='introBackdrop')intro.remove();
  });
  window.setTimeout(function(){if(intro.isConnected)intro.remove();},8500);
})();
