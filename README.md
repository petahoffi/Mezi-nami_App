# Mezi-nami_App
Webová aplikace (PWA) pro organizaci Mezi námi, která usnadňuje propojování seniorů se školami a podporuje jejich komunitní setkávání proti osamělosti. Repozitář slouží pro vývoj v rámci týmového studentského projektu.

## Prototyp

Klikací prototyp bez backendu. Všechna data jsou smyšlená a ukládají se jen do `localStorage` prohlížeče.

- `index.html` – kostra stránky, načítá Leaflet z CDN a soubory níže
- `styles.css` – veškeré styly (design tokeny, tmavý režim, škálování písma)
- `data.js` – číselníky a ukázková data (`window.MN_DATA`)
- `app.js` – logika aplikace (role senior / škola / koordinátorka)

Ukázkové účty jsou na přihlašovací obrazovce, heslo pro všechny je `ukazka`.

### Spuštění lokálně

Stačí statický server, build není potřeba:

```
python3 -m http.server 8000
```

a otevřít http://localhost:8000.

### Nasazení na Cloudflare Pages

```
npx wrangler pages deploy . --project-name mezi-nami-app
```

Nebo v Cloudflare dashboardu propojit tento repozitář (Workers & Pages → Create → Pages → Connect to Git), build command prázdný, output directory `/`.

### Automatické nasazení

Každý push do `main` spustí workflow `.github/workflows/deploy.yml`, které prototyp nasadí na Cloudflare Pages. Potřebuje dva repository secrets (Settings → Secrets and variables → Actions):

- `CLOUDFLARE_API_TOKEN` – token s oprávněním *Cloudflare Pages: Edit* (vytvoří se v Cloudflare → My Profile → API Tokens)
- `CLOUDFLARE_ACCOUNT_ID` – ID účtu (vidět v `npx wrangler whoami`)
