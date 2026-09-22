/**
 * carica-puntate.js
 *
 * Modulo per l'app "Motto Podcast": scarica il feed RSS (passando dal
 * Worker-proxy su Cloudflare) e lo trasforma in un elenco di puntate
 * facile da usare nell'interfaccia.
 *
 * Uso tipico:
 *
 *   import { caricaPuntate } from './carica-puntate.js';
 *
 *   const puntate = await caricaPuntate();
 *   const ultimaPuntata = puntate[0]; // il feed elenca sempre la piu' recente per prima
 */

// Worker Cloudflare gia' pubblicato, usato come proxy del feed RSS del podcast
export const URL_WORKER_FEED = 'https://motto-podcast-feed.motto-podcast-worker.workers.dev';

/**
 * Scarica e interpreta il feed RSS del podcast.
 * @param {string} [urlProxy] - indirizzo del Worker Cloudflare che espone il feed (default: URL_WORKER_FEED)
 * @returns {Promise<Array<Object>>} elenco delle puntate, dalla piu' recente alla piu' vecchia
 */
export async function caricaPuntate(urlProxy = URL_WORKER_FEED) {
  const risposta = await fetch(urlProxy);
  if (!risposta.ok) {
    throw new Error('Impossibile scaricare il feed delle puntate');
  }

  const testoXml = await risposta.text();
  const analizzatore = new DOMParser();
  const documentoXml = analizzatore.parseFromString(testoXml, 'application/xml');

  // Se l'XML e' malformato, DOMParser inserisce un nodo <parsererror>
  const erroreParsing = documentoXml.querySelector('parsererror');
  if (erroreParsing) {
    throw new Error('Il feed RSS non e\' valido');
  }

  const elementiPuntata = Array.from(documentoXml.querySelectorAll('item'));

  return elementiPuntata.map((elemento) => leggiPuntata(elemento));
}

function testoTag(elemento, nomeTag) {
  return elemento.querySelector(nomeTag)?.textContent?.trim() ?? '';
}

function testoTagItunes(elemento, nomeTagLocale) {
  // I tag itunes:season, itunes:episode, itunes:duration ecc. vivono in un
  // namespace diverso: si leggono con getElementsByTagNameNS usando "*"
  // per intercettare il namespace itunes senza doverlo scrivere per esteso.
  const nodo = elemento.getElementsByTagNameNS('*', nomeTagLocale)[0];
  return nodo?.textContent?.trim() ?? '';
}

function leggiPuntata(elemento) {
  const enclosure = elemento.querySelector('enclosure');
  const immagineItunes = elemento.getElementsByTagNameNS('*', 'image')[0];

  return {
    titolo: testoTag(elemento, 'title'),
    descrizioneHtml: testoTag(elemento, 'description'),
    link: testoTag(elemento, 'link'),
    dataPubblicazione: testoTag(elemento, 'pubDate'),
    audioUrl: enclosure?.getAttribute('url') ?? '',
    audioTipo: enclosure?.getAttribute('type') ?? '',
    durata: testoTagItunes(elemento, 'duration'),
    stagione: testoTagItunes(elemento, 'season'),
    numeroEpisodio: testoTagItunes(elemento, 'episode'),
    copertinaUrl: immagineItunes?.getAttribute('href') ?? ''
  };
}
