const URL_FEED_PODCAST = "https://anchor.fm/s/3cc171a4/podcast/rss";

// Il feed di Anchor a volte contiene testo con doppia codifica
// (bytes UTF-8 corretti, letti una prima volta come Windows-1252 e poi
// ri-salvati come UTF-8: es. "più" diventa "piÃ¹"). Questa funzione trova
// solo le sequenze di caratteri che hanno questo aspetto e le corregge,
// lasciando invariato tutto il resto del testo (che è già corretto).
const MAPPA_INVERSA_CP1252 = {
  0x20ac: 0x80, 0x201a: 0x82, 0x0192: 0x83, 0x201e: 0x84, 0x2026: 0x85,
  0x2020: 0x86, 0x2021: 0x87, 0x02c6: 0x88, 0x2030: 0x89, 0x0160: 0x8a,
  0x2039: 0x8b, 0x0152: 0x8c, 0x017d: 0x8e, 0x2018: 0x91, 0x2019: 0x92,
  0x201c: 0x93, 0x201d: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
  0x02dc: 0x98, 0x2122: 0x99, 0x0161: 0x9a, 0x203a: 0x9b, 0x0153: 0x9c,
  0x017e: 0x9e, 0x0178: 0x9f
};

const PATTERN_SEQUENZA_SOSPETTA =
  /[\u0080-￿](?:[\u0080-ÿ]|[ -€ŒœŠšŸŽžƒˆ˜™])+/gu;

function correggiSequenza(sequenza) {
  const byte = [];
  for (const carattere of sequenza) {
    const codicePunto = carattere.codePointAt(0);
    if (codicePunto <= 0xff) {
      byte.push(codicePunto);
    } else if (MAPPA_INVERSA_CP1252[codicePunto] !== undefined) {
      byte.push(MAPPA_INVERSA_CP1252[codicePunto]);
    } else {
      return sequenza;
    }
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(byte));
  } catch {
    return sequenza;
  }
}

function correggiDoppiaCodificaUtf8(testo) {
  return testo.replace(PATTERN_SEQUENZA_SOSPETTA, correggiSequenza);
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return new Response("Metodo non consentito", { status: 405 });
    }
    try {
      const rispostaFeed = await fetch(URL_FEED_PODCAST, {
        headers: { "User-Agent": "MottoPodcastApp/1.0" }
      });
      if (!rispostaFeed.ok) {
        return new Response("Impossibile recuperare il feed del podcast", { status: 502 });
      }
      const contenutoXml = correggiDoppiaCodificaUtf8(await rispostaFeed.text());
      return new Response(contenutoXml, {
        status: 200,
        headers: {
          "content-type": "application/rss+xml; charset=utf-8",
          "access-control-allow-origin": "*",
          "cache-control": "public, max-age=600"
        }
      });
    } catch (errore) {
      return new Response("Errore nel recupero del feed: " + errore.message, { status: 500 });
    }
  }
};
