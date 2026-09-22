import { caricaPuntate } from './carica-puntate.js';
import { caricaArticoli } from './carica-articoli.js';

const SECONDI_SALTO = 15;

const audio = document.getElementById('audio-puntata');
const btnPlayPausa = document.getElementById('btn-play-pausa');
const iconaPlayPausa = document.getElementById('icona-play-pausa');
const btnIndietro = document.getElementById('btn-indietro');
const btnAvanti = document.getElementById('btn-avanti');
const statoPlayer = document.getElementById('stato-player');
const titoloPuntata = document.getElementById('titolo-puntata');
const metaPuntata = document.getElementById('meta-puntata');
const descrizionePuntata = document.getElementById('descrizione-puntata');

const selettoreStagione = document.getElementById('seleziona-stagione');
const elencoPuntateEl = document.getElementById('elenco-puntate');

const statoArticoli = document.getElementById('stato-articoli');
const elencoArticoliEl = document.getElementById('elenco-articoli');

const pulsantiNavigazione = document.querySelectorAll('.navigazione-sezioni button');

let tutteLePuntate = [];

// ---------- Navigazione fra viste ----------

function mostraVista(nomeVista) {
  document.querySelectorAll('.vista').forEach((sezione) => {
    sezione.hidden = sezione.id !== nomeVista;
  });
  pulsantiNavigazione.forEach((pulsante) => {
    const attiva = pulsante.dataset.vista === nomeVista;
    pulsante.setAttribute('aria-current', attiva ? 'true' : 'false');
  });
  // Sposta il focus sul titolo della vista, cosi' chi usa uno screen
  // reader sa subito dove si trova dopo il cambio di sezione.
  const titolo = document.querySelector(`#${nomeVista} h2`);
  if (titolo) {
    titolo.focus();
  }
}

pulsantiNavigazione.forEach((pulsante) => {
  pulsante.addEventListener('click', () => mostraVista(pulsante.dataset.vista));
});

// ---------- Player ----------

function testoSenzaTagHtml(html) {
  const contenitore = document.createElement('div');
  contenitore.innerHTML = html;
  return contenitore.textContent.trim();
}

