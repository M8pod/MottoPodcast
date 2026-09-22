/**
 * carica-articoli.js
 *
 * Modulo per l'app "Motto Podcast": scarica gli ultimi articoli del
 * sito mottopodcast.org tramite le API pubbliche di WordPress.
 */

const URL_API_ARTICOLI = 'https://mottopodcast.org/wp-json/wp/v2/posts';

function decodificaEntitaHtml(testo) {
  const contenitore = document.createElement('div');
  contenitore.innerHTML = testo;
  return contenitore.textContent.trim();
}

function estraiTestoEstratto(html) {
  const contenitore = document.createElement('div');
  contenitore.innerHTML = html;
  // Il link "Continua a leggere" incluso da WordPress nell'estratto non serve:
  // nell'app il tocco sul titolo apre già l'articolo completo.
  contenitore.querySelectorAll('.more-link').forEach((nodo) => nodo.remove());
  return contenitore.textContent.trim();
}

/**
 * Scarica gli ultimi articoli del sito, dal più recente.
 * @param {number} [numero] - quanti articoli scaricare (default 10)
 * @returns {Promise<Array<Object>>}
 */
export async function caricaArticoli(numero = 10) {
  const url = `${URL_API_ARTICOLI}?per_page=${numero}&orderby=date&order=desc&_fields=id,date,link,title,excerpt`;
  const risposta = await fetch(url);
  if (!risposta.ok) {
    throw new Error('Impossibile scaricare gli articoli del sito');
  }
  const dati = await risposta.json();
  return dati.map((articolo) => ({
    id: articolo.id,
    titolo: decodificaEntitaHtml(articolo.title?.rendered ?? ''),
    data: articolo.date,
    link: articolo.link,
    estratto: estraiTestoEstratto(articolo.excerpt?.rendered ?? '')
  }));
}
