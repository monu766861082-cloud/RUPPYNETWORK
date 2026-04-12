// RUPPY TRANSLATE BAR KILLER - Clean English Version
(function() {
  // 1. Inject CSS to hide all Google elements
  const css = `
    iframe.goog-te-banner-frame, 
    .goog-te-banner-frame.skiptranslate,
    #goog-gt-tt,
    .goog-te-balloon-frame,
    .VIpgJd-ZVi9od-ORHb-OEVmcd,
    .VIpgJd-ZVi9od-ORHb,
    .VIpgJd-yAWNEb-VIpgJd-fmcmS,
    .goog-tooltip,
    #google_translate_element { 
      display:none!important; 
      visibility:hidden!important; 
      height:0!important; 
      width:0!important;
    }
    body, html { 
      top:0px!important; 
      margin-top:0!important; 
      position:static!important;
    }
    .goog-text-highlight { 
      background:none!important; 
      box-shadow:none!important;
    }
  `;
  
  const style = document.createElement('style');
  style.innerHTML = css;
  document.head.appendChild(style);
  
  // 2. Force remove bar every 500ms
  setInterval(() => {
    const frames = document.querySelectorAll('iframe.goog-te-banner-frame');
    frames.forEach(f => f.remove());
    document.body.style.top = '0px';
    document.documentElement.style.marginTop = '0px';
    
    // Remove bottom popup also
    const popups = document.querySelectorAll('#goog-gt-tt, .VIpgJd-yAWNEb-VIpgJd-fmcmS');
    popups.forEach(p => p.remove());
  }, 500);
})();
