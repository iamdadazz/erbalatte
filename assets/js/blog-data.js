/* Erbalatte blog — the 20 posts from erbalatte.it/news, rewritten.
   Facts come only from the original posts and the existing site; every
   article links its original sources. Body is trusted HTML authored here. */

export const CATEGORIES = {
  tv: 'In TV',
  stampa: 'Dicono di noi',
  eventi: 'Eventi e visite',
  progetti: 'Progetti',
  approfondimenti: 'Approfondimenti',
};

export const POSTS = [
  {
    slug: 'programma-sviluppo-rurale-2023-2027',
    title: 'Programma di Sviluppo Rurale Piemonte 2023-2027',
    date: '2026-07-04', cat: 'progetti', read: 1,
    cover: 'assets/img/blog/psr-2023-2027.jpg',
    alt: 'Logo del Programma di Sviluppo Rurale Piemonte 2023-2027 con i loghi di Unione Europea, Repubblica Italiana e Regione Piemonte',
    excerpt: "La Corte partecipa al nuovo Programma di Sviluppo Rurale del Piemonte, il piano che sostiene le aziende agricole della regione fino al 2027.",
    body: `
      <p>Il <strong>Programma di Sviluppo Rurale Piemonte 2023-2027</strong> è lo strumento con cui Unione Europea, Stato e Regione Piemonte sostengono le aziende agricole del territorio: investimenti, innovazione e pratiche più sostenibili.</p>
      <p>Come per il programma precedente, pubblichiamo qui le informazioni sui progetti della nostra azienda finanziati dal PSR.</p>
      <p class="note">Dettagli del progetto da inserire: descrizione, spesa ammessa e contributo.</p>`,
    sources: [{ label: 'Sviluppo rurale – Regione Piemonte', url: 'https://www.regione.piemonte.it/svilupporurale' }],
  },
  {
    slug: 'podcast-microbiota-intestinale',
    title: 'Un podcast sul microbiota intestinale',
    date: '2025-01-01', cat: 'approfondimenti', read: 2,
    cover: 'assets/img/blog/podcast-microbiota.jpg',
    alt: 'Copertina del podcast sul microbiota intestinale',
    excerpt: "Il microbiologo Giusto Giovannetti racconta in un podcast il mondo invisibile dei microrganismi: dal suolo fino al nostro intestino.",
    body: `
      <p>Funghi, batteri, microrganismi: la vita invisibile è il punto di partenza dell'Agricoltura Simbiotica. Nei nostri prati i <strong>funghi micorrizici</strong> lavorano insieme alle radici delle piante e rendono il suolo più vivo.</p>
      <p>Lo stesso equilibrio vale anche per noi. Ne parla il microbiologo <strong>Giusto Giovannetti</strong> in un podcast dedicato al microbiota intestinale, disponibile su Spotify.</p>
      <p>Un ascolto consigliato per capire perché la salute del suolo, degli animali e dell'uomo sono legate.</p>`,
    sources: [{ label: 'Ascolta il podcast su Spotify', url: 'https://open.spotify.com/show/6Hquym3wrqytVnIYFV8zdV' }],
  },
  {
    slug: 'psr-2014-2022-riduzione-gas-serra',
    title: 'Meno gas serra e ammoniaca: il nostro progetto PSR 2014-2022',
    date: '2024-04-16', cat: 'progetti', read: 2,
    cover: 'assets/img/blog/psr-2014-2022.jpg',
    alt: 'Loghi del Programma di Sviluppo Rurale 2014-2022',
    excerpt: "Strutture di stoccaggio coperte e un separatore solido/liquido: due investimenti per ridurre le emissioni in atmosfera, con il sostegno del PSR.",
    body: `
      <p>Nell'Agricoltura Simbiotica <em>nulla va perduto</em>: le deiezioni della stalla diventano una risorsa. Per gestirle ancora meglio, con il bando 2021 della <strong>Misura PSR 4, Operazione 4.1.3</strong> (investimenti per la riduzione dei gas serra e dell'ammoniaca in atmosfera) abbiamo realizzato due interventi:</p>
      <ol>
        <li><strong>Strutture di stoccaggio coperte</strong>, aggiuntive rispetto al volume previsto dalla normativa, su terreno non impermeabilizzato.</li>
        <li><strong>Un separatore solido/liquido</strong> a media-alta efficienza per il trattamento di effluenti e digestati non palabili: un separatore a compressione elicoidale.</li>
      </ol>
      <dl class="facts-box">
        <div><dt>Beneficiario</dt><dd>La Corte Società Semplice Agricola, Monasterolo di Savigliano (CN)</dd></div>
        <div><dt>Spesa ammessa</dt><dd>90.000 €</dd></div>
        <div><dt>Contributo</dt><dd>40.500 €</dd></div>
      </dl>`,
    sources: [],
  },
  {
    slug: 'terra-e-vita-latte-foraggio-micorrizato',
    title: 'Terra e Vita: un latte di qualità dal foraggio micorrizato',
    date: '2023-09-20', cat: 'stampa', read: 2,
    cover: 'assets/img/blog/terra-e-vita.jpg',
    alt: "Anteprima dell'articolo della rivista Terra e Vita",
    excerpt: "La rivista agricola Terra e Vita racconta come il foraggio coltivato con i funghi micorrizici arrivi fino alla qualità del nostro latte.",
    body: `
      <p>La rivista <strong>Terra e Vita</strong> di Edagricole ha dedicato un articolo al legame tra il foraggio delle nostre frisone e la qualità di Erbalatte.</p>
      <p>Il filo è quello che seguiamo dal 2016: i funghi micorrizici migliorano la vita del suolo, il suolo dà foraggi migliori e le mucche ci restituiscono un latte più buono, con più proteine e più vitamine.</p>`,
    sources: [{ label: "Leggi l'articolo su Terra e Vita", url: 'https://terraevita.edagricole.it/allevamento-zootecnia/un-latte-di-qualita-dal-foraggio-micorrizato/' }],
  },
  {
    slug: 'targatocn-simbiosi-terra-animale-uomo',
    title: 'Su TargatoCN: in perfetta simbiosi fra terra, animale e uomo',
    date: '2023-07-10', cat: 'stampa', read: 1,
    cover: 'assets/img/blog/targatocn.jpg',
    alt: "Anteprima dell'articolo di TargatoCN su Erbalatte",
    excerpt: "Il quotidiano online della provincia di Cuneo racconta come nasce Erbalatte, dal suolo alla stalla.",
    body: `
      <p><strong>TargatoCN</strong>, il quotidiano online della provincia di Cuneo, ha raccontato la nascita di Erbalatte con un titolo che riassume la nostra idea di agricoltura: <em>in perfetta simbiosi fra terra, animale e uomo</em>.</p>
      <p>È lo stesso equilibrio che trovi raccontato nella nostra storia: suolo vivo, prati polifiti, frisone nutrite con ciò che cresce in azienda.</p>`,
    sources: [{ label: "Leggi l'articolo su TargatoCN", url: 'https://www.targatocn.it/2023/07/05/leggi-notizia/argomenti/economia-7/articolo/in-perfetta-simbiosi-fra-terra-animale-e-uomo-nasce-erbalatte.html' }],
  },
  {
    slug: 'visita-guidata-azienda-agricola',
    title: 'Vieni a trovarci: la visita guidata in azienda',
    date: '2023-03-04', cat: 'eventi', read: 1,
    cover: 'assets/img/blog/visita-guidata.jpg',
    alt: 'Locandina della visita guidata in azienda',
    excerpt: "Grazie a Mangiarti puoi prenotare una visita guidata alla nostra azienda agricola di Monasterolo di Savigliano.",
    body: `
      <p>Vuoi vedere da vicino i prati, la stalla e le nostre frisone? Grazie alla collaborazione con <strong>Mangiarti</strong> è possibile prenotare una <strong>visita guidata all'Azienda Agricola La Corte</strong>.</p>
      <p>Tutte le informazioni e la prenotazione sono sul portale Cuneo Alps.</p>`,
    sources: [
      { label: 'Prenota la visita su Cuneo Alps', url: 'https://www.cuneoalps.it/idee-regalo/ristoranti-1/laboratori-ed-esperienze/visita-guidata-dellazienda-agricola-detail' },
      { label: 'Le esperienze di Mangiarti', url: 'https://www.mangiarti.it/it/esperienze' },
    ],
  },
  {
    slug: 'terra-madre-panna-cotta-delicata',
    title: 'A Terra Madre nasce la Panna Cotta Delicata',
    date: '2022-09-20', cat: 'eventi', read: 2,
    cover: 'assets/img/blog/terra-madre-panna-cotta.jpg',
    alt: 'Locandina della Panna Cotta Delicata Erbalatte a Terra Madre Salone del Gusto 2022, stand H33',
    excerpt: "Erbalatte incontra il miele di Cascina Airetta di Ruffia: una panna cotta a km zero, naturalmente dolce, presentata a Terra Madre 2022.",
    body: `
      <p>Per <strong>Terra Madre Salone del Gusto 2022</strong> abbiamo portato una novità: la <strong>Panna Cotta Delicata Erbalatte</strong>.</p>
      <p>È nata dall'incontro tra il nostro latte e il <strong>miele di Cascina Airetta</strong> di Ruffia: una panna cotta a km zero, naturalmente dolce, fatta con latte da Agricoltura Simbiotica.</p>
      <p>Ci siamo presentati dal 22 al 26 settembre al Parco Dora di Torino, allo stand H33.</p>`,
    sources: [],
  },
  {
    slug: 'vanity-fair-agricoltura-simbiotica',
    title: "Vanity Fair: cos'è l'Agricoltura Simbiotica (e dove provarne i frutti)",
    date: '2022-05-15', cat: 'stampa', read: 1,
    cover: 'assets/img/blog/vanity-fair.jpg',
    alt: "Anteprima della gallery di Vanity Fair sull'Agricoltura Simbiotica",
    excerpt: "Nella sezione Food News, Vanity Fair spiega l'Agricoltura Simbiotica e dove trovarne i prodotti.",
    body: `
      <p>L'Agricoltura Simbiotica arriva anche sulle pagine di <strong>Vanity Fair</strong>: nella sezione Food News una gallery spiega che cos'è, perché è importante e dove provarne i frutti.</p>
      <p>Tra questi c'è anche il nostro latte.</p>`,
    sources: [{ label: 'Sfoglia la gallery su Vanity Fair', url: 'https://www.vanityfair.it/gallery/agricoltura-simbiotica-cose-e-perche-e-dove-provarne-i-frutti' }],
  },
  {
    slug: 'video-eataly-testimonianze',
    title: 'Le voci dell\'Agricoltura Simbiotica, in un video di Eataly',
    date: '2022-05-15', cat: 'approfondimenti', read: 1,
    cover: 'assets/img/blog/video-eataly.jpg',
    alt: 'Anteprima del video di Eataly sulle testimonianze del sistema Agricoltura Simbiotica',
    excerpt: "Produttori e ricercatori raccontano il sistema Agricoltura Simbiotica in un video pubblicato da Eataly.",
    video: 'j2eS24I_4kY',
    body: `
      <p>Chi meglio di chi lavora la terra per raccontare l'Agricoltura Simbiotica? In questo video di <strong>Eataly</strong> le testimonianze di chi ha scelto questo sistema.</p>`,
    sources: [{ label: 'Guarda il video su YouTube', url: 'https://www.youtube.com/watch?v=j2eS24I_4kY' }],
  },
  {
    slug: 'le-strade-di-torino',
    title: 'Dicono di noi: il blog Le Strade di Torino',
    date: '2022-03-03', cat: 'stampa', read: 1,
    cover: 'assets/img/blog/le-strade-torino.jpg',
    alt: "Anteprima dell'articolo del blog Le Strade di Torino",
    excerpt: "Il blog Le Strade di Torino racconta Erbalatte e l'Agricoltura Simbiotica della provincia di Cuneo.",
    body: `
      <p>Il 3 marzo 2022 il blog <strong>Le Strade di Torino</strong> ha dedicato un articolo a Erbalatte e all'Agricoltura Simbiotica del Cuneese.</p>`,
    sources: [{ label: "Leggi l'articolo su Le Strade", url: 'https://le-strade.com/torino-erbalatte-agricoltura-simbiotica-cuneo/' }],
  },
  {
    slug: 'delegazione-onaf',
    title: 'Gli assaggiatori di formaggi ONAF in visita in azienda',
    date: '2021-10-31', cat: 'eventi', read: 1,
    cover: 'assets/img/blog/delegazione-onaf.jpg',
    alt: 'Un gruppo di visitatori nella stalla, lungo la corsia di alimentazione delle frisone',
    excerpt: "Una delegazione pugliese dell'Organizzazione Nazionale Assaggiatori Formaggi ha visitato la nostra stalla, con il prof. Andrea Cavallero.",
    body: `
      <p>Il 31 ottobre 2021 abbiamo accolto una delegazione pugliese dell'<strong>ONAF, Organizzazione Nazionale Assaggiatori Formaggi</strong>.</p>
      <p>Per l'occasione è intervenuto anche il <strong>prof. Andrea Cavallero</strong> di Torino, esperto in foraggicoltura: un'occasione per parlare di prati, foraggi e del loro legame con il sapore del latte.</p>`,
    sources: [],
  },
  {
    slug: 'studenti-escp-torino',
    title: 'Gli studenti della ESCP Business School in visita',
    date: '2021-10-16', cat: 'eventi', read: 1,
    cover: 'assets/img/blog/escp-torino.jpg',
    alt: 'Gli studenti della ESCP Business School di Torino in visita in azienda',
    excerpt: "Un gruppo di studenti della ESCP Business School di Torino ha visitato la nostra azienda.",
    body: `
      <p>Il 16 ottobre 2021 un gruppo di studenti della <strong>ESCP Business School di Torino</strong> è venuto a conoscere da vicino la nostra azienda e il progetto Erbalatte.</p>`,
    sources: [{ label: 'ESCP Business School, campus di Torino', url: 'https://www.escp.eu/turin' }],
  },
  {
    slug: 'cirio-a-cheese-bra',
    title: 'Il Presidente della Regione Piemonte al nostro stand di Cheese',
    date: '2021-09-19', cat: 'eventi', read: 1,
    cover: 'assets/img/blog/cheese-bra.jpg',
    alt: 'Il Presidente della Regione Piemonte Alberto Cirio allo stand Erbalatte a Cheese',
    excerpt: "Alberto Cirio ha visitato lo stand Erbalatte a Cheese, l'evento internazionale dedicato ai formaggi di Bra.",
    body: `
      <p>Il 19 settembre 2021 il Presidente della Regione Piemonte <strong>Alberto Cirio</strong> ha visitato il nostro stand a <strong>Cheese</strong>, l'evento internazionale dedicato ai formaggi che si tiene a Bra (CN).</p>`,
    sources: [],
  },
  {
    slug: 'tgr-piemonte-latte-dal-sottosuolo',
    title: 'Latte dal sottosuolo: Erbalatte al TGR Piemonte',
    date: '2021-04-19', cat: 'tv', read: 2,
    cover: 'assets/img/blog/tgr-piemonte.jpg',
    alt: 'Ripresa del servizio del TGR Piemonte in azienda',
    excerpt: "Marco Bergese e il prof. Andrea Genre dell'Università di Torino raccontano la filosofia Erbalatte in un servizio del TGR Piemonte.",
    body: `
      <p>La giornalista <strong>Claudia Pregno</strong> ha realizzato per il <strong>TGR Piemonte</strong> un servizio in azienda, intervistando il nostro Marco e il <strong>prof. Andrea Genre</strong> del Dipartimento di Scienze della Vita e Biologia dei Sistemi dell'Università di Torino.</p>
      <p>Il titolo dice tutto: <em>latte dal sottosuolo</em>. Perché la qualità del nostro latte comincia dalla vita nel terreno.</p>`,
    sources: [{ label: 'Guarda il servizio su RaiNews', url: 'https://www.rainews.it/tgr/piemonte/notiziari/index.html?/tgr/video/2021/04/ContentItem-3fa0481f-bde0-401e-aa2b-9d7bd55d0251.html' }],
  },
  {
    slug: 'buongiorno-regione-latte-dal-sottosuolo',
    title: 'Latte dal sottosuolo: Erbalatte a Buongiorno Regione',
    date: '2021-04-10', cat: 'tv', read: 2,
    cover: 'assets/img/blog/buongiorno-regione.jpg',
    alt: 'Ripresa del servizio di Buongiorno Regione in azienda',
    excerpt: "Alessandro e Marco Bergese, con il prof. Andrea Genre, raccontano la produzione Erbalatte nel programma del mattino di Rai3.",
    body: `
      <p><strong>Buongiorno Regione</strong> è la trasmissione informativa del mattino di Rai3, curata dalla redazione del TGR Piemonte.</p>
      <p>La giornalista <strong>Claudia Pregno</strong> ha realizzato un servizio in azienda intervistando i nostri Alessandro e Marco e il <strong>prof. Andrea Genre</strong> del Dipartimento di Scienze della Vita e Biologia dei Sistemi dell'Università di Torino.</p>`,
    sources: [{ label: 'Guarda il servizio su RaiNews', url: 'https://www.rainews.it/tgr/rubriche/leonardo/index.html?/tgr/video/2021/04/ContentItem-3d73fa87-7f71-48ad-bb21-0935170a1332.html' }],
  },
  {
    slug: 'tgr-leonardo-tradizione-ricerca',
    title: 'TGR Leonardo: Erbalatte fra tradizione e ricerca scientifica',
    date: '2021-03-30', cat: 'tv', read: 2,
    cover: 'assets/img/blog/tgr-leonardo.jpg',
    alt: 'Ripresa della puntata di TGR Leonardo girata in azienda',
    excerpt: "Il telegiornale della scienza di Rai3 ha girato una puntata nella nostra azienda, con il prof. Andrea Genre dell'Università di Torino.",
    body: `
      <p><strong>TGR Leonardo</strong> è il telegiornale della scienza e dell'ambiente della Rai, curato dalla redazione del TGR Piemonte.</p>
      <p>Il 26 marzo 2021 la giornalista <strong>Claudia Pregno</strong> ha girato una puntata nella nostra azienda, intervistando anche il <strong>prof. Andrea Genre</strong> dell'Università di Torino: tradizione contadina e ricerca scientifica, insieme.</p>`,
    sources: [{ label: 'Guarda la puntata su RaiNews', url: 'https://www.rainews.it/tgr/rubriche/leonardo/index.html?/tgr/video/2021/04/ContentItem-3d73fa87-7f71-48ad-bb21-0935170a1332.html' }],
  },
  {
    slug: 'la-stampa-biofilia-biodiversita',
    title: 'Più biofilia e biodiversità: Erbalatte su La Stampa',
    date: '2020-12-23', cat: 'stampa', read: 2,
    cover: 'assets/img/blog/la-stampa.jpg',
    alt: "L'articolo di Carlo Grande su La Stampa del 22 dicembre 2020, nella rubrica Animalia",
    excerpt: "Nella sua rubrica Animalia, Carlo Grande cita l'Agricoltura Simbiotica e la nostra azienda come esempio di equilibrio fra uomini, animali e piante.",
    body: `
      <p>Il 22 dicembre 2020, nella rubrica <strong>Animalia</strong> de <strong>La Stampa</strong>, Carlo Grande ha scelto un augurio di Natale speciale: più <em>biofilia</em> e più biodiversità.</p>
      <p>Tra gli esempi cita l'Agricoltura Simbiotica, che migliora il terreno con le micorrize, e la nostra azienda di Monasterolo di Savigliano: una famiglia che ama la terra e gli animali da generazioni.</p>`,
    sources: [],
  },
  {
    slug: 'tg3-fuori-tg-corpo-sano',
    title: 'Corpo sano in agricoltura sana: Erbalatte al TG3 Fuori TG',
    date: '2020-11-05', cat: 'tv', read: 1,
    cover: 'assets/img/blog/tg3-fuori-tg.jpg',
    alt: 'Ripresa del servizio del TG3 Fuori TG',
    excerpt: "Un approfondimento del TG3 sull'Agricoltura Simbiotica, con le interviste a Marco Bergese e Sergio Capaldo.",
    body: `
      <p>Nella puntata del 9 novembre 2020 il <strong>TG3 Fuori TG</strong> ha dedicato un approfondimento all'Agricoltura Simbiotica, con le interviste al nostro <strong>Marco Bergese</strong> e a <strong>Sergio Capaldo</strong>.</p>`,
    sources: [
      { label: 'Guarda il servizio su Rai', url: 'http://www.tg3.rai.it/dl/RaiTV/programmi/media/ContentItem-d7523bc5-e4a0-4b21-8497-6964c4ac8239-tg3.html' },
      { label: 'Agricoltura Simbiotica', url: 'http://www.agricolturasimbiotica.it/simbiotico/' },
    ],
  },
  {
    slug: 'il-sole-24-ore-agricoltura-simbiotica',
    title: "L'Agricoltura Simbiotica su Il Sole 24 Ore",
    date: '2020-10-15', cat: 'stampa', read: 1,
    cover: 'assets/img/blog/sole-24-ore.jpg',
    alt: "Anteprima dell'articolo de Il Sole 24 Ore",
    excerpt: "Cresce l'Agricoltura Simbiotica: Il Sole 24 Ore racconta il progetto di Sergio Capaldo.",
    body: `
      <p><strong>Il Sole 24 Ore</strong> ha raccontato la crescita dell'Agricoltura Simbiotica e il progetto di <strong>Sergio Capaldo</strong>, lo stesso metodo che seguiamo nei nostri campi dal 2016.</p>`,
    sources: [{ label: "Leggi l'articolo su Il Sole 24 Ore", url: 'https://www.ilsole24ore.com/art/cresce-l-agricoltura-simbiotica-obiettivo-consorzio-e-commerce-e-corner-dedicatii-ADKTyHw' }],
  },
  {
    slug: 'erbalatte-sbarca-a-londra',
    title: 'Erbalatte sbarca a Londra',
    date: '2020-07-10', cat: 'stampa', read: 2,
    cover: 'assets/img/blog/londra-casa-costa.jpg',
    alt: 'Roberto Costa beve Erbalatte con il figlio, foto dal suo profilo Instagram',
    excerpt: "Roberto Costa, ristoratore italiano con otto locali a Londra, ha scelto Erbalatte come unico latte italiano della sua bottega online.",
    body: `
      <p>Ha scelto Erbalatte anche <strong>Roberto Costa</strong>, imprenditore italiano con otto ristoranti a Londra. Sul suo profilo Instagram ha pubblicato una foto mentre beve Erbalatte freddo, al naturale, insieme al figlio.</p>
      <p>Partito come cameriere da Genova, Costa ha conquistato i londinesi con il format <strong>Macellaio RC</strong>, che punta su materie prime di altissima qualità e poco trasformate. Oggi il suo gruppo unisce ristoranti, delivery e un negozio online.</p>
      <p>Proprio lì, su <strong>Casa Costa</strong>, Erbalatte è l'unico latte italiano in vendita.</p>`,
    sources: [
      { label: 'Il post su Instagram', url: 'https://www.instagram.com/p/CDty02zl64X/' },
      { label: 'Erbalatte su Casa Costa', url: 'https://casacosta.co.uk/product/erbalatte-whole-milk-uht-1l-la-granda/' },
      { label: 'Macellaio RC', url: 'https://www.macellaiorc.com/' },
    ],
  },
];

export const bySlug = (s) => POSTS.find((p) => p.slug === s);
export const fmtDate = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
