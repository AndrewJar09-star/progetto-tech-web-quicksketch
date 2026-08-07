/**
 * Service per il recupero di parole casuali dalla MediaWiki API di Wikipedia IT.
 */

const WIKI_API_URL = 'https://it.wikipedia.org/w/api.php';

// Lista di riserva per garantire responsività istantanea se l'API esterna è lenta
const FALLBACK_WORDS = [
  'Gatto', 'Chitarra', 'Castello', 'Automobile', 'Sole',
  'Piramide', 'Pizza', 'Elefante', 'Orologio', 'Bicicletta',
  'Astronauta', 'Vulcano', 'Sottomarino', 'Aquilone', 'Dinosauro'
];

/**
 * Recupera parole casuali dalla MediaWiki API di Wikipedia IT.
 * Con timeout di 3 secondi e fallback a parole enciclopediche locali.
 *
 * @param {number} count - Numero di parole da restituire
 * @returns {Promise<string[]>} Array di titoli
 */
export async function fetchRandomWords(count = 5) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'random',
      rnnamespace: '0',          // Solo voci enciclopediche
      rnfilterredir: 'nonredirects',  // Escludi redirect
      rnlimit: String(count * 3), // Fetch extra per filtrare poi
      rnminsize: '2000'          // Pagine con contenuto sufficiente
    });

    const response = await fetch(`${WIKI_API_URL}?${params}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MediaWiki API error: ${response.status}`);
    }

    const data = await response.json();
    const pages = data.query?.random || [];

    const filtered = pages
      .map(p => p.title)
      .filter(title => {
        if (title.includes('(') || title.includes(')')) return false;
        if (title.length > 30) return false;
        if (title.includes(':')) return false;
        return true;
      })
      .slice(0, count);

    if (filtered.length > 0) {
      return filtered;
    }
  } catch (err) {
    console.log('⚠️ MediaWiki API request fallback:', err.message);
  }

  // Fallback se MediaWiki API è lenta o non restituisce risultati sufficienti
  const shuffled = [...FALLBACK_WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