function formattaData(dataIso) {
  const data = new Date(dataIso);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function mostraPuntata(puntata, avviaRiproduzione = false) {
  titoloPuntata.textContent = puntata.titolo || 'Puntata senza titolo';

  const parti = [];
  if (puntata.stagione) parti.push(`Stagione ${puntata.stagione}`);
  if (puntata.numeroEpisodio) parti.push(`Puntata ${puntata.numeroEpisodio}`);
  const dataFormattata = formattaData(puntata.dataPubblicazione);
  if (dataFormattata) parti.push(dataFormattata);
  metaPuntata.textContent = parti.join(' · ');

  descrizionePuntata.textContent = testoSenzaTagHtml(puntata.descrizioneHtml || '');

  if (puntata.audioUrl) {
    audio.src = puntata.audioUrl;
  }

  document.title = `${puntata.titolo || 'Puntata'} – Motto Podcast`;

  if (avviaRiproduzione) {
    audio.play();
  }
}

function aggiornaPulsantePlayPausa() {
  const inRiproduzione = !audio.paused && !audio.ended;
  iconaPlayPausa.src = inRiproduzione ? 'assets/pulsanti/pausa.png' : 'assets/pulsanti/play.png';
  btnPlayPausa.setAttribute('aria-label', inRiproduzione ? 'Metti in pausa' : 'Riproduci');
}

btnPlayPausa.addEventListener('click', () => {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
});

btnIndietro.addEventListener('click', () => {
  audio.currentTime = Math.max(0, audio.currentTime - SECONDI_SALTO);
  statoPlayer.textContent = `Indietro di ${SECONDI_SALTO} secondi`;
});

btnAvanti.addEventListener('click', () => {
  const nuovoTempo = audio.currentTime + SECONDI_SALTO;
  audio.currentTime = Math.min(nuovoTempo, audio.duration || nuovoTempo);
  statoPlayer.textContent = `Avanti di ${SECONDI_SALTO} secondi`;
});

audio.addEventListener('play', aggiornaPulsantePlayPausa);
audio.addEventListener('pause', aggiornaPulsantePlayPausa);
audio.addEventListener('ended', aggiornaPulsantePlayPausa);

// ---------- Episodi (selezione puntate vecchie) ----------

// Alcuni episodi molto vecchi nel feed hanno un numero di stagione errato
// all'origine (es. "133" o "246" invece di un numero vero): li scartiamo
// con un controllo di sensatezza, senza inventare un valore al posto loro.
function stagioneValida(stagione) {
  const numero = Number(stagione);
  return Number.isInteger(numero) && numero > 0 && numero <= 50;
}

function popolaSelettoreStagioni(puntate) {
  const stagioni = [...new Set(puntate.map((p) => p.stagione).filter(stagioneValida))]
    .sort((a, b) => Number(b) - Number(a));

  selettoreStagione.innerHTML = '';
  stagioni.forEach((stagione) => {
    const opzione = document.createElement('option');
    opzione.value = stagione;
    opzione.textContent = `Stagione ${stagione}`;
    selettoreStagione.appendChild(opzione);
  });

  if (stagioni.length > 0) {
    mostraPuntateStagione(stagioni[0]);
  }
}

function mostraPuntateStagione(stagione) {
  const puntateStagione = tutteLePuntate
    .filter((p) => p.stagione === stagione)
    .sort((a, b) => Number(b.numeroEpisodio) - Number(a.numeroEpisodio));

  elencoPuntateEl.innerHTML = '';
  puntateStagione.forEach((puntata) => {
    const voce = document.createElement('li');
    const pulsante = document.createElement('button');
    pulsante.type = 'button';

    const numero = document.createElement('span');
    numero.className = 'numero-puntata';
    numero.textContent = puntata.numeroEpisodio ? `Puntata ${puntata.numeroEpisodio} – ` : '';

    pulsante.appendChild(numero);
    pulsante.appendChild(document.createTextNode(puntata.titolo || 'Puntata senza titolo'));

    pulsante.addEventListener('click', () => {
      mostraVista('vista-home');
      mostraPuntata(puntata, true);
    });

    voce.appendChild(pulsante);
    elencoPuntateEl.appendChild(voce);
  });
}

selettoreStagione.addEventListener('change', () => {
  mostraPuntateStagione(selettoreStagione.value);
});

// ---------- Articoli ----------

function creaVoceArticolo(articolo) {
  // Solo il titolo e' cliccabile, con un nome accessibile breve e chiaro
  // ("Titolo, si apre in una nuova scheda"). Data ed estratto restano
  // testo semplice fuori dal link: cosi' chi salta da un link all'altro
  // con VoiceOver non si sente leggere l'intero estratto ogni volta.
  const voce = document.createElement('li');

  const link = document.createElement('a');
  link.className = 'titolo-articolo-link';
  link.href = articolo.link;
  link.target = '_blank';
  link.rel = 'noopener';

  const titolo = document.createElement('h3');
  titolo.textContent = articolo.titolo;
  link.appendChild(titolo);

  const suggerimento = document.createElement('span');
  suggerimento.className = 'sr-only';
  suggerimento.textContent = ' (si apre in una nuova scheda)';
  link.appendChild(suggerimento);

  const data = document.createElement('span');
  data.className = 'data-articolo';
  data.textContent = formattaData(articolo.data);

  const estratto = document.createElement('p');
  estratto.className = 'estratto-articolo';
  estratto.textContent = articolo.estratto;

  voce.appendChild(link);
  voce.appendChild(data);
  voce.appendChild(estratto);
  return voce;
}

async function inizializzaArticoli() {
  try {
    const articoli = await caricaArticoli(10);
    elencoArticoliEl.innerHTML = '';
    articoli.forEach((articolo) => {
      elencoArticoliEl.appendChild(creaVoceArticolo(articolo));
    });
    statoArticoli.textContent = `Ultimi ${articoli.length} articoli del sito mottopodcast.org`;
  } catch (errore) {
    statoArticoli.textContent = 'Impossibile caricare gli articoli: ' + errore.message;
  }
}

// ---------- Avvio ----------

async function inizializza() {
  try {
    tutteLePuntate = await caricaPuntate();
    if (tutteLePuntate.length === 0) {
      titoloPuntata.textContent = 'Nessuna puntata trovata';
      return;
    }
    mostraPuntata(tutteLePuntate[0]);
    popolaSelettoreStagioni(tutteLePuntate);
  } catch (errore) {
    titoloPuntata.textContent = 'Impossibile caricare la puntata';
    metaPuntata.textContent = errore.message;
  }

  inizializzaArticoli();
}

inizializza();
