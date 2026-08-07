/**
 * Service per la generazione di parole casuali per QuickSketch.
 * Unisce parole enciclopediche casuali da Wikipedia IT
 * con un ricco dizionario Nerd (Marvel, DC, Serie TV, Film, Fumetti, Manga & Gaming).
 */

const WIKI_API_URL = 'https://it.wikipedia.org/w/api.php';

// Dizionario Nerd, Pop Culture, Serie TV, Film, Fumetti e Anime
const NERD_POP_CULTURE_WORDS = [
  // 🦸‍♂️ Marvel & DC Supereroi / Villain
  'Spider-Man', 'Iron Man', 'Thor', 'Hulk', 'Capitan America', 'Joker', 'Batman',
  'Thanos', 'Deadpool', 'Wolverine', 'Groot', 'Venom', 'Doctor Strange', 'Black Panther',
  'Flash', 'Superman', 'Martello di Thor', 'Scudo di Capitan America', 'Batmobile',

  // 📺 Serie TV Iconiche & Cinema
  'Homer Simpson', 'SpongeBob', 'Stranger Things', 'Game of Thrones', 'Breaking Bad',
  'Mercoledì Addams', 'Squid Game', 'La Casa di Carta', 'Friends', 'Peaky Blinders',
  'Star Wars', 'Matrix', 'Shrek', 'Titanic', 'Jurassic Park', 'Ritorno al Futuro',
  'Indiana Jones', 'Ghostbusters', 'Harry Potter', 'Il Signore degli Anelli', 'Avatar',
  'Terminator', 'Minions', 'Pirati dei Caraibi', 'Darth Vader', 'Yoda', 'Tardis', 'Delorean',

  // 📚 Fumetti, Manga & Anime
  'Topolino', 'Paperino', 'Tex Willer', 'Diabolik', 'Dylan Dog', 'Dragon Ball',
  'Goku', 'One Piece', 'Luffy', 'Naruto', 'Death Note', 'Attack on Titan', 'Demon Slayer',

  // 🎮 Gaming & Tech
  'Pikachu', 'Super Mario', 'Luigi', 'Sonic', 'Zelda', 'Pac-Man', 'Spada Laser',
  'Pokeball', 'Game Boy', 'Minecraft', 'Minecraft Creeper', 'PlayStation',

  // 🎨 Pictionary Classico & Fantasia
  'Gatto', 'Chitarra', 'Castello', 'Automobile', 'Sole', 'Piramide', 'Pizza',
  'Elefante', 'Orologio', 'Bicicletta', 'Astronauta', 'Vulcano', 'Sottomarino',
  'Aquilone', 'Dinosauro', 'Robot', 'Drago', 'Unicorno', 'Navicella Spaziale', 'Fantasma'
];

/**
 * Recupera un mix di parole casuali da Wikipedia IT e dal dizionario Nerd/Pop Culture.
 *
 * @param {number} count - Numero di parole da restituire (default 5)
 * @returns {Promise<string[]>} Array di parole mixate
 */
export async function fetchRandomWords(count = 5) {
  let wikiWords = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      list: 'random',
      rnnamespace: '0',
      rnfilterredir: 'nonredirects',
      rnlimit: String(count * 3),
      rnminsize: '1500'
    });

    const response = await fetch(`${WIKI_API_URL}?${params}`, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const pages = data.query?.random || [];

      wikiWords = pages
        .map(p => p.title)
        .filter(title => {
          if (title.includes('(') || title.includes(')')) return false;
          if (title.length > 28 || title.length < 3) return false;
          if (title.includes(':') || title.includes('/') || title.includes('-')) return false;
          return true;
        });
    }
  } catch (err) {
    // Wikipedia API fallback silenzioso
  }

  // Prendi parole nerd/pop culture mescolate
  const shuffledNerd = [...NERD_POP_CULTURE_WORDS].sort(() => 0.5 - Math.random());

  // Combina Wikipedia (2-3 parole se disponibili) + Nerd/Pop culture
  const wikiPickCount = Math.min(wikiWords.length, Math.floor(count / 2));
  const pickedWiki = wikiWords.slice(0, wikiPickCount);
  const pickedNerd = shuffledNerd.slice(0, count - wikiPickCount);

  const combined = [...pickedWiki, ...pickedNerd].sort(() => 0.5 - Math.random());
  return combined.slice(0, count);
}
