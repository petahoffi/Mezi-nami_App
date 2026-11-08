# Měření a analytika (Michal)

Hotová implementace je v `analytics-config.js`, `analytics.js` a `analytics-debug.js`. Kód je napsaný tak, aby šlo měření **zapnout vyplněním ID** a bez dalších zásahů do aplikace.

## 1. Rychlý start

1. Vytvořte GA4 property a GTM kontejner (viz kapitola 3).
2. Do `analytics-config.js` vyplňte `GTM_ID` (doporučeno) nebo `GA4_ID`. Zbytek nechte prázdný.
3. Push do `main` → Cloudflare Pages nasadí.
4. Otevřete aplikaci s `?analytics_debug=1`, přihlaste se a zapněte souhlas (senior: Profil → Moje soukromí; škola/koordinátorka: lišta dole).

Bez vyplněných ID běží **demo režim**: události jdou jen do `window.dataLayer` a do ladicího panelu, nic neodchází ven.

## 2. Jak to funguje

| Situace | Co se stane |
|---|---|
| Nepřihlášený uživatel | Nic se neměří, nic se nenačítá. |
| Přihlášen, bez souhlasu | Žádný skript třetí strany. Události se zahodí (v panelu vidíte „zahozeno“). |
| Souhlas udělen | Načte se GTM (nebo GA4 přímo), případně Pixel a Cloudflare WA. Consent Mode v2: reklamní úložiště zůstává zamítnuté. |
| Souhlas odvolán | Odesílání se zastaví, cookies `_ga*`/`_fbp` se smažou, příznak `ga-disable` se nastaví. Plně se vše vyčistí po obnovení stránky. |
| Odhlášení | Souhlas se neruší, jen se pozastaví měření do dalšího přihlášení. |

Souhlas seniora je uložený v jeho účtu (přepínač `consents.analytics`). Školy a koordinátorky mají lištu, rozhodnutí se pamatuje v prohlížeči a mění se v nabídce → **Nastavení měření**.

**Nikdy neposíláme:** jména, ID seniorů a škol, texty zpráv, adresy, telefony, polohu. Parametry procházejí filtrem (povolené klíče, max. 100 znaků, e-mail a telefon se zahodí).

**Záměrně neměřeno:** SOS a Hlídáček. Je to citlivé a počítá je interní log aplikace pro koordinátorku.

## 3. Nastavení v Google (jednorázově)

**GA4**
1. Nová property, datový stream „Web“. Zkopírujte Measurement ID (`G-…`).
2. Admin → Data collection: vypnout Google signals, retenci událostí nastavit na 2 měsíce.
3. Admin → Custom definitions → Custom dimensions (rozsah *Event*): `user_role`, `screen_name`, `where`, `response`, `registrant_type`, `mode`, `app_env`. Custom metric: `score`.
4. Admin → Key events: označit `registration_completed`, `request_sent`, `open_call_created`, `chat_request`, `booking_response`.
5. Oddělte prostředí: samostatná property pro demo (`APP_ENV: 'prototype'`) a pro ostrý provoz.

**GTM** (při použití `GTM_ID`; aplikace sama posílá jen `dataLayer.push({event: ...})`)
1. Variables → Data Layer Variable pro každý z parametrů výše (`user_role`, `screen_name`, …).
2. Tag **GA4 Configuration**: Measurement ID, trigger *Initialization – All Pages*, v nastavení zrušit „Send a page view event“.
3. Trigger **Custom Event**, regex `.*` s podmínkou `user_role` *existuje* (zachytí všechny události aplikace).
4. Tag **GA4 Event**: Event Name `{{Event}}`, parametry z Data Layer proměnných, trigger z bodu 3.
5. Publikujte kontejner. Do `GTM_ID` vložte `GTM-…`.

## 4. Katalog událostí

Každá událost nese automaticky `user_role` (`senior` / `school` / `staff`) a `app_env`.

| Událost | Kdy | Další parametry | K čemu |
|---|---|---|---|
| `screen_view` | změna obrazovky/záložky | `screen_name` | cesty uživatelů, nejnavštěvovanější části |
| `login`, `logout` | přihlášení/odhlášení | `method` | frekvence používání |
| `consent_update` | souhlas udělen/odvolán | `analytics` | míra souhlasu |
| `onboarding_completed` | senior dokončí úvodní souhlasy | – | dokončení onboardingu |
| `registration_completed` | koordinátorka zaregistruje seniora/instituci | `registrant_type` | nárůst uživatelů |
| `availability_toggle`, `weekly_pattern_saved`, `week_confirm`, `vacation_set` | senior spravuje dostupnost | – | aktivita seniorů, potvrzování týdnů |
| `request_sent` | škola pošle poptávku seniorovi | – | **klíčová konverze**: spojení škola–senior |
| `open_call_created` | škola vyhlásí open call | – | **klíčová konverze** |
| `booking_response` | senior přijme/odmítne poptávku | `response` | míra přijetí |
| `booking_cancel`, `block_select`, `visit_rating` | detail návštěv | `score` (1–5) | kvalita a spolehlivost |
| `map_view_toggle` | přepnutí mapa/seznam | `mode`, `where` | zda lidé používají mapu |
| `senior_profile_open`, `super_button_open`, `super_button_activated` | použití „hot senior around you“ | – | využití funkcí |
| `chat_request`, `chat_response`, `chat_message_sent`, `community_join` | záložka proti osamělosti | `response` | zapojení (jen počty, žádný obsah) |
| `font_scale_change`, `theme_toggle` | nastavení přístupnosti | `scale` | potřeba velkého písma |
| `privacy_data_open`, `privacy_delete_request`, `report_submitted` | soukromí a moderace | – | důvěra, GDPR žádosti |

