/* MOCK – ukázková data prototypu. Všechny osoby a instituce jsou smyšlené. */
window.MN_DATA = (function () {
  'use strict';

  const CATALOG = {
    activities: [
      { code: 'BESEDA', label: 'Beseda o životě' },
      { code: 'HOST', label: 'Host ve výuce' },
      { code: 'SUPL', label: 'Suplování', req: 'aprobace' },
      { code: 'CTENI', label: 'Čtení dětem' },
      { code: 'POMOC_MS', label: 'Pomocník ve školce' },
      { code: 'HLIDANI', label: 'Hlídání dětí', req: 'rt' },
      { code: 'DOUC', label: 'Doučování' },
      { code: 'DILNA', label: 'Dílna / workshop' },
      { code: 'VYLET', label: 'Doprovod na výlet' },
      { code: 'MENTOR', label: 'Mentoring studentů' },
      { code: 'PAMETNIK', label: 'Pamětník (rozhovor)' }
    ],
    topicGroups: [
      { name: 'Historie a paměť', items: [['H_SOC', 'Život za socialismu'], ['H_1968', 'Rok 1968'], ['H_1989', 'Rok 1989'], ['H_VALKA', 'Válka a poválečná léta'], ['H_PRAHA', 'Historie Prahy'], ['H_SKOLA', 'Škola dříve']] },
      { name: 'Povolání a obory', items: [['P_REMESLA', 'Řemesla'], ['P_TECH', 'Technika a inženýrství'], ['P_ZDRAV', 'Zdravotnictví'], ['P_DOPRAVA', 'Doprava a železnice'], ['P_VEDA', 'Věda'], ['P_UMENI', 'Umění a design'], ['P_PEDAG', 'Pedagogika'], ['P_OBCHOD', 'Obchod a podnikání']] },
      { name: 'Dovednosti a koníčky', items: [['K_VARENI', 'Vaření a pečení'], ['K_ZAHRADA', 'Zahradničení'], ['K_RUCNI', 'Ruční práce'], ['K_HUDBA', 'Hudba a zpěv'], ['K_SPORT', 'Sport'], ['K_PRIRODA', 'Příroda a zvířata'], ['K_CESTY', 'Cestování'], ['K_FOTO', 'Fotografie'], ['K_SACHY', 'Šachy a hry'], ['K_LITERATURA', 'Literatura a poezie']] },
      { name: 'Předměty školy', items: [['S_CJ', 'Český jazyk'], ['S_DEJ', 'Dějepis'], ['S_ZEM', 'Zeměpis'], ['S_MAT', 'Matematika'], ['S_FYZ', 'Fyzika'], ['S_PRIR', 'Přírodopis'], ['S_AJ', 'Angličtina'], ['S_NJ', 'Němčina'], ['S_VV', 'Výtvarná výchova'], ['S_HV', 'Hudební výchova'], ['S_PC', 'Pracovní činnosti']] }
    ],
    audiences: [['MS', 'MŠ'], ['ZS1', '1. stupeň ZŠ'], ['ZS2', '2. stupeň ZŠ'], ['SS', 'SŠ'], ['DOSP', 'Dospělí']],
    needs: [['PROJ', 'Projektor'], ['MON', 'Monitor'], ['REPRO', 'Reproduktor'], ['TABULE', 'Tabule'], ['PARK', 'Parkování'], ['BEZBAR', 'Bezbariérový přístup']],
    rewards: [['FREE', 'Zdarma'], ['CEST', 'Proplacené cestovné'], ['DPP', 'Odměna (DPP)']],
    together: [['KAFE', 'Kafe'], ['PROCHAZKA', 'Procházka'], ['KARTY', 'Karty a hry'], ['VYLET', 'Výlet'], ['KULTURA', 'Kultura'], ['PSANI', 'Jen psaní']],
    channels: [['push', 'Upozornění v aplikaci'], ['sms', 'SMS'], ['phone', 'Telefonát koordinátora']],
    transport: [['pesky', 'Pěšky'], ['mhd', 'MHD'], ['auto', 'Auto'], ['taxi', 'Taxi']],
    mobility: [['free', 'Bez omezení'], ['floor1', 'Do 1 patra'], ['barrierfree', 'Jen bezbariérově']],
    durations: [[30, '30 min'], [45, '45 min'], [90, '90 min'], [240, 'Půl dne']],
    instTypes: [['zs', 'Základní škola'], ['ms', 'Mateřská škola'], ['gym', 'Střední škola / gymnázium'], ['knih', 'Knihovna'], ['ds', 'Domov seniorů / komunitní centrum']]
  };

  /* Schematický obrys Prahy a Vltavy (přibližný, pro prototyp). [lat, lng] */
  const PRAGUE = [[50.177, 14.462], [50.168, 14.506], [50.158, 14.545], [50.150, 14.585], [50.128, 14.600], [50.115, 14.640], [50.108, 14.690], [50.085, 14.706], [50.060, 14.660], [50.040, 14.640], [50.010, 14.640], [49.990, 14.610], [49.995, 14.560], [50.005, 14.520], [49.985, 14.480], [49.975, 14.440], [49.950, 14.410], [49.942, 14.385], [49.955, 14.350], [49.975, 14.320], [49.995, 14.300], [50.020, 14.270], [50.045, 14.245], [50.070, 14.225], [50.100, 14.245], [50.115, 14.270], [50.130, 14.300], [50.145, 14.330], [50.150, 14.370], [50.165, 14.395], [50.177, 14.430]];
  const VLTAVA = [[49.935, 14.392], [49.960, 14.395], [49.985, 14.398], [50.010, 14.402], [50.030, 14.410], [50.050, 14.414], [50.065, 14.416], [50.078, 14.411], [50.088, 14.411], [50.095, 14.420], [50.098, 14.437], [50.101, 14.455], [50.108, 14.468], [50.115, 14.455], [50.117, 14.432], [50.115, 14.410], [50.120, 14.395], [50.140, 14.392], [50.160, 14.397], [50.185, 14.400]];
  const DISTRICTS = [
    ['Praha 1', 50.087, 14.421], ['Praha 2', 50.072, 14.437], ['Praha 3', 50.086, 14.462], ['Praha 4', 50.040, 14.448], ['Praha 5', 50.060, 14.372],
    ['Praha 6', 50.100, 14.352], ['Praha 7', 50.106, 14.432], ['Praha 8', 50.124, 14.470], ['Praha 9', 50.112, 14.518], ['Praha 10', 50.068, 14.505],
    ['Praha 11', 50.027, 14.505], ['Praha 12', 49.996, 14.425], ['Praha 13', 50.045, 14.322], ['Praha 14', 50.103, 14.577], ['Praha 15', 50.049, 14.548]
  ];
  const CENTER = { name: 'Mezi námi – multimediální centrum', address: 'Pujmanové 1219/8, Praha 4', lat: 50.0535, lng: 14.4305 };

  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  const pad = n => String(n).padStart(2, '0');
  const iso = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const mondayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };
  const nextWorkday = d => { let x = addDays(d, 1); while (x.getDay() === 0 || x.getDay() === 6) x = addDays(x, 1); return x; };

  function pattern(rnd, mornings) {
    // 5 dní × 4 bloky; senioři nejčastěji dopoledne
    return [0, 1, 2, 3, 4].map(() => [0, 1, 2, 3].map(s => (s < 2 ? rnd() < mornings : rnd() < 0.22)));
  }

  function seed(today) {
    const rnd = mulberry(20261103);
    const now = today.getTime();
    const thisMon = mondayOf(today);
    const nextMon = addDays(thisMon, 7);
    const wk2 = addDays(thisMon, 14);
    const H = 3600e3;

    const S = (o) => Object.assign({
      community: false, interests: [], together: [], overrides: {}, confirmedWeeks: [iso(nextMon), iso(wk2)], maxOnePerDay: false, hiddenUntil: null,
      availableNow: null, channel: 'push', transport: ['mhd'], parking: false, mobility: 'free', travel: 30, duration: 45, groupSize: 'class',
      aprobace: false, aprobaceText: '', rt: false, languages: [], tech: [], reward: 'FREE', ratingSum: 0, ratingCount: 0, notes: '',
      consents: { terms: true, location: true, community: false, guardian: false, health: false, analytics: false, photo: true }, onboarded: true, createdAt: '2025-09-15'
    }, o);

    const seniors = [
      S({ id: 's1', first: 'Marie', last: 'Dvořáková', gender: 'f', birthYear: 1953, username: 'marie.dvorakova.12', district: 'Praha 4', lat: 50.0488, lng: 14.4346,
        about: 'Čtyřicet let jsem učila dějepis a češtinu na Pankráci. Ráda dětem vyprávím, jak se v Praze žilo, když jsem byla malá.',
        phone: '+420 600 100 201', emergency: { name: 'Jana Dvořáková', rel: 'dcera', phone: '+420 600 100 202' }, travel: 30, transport: ['mhd', 'pesky'], mobility: 'floor1',
        activities: ['BESEDA', 'HOST', 'SUPL', 'CTENI'], topics: ['H_PRAHA', 'H_1968', 'H_SKOLA', 'S_DEJ', 'S_CJ', 'K_LITERATURA'], audiences: ['ZS1', 'ZS2', 'SS'],
        profession: 'Učitelka dějepisu a češtiny', aprobace: true, aprobaceText: 'Mgr., ČJ – D (PedF UK)', rt: true, languages: ['Němčina'], tech: ['PROJ'], reward: 'CEST',
        pattern: [[true, true, false, false], [true, true, false, false], [true, false, false, false], [true, true, true, false], [false, false, false, false]],
        confirmedWeeks: [iso(nextMon)], ratingSum: 34, ratingCount: 7, onboarded: false,
        consents: { terms: false, location: false, community: false, guardian: false, health: false, analytics: false, photo: false } }),
      S({ id: 's2', first: 'Jiří', last: 'Novotný', gender: 'm', birthYear: 1948, username: 'jiri.novotny.07', district: 'Praha 11', lat: 50.0316, lng: 14.4937,
        about: 'Strojař, celý život jsem konstruoval lokomotivy v ČKD. Rád ukážu, jak se počítalo bez kalkulačky.', phone: '+420 600 100 203', emergency: { name: 'Petr Novotný', rel: 'syn', phone: '+420 600 100 204' },
        activities: ['BESEDA', 'DOUC', 'MENTOR', 'DILNA'], topics: ['P_TECH', 'P_DOPRAVA', 'S_FYZ', 'S_MAT', 'K_SACHY'], audiences: ['ZS2', 'SS'], profession: 'Strojní inženýr, ČKD',
        community: true, interests: ['K_SACHY', 'P_DOPRAVA', 'K_CESTY'], together: ['KARTY', 'PROCHAZKA'], transport: ['mhd', 'auto'], parking: true, duration: 90,
        availableNow: { until: iso(addDays(today, 5)), note: 'Rád ukážu dětem, jak fungovaly parní lokomotivy.', lastActivated: iso(addDays(today, -2)) }, ratingSum: 23, ratingCount: 5 }),
      S({ id: 's3', first: 'Věra', last: 'Kopecká', gender: 'f', birthYear: 1950, username: 'vera.kopecka.03', district: 'Praha 11', lat: 50.0296, lng: 14.5284,
        about: 'Byla jsem zdravotní sestrou na dětském oddělení. Mám ráda zahrádku a pečení.', phone: '+420 600 100 205', emergency: { name: 'Ivana Kopecká', rel: 'snacha', phone: '+420 600 100 206' },
        activities: ['BESEDA', 'POMOC_MS', 'CTENI', 'HLIDANI'], topics: ['P_ZDRAV', 'K_ZAHRADA', 'K_VARENI', 'S_PRIR'], audiences: ['MS', 'ZS1'], profession: 'Zdravotní sestra', rt: true,
        community: true, interests: ['K_ZAHRADA', 'K_VARENI', 'K_LITERATURA'], together: ['KAFE', 'PROCHAZKA'], ratingSum: 29, ratingCount: 6 }),
      S({ id: 's4', first: 'Zdeněk', last: 'Havel', gender: 'm', birthYear: 1946, username: 'zdenek.havel.21', district: 'Praha 2', lat: 50.0752, lng: 14.4402,
        about: 'Fotograf. V listopadu 1989 jsem fotil na Národní a na Letné, archiv mám pořád doma.', phone: '+420 600 100 207', emergency: { name: 'Olga Havlová', rel: 'manželka', phone: '+420 600 100 208' },
        activities: ['BESEDA', 'DILNA', 'PAMETNIK'], topics: ['P_UMENI', 'K_FOTO', 'H_1989', 'H_PRAHA'], audiences: ['ZS2', 'SS', 'DOSP'], profession: 'Fotograf', tech: ['PROJ'], duration: 90,
        availableNow: { until: iso(addDays(today, 4)), note: 'Mám archiv fotek z listopadu 89, přinesu je ukázat.', lastActivated: iso(addDays(today, -3)) }, ratingSum: 19, ratingCount: 4 }),
      S({ id: 's5', first: 'Alena', last: 'Šimková', gender: 'f', birthYear: 1955, username: 'alena.simkova.33', district: 'Praha 10', lat: 50.0716, lng: 14.4935,
        about: 'Učila jsem angličtinu na gymnáziu a hodně jsem cestovala.', phone: '+420 600 100 209', emergency: { name: 'Martin Šimek', rel: 'syn', phone: '+420 600 100 210' },
        activities: ['SUPL', 'DOUC', 'HOST'], topics: ['S_AJ', 'K_CESTY'], audiences: ['ZS1', 'ZS2'], profession: 'Učitelka angličtiny', aprobace: true, aprobaceText: 'Mgr., AJ (FF UK)', ratingSum: 14, ratingCount: 3 }),
      S({ id: 's6', first: 'Karel', last: 'Pokorný', gender: 'm', birthYear: 1944, username: 'karel.pokorny.15', district: 'Praha 5', lat: 50.0712, lng: 14.4052,
        about: 'Truhlář. S dětmi rád vyrobím ptačí budku nebo krmítko.', phone: '+420 600 100 211', emergency: { name: 'Lucie Pokorná', rel: 'vnučka', phone: '+420 600 100 212' },
        activities: ['DILNA', 'BESEDA'], topics: ['P_REMESLA', 'S_PC', 'K_RUCNI'], audiences: ['ZS1', 'ZS2'], profession: 'Truhlář', transport: ['auto'], parking: true, duration: 90, ratingSum: 25, ratingCount: 5 }),
      S({ id: 's7', first: 'Ludmila', last: 'Marková', gender: 'f', birthYear: 1952, username: 'ludmila.markova.09', district: 'Praha 6', lat: 50.1022, lng: 14.3924,
        about: 'Knihovnice. Čtu dětem pohádky v programu PŘEČTI už šest let.', phone: '+420 600 100 213', emergency: { name: 'Pavel Marek', rel: 'manžel', phone: '+420 600 100 214' },
        activities: ['CTENI', 'POMOC_MS', 'BESEDA'], topics: ['K_LITERATURA', 'S_CJ', 'H_SKOLA'], audiences: ['MS', 'ZS1'], profession: 'Knihovnice', channel: 'phone',
        community: true, interests: ['K_LITERATURA', 'K_HUDBA'], together: ['KULTURA', 'KAFE'], ratingSum: 40, ratingCount: 8 }),
      S({ id: 's8', first: 'Miroslav', last: 'Černý', gender: 'm', birthYear: 1949, username: 'miroslav.cerny.18', district: 'Praha 8', lat: 50.1078, lng: 14.4757,
        about: 'Železničář, výpravčí na Masarykově nádraží. Znám historky z vlaků i z války od táty.', phone: '+420 600 100 215', emergency: { name: 'Eva Černá', rel: 'dcera', phone: '+420 600 100 216' },
        activities: ['BESEDA', 'PAMETNIK', 'VYLET'], topics: ['P_DOPRAVA', 'H_SOC', 'H_VALKA'], audiences: ['ZS1', 'ZS2'], profession: 'Výpravčí ČD', channel: 'sms', ratingSum: 13, ratingCount: 3 }),
      S({ id: 's9', first: 'Hana', last: 'Procházková', gender: 'f', birthYear: 1957, username: 'hana.prochazkova.02', district: 'Praha 12', lat: 50.0006, lng: 14.4108,
        about: 'Kuchařka ve školní jídelně. Pečeme perníčky a vaříme jednoduchá jídla.', phone: '+420 600 100 217', emergency: { name: 'Tomáš Procházka', rel: 'manžel', phone: '+420 600 100 218' },
        activities: ['DILNA', 'POMOC_MS', 'HLIDANI'], topics: ['K_VARENI', 'P_OBCHOD'], audiences: ['MS', 'ZS1'], profession: 'Kuchařka', rt: true,
        availableNow: { until: iso(addDays(today, 6)), note: 'Pečeme perníčky? Přinesu formičky i těsto.', lastActivated: iso(addDays(today, -1)) }, ratingSum: 20, ratingCount: 4 }),
      S({ id: 's10', first: 'Josef', last: 'Kučera', gender: 'm', birthYear: 1945, username: 'josef.kucera.11', district: 'Praha 3', lat: 50.0846, lng: 14.4555,
        about: 'Muzikant, hrál jsem v tanečním orchestru. S dětmi zpívám a ukazuji staré nástroje.', phone: '+420 600 100 219', emergency: { name: 'Marta Kučerová', rel: 'dcera', phone: '+420 600 100 220' },
        activities: ['BESEDA', 'DILNA', 'HOST'], topics: ['K_HUDBA', 'S_HV', 'H_SOC'], audiences: ['MS', 'ZS1', 'ZS2'], profession: 'Hudebník',
        community: true, interests: ['K_HUDBA', 'K_SACHY'], together: ['KARTY', 'KULTURA'], ratingSum: 27, ratingCount: 6 }),
      S({ id: 's11', first: 'Eva', last: 'Veselá', gender: 'f', birthYear: 1951, username: 'eva.vesela.27', district: 'Praha 9', lat: 50.1102, lng: 14.5047,
        about: 'Chemička z Akademie věd. Pokusy z kuchyně jsou moje specialita.', phone: '+420 600 100 221', emergency: { name: 'Jan Veselý', rel: 'syn', phone: '+420 600 100 222' },
        activities: ['HOST', 'BESEDA', 'MENTOR'], topics: ['P_VEDA', 'S_PRIR', 'K_PRIRODA'], audiences: ['ZS2', 'SS'], profession: 'Vědkyně, chemie', ratingSum: 15, ratingCount: 3 }),
      S({ id: 's12', first: 'František', last: 'Dušek', gender: 'm', birthYear: 1947, username: 'frantisek.dusek.05', district: 'Praha 13', lat: 50.0461, lng: 14.3352,
        about: 'Zeměměřič, mapoval jsem půl Československa. Rád vezmu třídu na výlet s buzolou.', phone: '+420 600 100 223', emergency: { name: 'Hana Dušková', rel: 'manželka', phone: '+420 600 100 224' },
        activities: ['BESEDA', 'VYLET', 'DOUC'], topics: ['S_ZEM', 'K_CESTY', 'P_TECH'], audiences: ['ZS2'], profession: 'Zeměměřič', transport: ['auto', 'mhd'], parking: true, ratingSum: 9, ratingCount: 2 }),
      S({ id: 's13', first: 'Jarmila', last: 'Benešová', gender: 'f', birthYear: 1954, username: 'jarmila.benesova.14', district: 'Praha 7', lat: 50.1012, lng: 14.4402,
        about: 'Švadlena. Naučím děti přišít knoflík i ušít jednoduchou taštičku.', phone: '+420 600 100 225', emergency: { name: 'Klára Benešová', rel: 'dcera', phone: '+420 600 100 226' },
        activities: ['DILNA', 'POMOC_MS'], topics: ['K_RUCNI', 'P_REMESLA', 'S_VV'], audiences: ['MS', 'ZS1'], profession: 'Švadlena',
        community: true, interests: ['K_RUCNI', 'K_LITERATURA'], together: ['KAFE', 'PSANI'], ratingSum: 18, ratingCount: 4 }),
      S({ id: 's14', first: 'Bohumil', last: 'Říha', gender: 'm', birthYear: 1943, username: 'bohumil.riha.08', district: 'Praha 14', lat: 50.1062, lng: 14.5751,
        about: 'Zahradník. Poradím se školní zahradou i s bylinkami.', phone: '+420 600 100 227', emergency: { name: 'Věra Říhová', rel: 'dcera', phone: '+420 600 100 228' },
        activities: ['DILNA', 'BESEDA', 'VYLET'], topics: ['K_ZAHRADA', 'K_PRIRODA'], audiences: ['MS', 'ZS1'], profession: 'Zahradník', channel: 'phone', mobility: 'barrierfree', ratingSum: 22, ratingCount: 5 })
    ];
    seniors.forEach((s, i) => { if (!s.pattern) s.pattern = pattern(mulberry(100 + i), i % 3 === 0 ? 0.55 : 0.4); });
    // s8 nepotvrdil týden za 14 dní (úkol pro koordinátora)
    seniors.find(s => s.id === 's8').confirmedWeeks = [iso(nextMon)];

    const I = (o) => Object.assign({ tags: [], teachers: [] }, o);
    const institutions = [
      I({ id: 'i1', name: 'ZŠ Pod Hradbami', type: 'zs', district: 'Praha 4', address: 'Na Hradbách 12, Praha 4', lat: 50.0507, lng: 14.4392, ico: '00000101', contact: 'Mgr. Tomáš Beneš', phone: '+420 600 200 101', username: 'zs-podhradbami', tags: ['H_PRAHA', 'S_DEJ', 'P_TECH', 'K_VARENI', 'S_PC'], teachers: ['Mgr. Tomáš Beneš', 'Mgr. Lucie Malá'] }),
      I({ id: 'i2', name: 'MŠ Kvítek Chodov', type: 'ms', district: 'Praha 11', address: 'Kvítková 4, Praha 11', lat: 50.0332, lng: 14.4985, ico: '00000102', contact: 'Bc. Ivana Horká', phone: '+420 600 200 102', username: 'ms-kvitek', tags: ['K_LITERATURA', 'K_PRIRODA'] }),
      I({ id: 'i3', name: 'ZŠ Na Výsluní', type: 'zs', district: 'Praha 10', address: 'Výslunní 7, Praha 10', lat: 50.0683, lng: 14.4752, ico: '00000103', contact: 'Mgr. Radek Sova', phone: '+420 600 200 103', username: 'zs-navysluni', tags: ['H_1989', 'H_SOC', 'S_DEJ'] }),
      I({ id: 'i4', name: 'Gymnázium Nad Tratí', type: 'gym', district: 'Praha 6', address: 'Nad Tratí 30, Praha 6', lat: 50.0985, lng: 14.3851, ico: '00000104', contact: 'PhDr. Klára Vránová', phone: '+420 600 200 104', username: 'gym-nadtrati', tags: ['P_TECH', 'S_FYZ', 'S_AJ', 'S_DEJ'] }),
      I({ id: 'i5', name: 'Knihovna Na Kopečku', type: 'knih', district: 'Praha 8', address: 'Na Kopečku 2, Praha 8', lat: 50.1228, lng: 14.4588, ico: '00000105', contact: 'Jitka Rybová', phone: '+420 600 200 105', username: 'knihovna-kopecek', tags: ['K_LITERATURA', 'S_CJ'] }),
      I({ id: 'i6', name: 'MŠ Lísteček', type: 'ms', district: 'Praha 3', address: 'Lístková 9, Praha 3', lat: 50.0824, lng: 14.4621, ico: '00000106', contact: 'Petra Zelená', phone: '+420 600 200 106', username: 'ms-listecek', tags: ['K_HUDBA', 'K_RUCNI'] }),
      I({ id: 'i7', name: 'ZŠ Modřanská stráň', type: 'zs', district: 'Praha 12', address: 'Stráňová 15, Praha 12', lat: 50.0043, lng: 14.4153, ico: '00000107', contact: 'Mgr. Ondřej Kos', phone: '+420 600 200 107', username: 'zs-stran', tags: ['K_ZAHRADA', 'K_PRIRODA'] }),
      I({ id: 'i8', name: 'Komunitní centrum Zahrada vzpomínek', type: 'ds', district: 'Praha 5', address: 'Vzpomínková 3, Praha 5', lat: 50.0581, lng: 14.3902, ico: '00000108', contact: 'Mgr. Eva Dlouhá', phone: '+420 600 200 108', username: 'kc-zahrada', tags: ['K_HUDBA'] }),
      I({ id: 'i9', name: 'MŠ Sluneční paprsek', type: 'ms', district: 'Praha 2', address: 'Paprsková 6, Praha 2', lat: 50.0712, lng: 14.4301, ico: '00000109', contact: 'Bc. Lenka Rychlá', phone: '+420 600 200 109', username: 'ms-paprsek', tags: ['K_LITERATURA'] })
    ];

    const C = (o) => Object.assign({ interested: [], chosen: [], status: 'open', needed: 1, tech: [], parking: false, barrierFree: false, reward: 'FREE', createdAt: now - 48 * H, repeat: '' }, o);
    const calls = [
      C({ id: 'c1', instId: 'i1', title: 'Beseda: Praha za první republiky', activity: 'BESEDA', tags: ['H_PRAHA', 'S_DEJ'], audience: 'ZS2', klass: '8.B', date: iso(addDays(nextMon, 2)), slot: 1, duration: 45, tech: ['PROJ'], deadline: iso(addDays(today, 4)), interested: ['s4'] }),
      C({ id: 'c2', instId: 'i1', title: 'Vaření s babičkou nebo dědou', activity: 'DILNA', tags: ['K_VARENI', 'S_PC'], audience: 'ZS1', klass: '4.A', date: iso(addDays(wk2, 1)), slot: 1, duration: 90, needed: 2, reward: 'CEST', deadline: iso(addDays(today, 9)), interested: ['s9'] }),
      C({ id: 'c3', instId: 'i3', title: 'Hledáme pamětníka roku 1989', activity: 'PAMETNIK', tags: ['H_1989', 'H_SOC'], audience: 'ZS2', klass: '9.A a 9.B', date: iso(addDays(wk2, 2)), slot: 0, duration: 90, tech: ['PROJ', 'REPRO'], deadline: iso(addDays(today, 10)) }),
      C({ id: 'c4', instId: 'i4', title: 'Mentor pro technický seminář', activity: 'MENTOR', tags: ['P_TECH', 'S_FYZ'], audience: 'SS', klass: 'seminář 3. ročník', date: iso(addDays(nextMon, 3)), slot: 3, duration: 90, repeat: 'každý čtvrtek', deadline: iso(addDays(today, 6)) }),
      C({ id: 'c5', instId: 'i4', title: 'Suplování dějepisu, 2 hodiny', activity: 'SUPL', tags: ['S_DEJ'], audience: 'SS', klass: '2.C', date: iso(addDays(nextMon, 4)), slot: 0, duration: 90, reward: 'DPP', deadline: iso(addDays(today, 3)) }),
      C({ id: 'c6', instId: 'i4', title: 'Host v angličtině: cestování', activity: 'HOST', tags: ['S_AJ', 'K_CESTY'], audience: 'SS', klass: '1.A', date: iso(addDays(wk2, 3)), slot: 1, duration: 45, deadline: iso(addDays(today, 11)) }),
      C({ id: 'c7', instId: 'i2', title: 'Čtecí babička nebo dědeček na úterky', activity: 'CTENI', tags: ['K_LITERATURA'], audience: 'MS', klass: 'Berušky', date: iso(addDays(nextMon, 1)), slot: 0, duration: 30, repeat: 'každé úterý', deadline: iso(addDays(today, 5)), barrierFree: true }),
      C({ id: 'c8', instId: 'i5', title: 'Čtení pohádek v knihovně', activity: 'CTENI', tags: ['K_LITERATURA', 'S_CJ'], audience: 'MS', klass: 'skupina z MŠ', date: iso(addDays(wk2, 4)), slot: 2, duration: 45, barrierFree: true, deadline: iso(addDays(today, 12)) }),
      C({ id: 'c9', instId: 'i7', title: 'Poradíte nám se školní zahrádkou?', activity: 'DILNA', tags: ['K_ZAHRADA', 'K_PRIRODA'], audience: 'ZS1', klass: '3.B', date: iso(addDays(wk2, 0)), slot: 1, duration: 90, deadline: iso(addDays(today, 8)) })
    ];

    const B = (o) => Object.assign({ tech: [], status: 'pending', source: 'direct', createdAt: now - 3 * H, rating: null, room: '', kids: 25 }, o);
    const bookings = [
      B({ id: 'b1', seniorId: 's1', instId: 'i3', date: iso(addDays(nextMon, 1)), slot: 1, activity: 'BESEDA', topic: 'H_1968', klass: '9.A', kids: 24, room: 'Učebna dějepisu, 2. patro', tech: ['PROJ'], status: 'confirmed', createdAt: now - 96 * H, contact: 'Mgr. Radek Sova' }),
      B({ id: 'b2', seniorId: 's1', instId: 'i1', date: iso(addDays(nextMon, 2)), slot: 0, activity: 'BESEDA', topic: 'H_PRAHA', klass: '6.B', kids: 26, room: 'Třída 6.B, přízemí', tech: [], status: 'pending', createdAt: now - 3 * H, contact: 'Mgr. Tomáš Beneš' }),
      B({ id: 'b3', seniorId: 's8', instId: 'i1', date: iso(addDays(nextMon, 3)), slot: 1, activity: 'BESEDA', topic: 'P_DOPRAVA', klass: '3.A', kids: 22, status: 'pending', createdAt: now - 30 * H, contact: 'Mgr. Lucie Malá' }),
      B({ id: 'b4', seniorId: 's7', instId: 'i9', date: iso(nextWorkday(today)), slot: 0, activity: 'CTENI', topic: 'K_LITERATURA', klass: 'Sluníčka', kids: 18, status: 'confirmed', createdAt: now - 200 * H, contact: 'Bc. Lenka Rychlá' }),
      B({ id: 'b5', seniorId: 's1', instId: 'i1', date: iso(addDays(thisMon, -5)), slot: 1, activity: 'HOST', topic: 'S_DEJ', klass: '7.A', kids: 25, status: 'done', createdAt: now - 400 * H, rating: 5, contact: 'Mgr. Tomáš Beneš' }),
      B({ id: 'b6', seniorId: 's6', instId: 'i1', date: iso(addDays(nextMon, 0)), slot: 1, activity: 'DILNA', topic: 'P_REMESLA', klass: '5.A', kids: 24, status: 'confirmed', createdAt: now - 120 * H, contact: 'Mgr. Tomáš Beneš' })
    ];
    // MOCK historie: dokončené návštěvy od září
    const acts = ['BESEDA', 'CTENI', 'DILNA', 'HOST', 'PAMETNIK', 'POMOC_MS'];
    const start = new Date(today.getFullYear(), 8, 1);
    let bi = 100;
    for (let d = new Date(start); d < thisMon; d = addDays(d, 1)) {
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const n = rnd() < 0.55 ? 1 : (rnd() < 0.3 ? 2 : 0);
      for (let k = 0; k < n; k++) {
        const s = seniors[Math.floor(rnd() * seniors.length)];
        const inst = institutions[Math.floor(rnd() * institutions.length)];
        const r = rnd();
        bookings.push(B({ id: 'b' + (bi++), seniorId: s.id, instId: inst.id, date: iso(d), slot: Math.floor(rnd() * 3), activity: s.activities.includes('BESEDA') ? acts[Math.floor(rnd() * acts.length)] : s.activities[0], topic: s.topics[0], klass: '', kids: 15 + Math.floor(rnd() * 14), status: r < 0.08 ? 'cancelled' : 'done', rating: r < 0.08 ? null : (r < 0.25 ? 4 : 5), createdAt: d.getTime() - 120 * H }));
      }
    }

    const chats = [
      { id: 'ch-s2-s3', a: 's2', b: 's3', status: 'active', messages: [{ from: 's2', text: 'Dobrý den, paní Věro, nezašla byste ve čtvrtek na kafe na Chodově?', at: now - 26 * H }, { from: 's3', text: 'Ráda, ve 14 hodin u fontány?', at: now - 25 * H }],
        guardian: { on: true, by: 's3', when: iso(today) + 'T14:00', where: 'Kavárna u fontány, Chodov', duration: 60, startedAt: now - 1 * H, state: 'active' } }
    ];
    const reports = [
      { id: 'r1', by: 's13', about: 's10', chatId: null, text: 'Posílá mi zprávy i po tom, co jsem napsala, že nemám zájem.', at: now - 20 * H, state: 'new' }
    ];
    const sos = [
      { id: 'sos1', seniorId: 's14', at: now - 6 * 24 * H, choice: 'contact', state: 'resolved', note: 'Uklouzl na schodech, dcera přijela, bez zranění.' }
    ];
    const tagSuggestions = [
      { id: 'ts1', label: 'Modelářství', by: 's6', at: now - 50 * H, state: 'new' },
      { id: 'ts2', label: 'Programování a IT', by: 'i4', at: now - 10 * H, state: 'new' }
    ];

    return { version: 3, seededAt: iso(today), session: null, seniors, institutions, calls, bookings, chats, reports, sos, tagSuggestions, doneTasks: [], deletionRequests: [], audit: [] };
  }

  return { CATALOG, PRAGUE, VLTAVA, DISTRICTS, CENTER, seed, util: { iso, addDays, mondayOf } };
})();

