/* Konfigurace měření – jediné místo, které Michal upravuje.
 * Prázdné ID = nástroj se nenačte (nic se neposílá ven).
 * Když jsou všechna ID prázdná, běží "demo režim": události jdou jen do window.dataLayer
 * a do ladicího panelu (otevřít přidáním ?analytics_debug=1 do adresy).
 */
window.MN_ANALYTICS_CONFIG = {
  // Doporučený způsob: Google Tag Manager. GA4 a další značky se pak nastavují v GTM.
  GTM_ID: 'GTM-5TXRDRZD',            // např. 'GTM-ABC1234'

  // Přímé GA4 bez GTM. Použije se jen tehdy, když je GTM_ID prázdné (jinak by se měřilo dvakrát).
  GA4_ID: '',            // např. 'G-ABCDEF1234'

  // Meta (Facebook) Pixel. V aplikaci pro seniory a školy je ve výchozím stavu VYPNUTÝ.
  // Zapněte jen vědomě a jen pro demo – viz ANALYTICS.md, kapitola Meta Pixel.
  META_PIXEL_ID: '',     // např. '123456789012345'
  META_PIXEL_IN_APP: false,

  // Cloudflare Web Analytics (hosting už běží na Cloudflare). Token z dashboardu.
  CF_BEACON_TOKEN: '',   // 32 znaků

  // Popisek prostředí, posílá se jako parametr app_env (oddělí demo od ostrého provozu).
  APP_ENV: 'prototype'
};