## 5. Ověření, že měření funguje (checklist)

1. **Ladicí panel** (`?analytics_debug=1`): stav souhlasu, nasazené nástroje a živý seznam událostí. Bez souhlasu uvidíte „zahozeno“, po souhlasu „odesláno (gtm/ga4)“.
2. **GTM Preview** (Tag Assistant): zadejte adresu aplikace, ověřte, že se vyvolají tagy GA4 po událostech.
3. **GA4 → Admin → DebugView** a **Reports → Realtime**: události musí přijít do ~1 minuty.
4. **DevTools → Network** (filtr `collect`): před souhlasem žádný požadavek na `google-analytics`/`googletagmanager`.
5. **Automatický test:** `npm i --no-save jsdom leaflet leaflet.markercluster && node tests/analytics.test.js` (28 kontrol: souhlas, načítání skriptů, obsah událostí, soukromí).

Poznámka: automatický test běží v simulovaném prohlížeči bez internetu, takže **nepotvrzuje příjem dat v reálném GA4**. To musíte ověřit body 2–4 se skutečnými ID.

## 6. Krátká ukázka pro prezentaci (3 minuty)

1. Otevřít aplikaci s `?analytics_debug=1`, ukázat panel („nic se neměří bez souhlasu“).
2. Přihlásit se jako senior, dát souhlas v Profilu → v panelu naskočí `consent_update`.
3. Projít týden, mapu, odeslat poptávku za školu → v panelu živé události a souhrn počtů.
4. V GA4 Realtime/DebugView ukázat tytéž události. Poté jedno vybrané doporučení: dashboard „Spojení škola–senior“ (`request_sent` → `booking_response` s `response=accept`).

Příklady otázek, na které umíme odpovědět: kolik poptávek se změní na schůzky, jak rychle seniory přijímají poptávky, kolik seniorů potvrzuje týdenní bloky, jestli lidé používají mapu nebo seznam, kolik seniorů potřebuje větší písmo.

## 7. Meta (Facebook) Pixel

Ve výchozím stavu je **vypnutý** (`META_PIXEL_IN_APP: false`). Důvody: předává data Metě pro reklamní účely, v aplikaci pro seniory a školy je to citlivé a vyžaduje samostatný souhlas a úpravu zásad ochrany osobních údajů. Doporučení: nasadit ho jen na veřejný web neziskovky. Pokud ho chcete ukázat v demu, nastavte `META_PIXEL_ID` a `META_PIXEL_IN_APP: true`. Načte se až po souhlasu, bez automatického sbírání polí formulářů (`autoConfig` vypnuto) a mapuje jen `screen_view` → `PageView`, `registration_completed` → `CompleteRegistration`, `request_sent`/`open_call_created` → `Lead`. S `GTM_ID` se Pixel nenačítá přímo, nastavuje se v GTM.

## 8. Další nástroje

- **Cloudflare Web Analytics** (`CF_BEACON_TOKEN`): hosting už běží na Cloudflare, bez cookies, zdarma. Dobrý doplněk k GA4.
- **Plausible / Umami**: bezcookiová alternativa s hostingem v EU, pokud se rozhodne neměřit přes Google.
- **Nedoporučuji** nahrávání relací (Hotjar, Clarity) u seniorů a při práci s citlivými daty.

## 9. Co je třeba doladit s ostatními

- **Vláďa (GDPR):** zkontrolovat texty souhlasu (upravil jsem je, protože GA4 cookies používá), doplnit zásady a seznam zpracovatelů (Google, případně Meta/Cloudflare), uzavřít smlouvu o zpracování dat s Googlem.
- **Petr:** po přidání `GTM_ID` stačí push do `main`. Pokud se zavede CSP hlavička, povolit `googletagmanager.com`, `google-analytics.com`, `connect.facebook.net`, `static.cloudflareinsights.com`.
- **Pavel (až vznikne backend):** přihlášení a registrace budou ve skutečnosti volání serveru, události `login` a `registration_completed` je pak lepší posílat po potvrzení odpovědí serveru.
- Události z formulářů se posílají při odeslání formuláře, tedy i když by pozdější kontrola v aplikaci odeslání odmítla. U prototypu je to přijatelné.
