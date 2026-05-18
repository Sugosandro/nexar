const TOURS = {
  world: {
    it: [
      { element: '.view-hd .btn-p', title: 'Crea un elemento', desc: 'Personaggi, luoghi, oggetti, creature — ogni cosa del tuo mondo è un elemento. Clicca + per aggiungerne uno.' },
      { element: '.view-hd', title: 'Filtri e ordinamento', desc: 'Filtra per categoria, importanza, stato o arco narrativo. Puoi combinare più filtri insieme.' },
      { title: 'Pannello dettaglio', desc: 'Clicca su una carta per aprire il pannello laterale: relazioni, storia, note, poteri e molto altro per quell\'elemento.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Create an element', desc: 'Characters, places, objects, creatures — everything in your world is an element. Click + to add one.' },
      { element: '.view-hd', title: 'Filters & sorting', desc: 'Filter by category, importance, status or narrative arc. You can combine multiple filters.' },
      { title: 'Detail panel', desc: 'Click any card to open the sidebar panel: relationships, history, notes, powers and much more.' },
    ],
  },

  timeline: {
    it: [
      { element: '.view-hd .btn-p', title: 'Aggiungi un evento', desc: 'Ogni momento storico del tuo mondo è un evento. Specifica data in-world, tipo e descrizione.' },
      { title: 'Ordine cronologico', desc: 'Gli eventi appaiono in ordine cronologico con linea visiva. Filtra per tipo per concentrarti su una parte della storia.' },
      { title: 'Collega agli elementi', desc: 'Ogni evento può essere collegato a personaggi, luoghi e sessioni di gioco per tracciare chi era presente.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Add an event', desc: 'Every historical moment in your world is an event. Specify in-world date, type and description.' },
      { title: 'Chronological order', desc: 'Events appear in chronological order with a visual line. Filter by type to focus on a specific part of the story.' },
      { title: 'Link to elements', desc: 'Each event can be linked to characters, places and sessions to track who was present.' },
    ],
  },

  mappa: {
    it: [
      { title: 'Carica la tua mappa', desc: 'Inizia caricando un\'immagine (PNG, JPG) come sfondo. Può essere una mappa disegnata a mano o digitale.' },
      { title: 'Aggiungi luoghi', desc: 'Clicca "+ Aggiungi luogo" poi clicca sulla mappa per piazzare un pin. Ogni pin può essere collegato a un elemento del database.' },
      { title: 'Timeline geografica', desc: 'Scorri il tempo nel filtro data per vedere dove si trovavano i personaggi in un preciso momento della storia.' },
    ],
    en: [
      { title: 'Load your map', desc: 'Start by uploading an image (PNG, JPG) as the background. It can be a hand-drawn or digital map.' },
      { title: 'Add places', desc: 'Click "+ Add place" then click on the map to place a pin. Each pin can be linked to a database element.' },
      { title: 'Geographic timeline', desc: 'Use the date filter to see where characters were at a specific moment in your story.' },
    ],
  },

  fazioni: {
    it: [
      { element: '.view-hd .btn-p', title: 'Crea una fazione', desc: 'Gilde, ordini, culti, fazioni politiche. Ogni organizzazione può avere sottofazioni e una gerarchia.' },
      { title: 'Collega i membri', desc: 'Dal pannello dettaglio di ogni fazione aggiungi membri, leader, alleati e nemici tra gli elementi del mondo.' },
      { title: 'Relazioni tra fazioni', desc: 'Usa la vista Connessioni per visualizzare graficamente come le fazioni si relazionano tra loro.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Create a faction', desc: 'Guilds, orders, cults, political factions. Each organization can have subfactions and a hierarchy.' },
      { title: 'Link members', desc: 'From the detail panel of each faction add members, leaders, allies and enemies from the world elements.' },
      { title: 'Faction relationships', desc: 'Use the Connections view to visually see how factions relate to each other.' },
    ],
  },

  magia: {
    it: [
      { element: '.view-hd .btn-p', title: 'Crea un sistema di magia', desc: 'Definisci le regole, le fonti e le limitazioni della magia nel tuo mondo.' },
      { title: 'Collega ai personaggi', desc: 'Dal pannello dettaglio associa personaggi e creature: tracci chi può usare la magia e con quali poteri.' },
      { title: 'Poteri e incantesimi', desc: 'Ogni personaggio può avere poteri specifici collegati a un sistema magico, con nome, descrizione e intensità.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Create a magic system', desc: 'Define the rules, sources and limitations of magic in your world.' },
      { title: 'Link to characters', desc: 'From the detail panel, associate characters and creatures to track who can use magic and how.' },
      { title: 'Powers & spells', desc: 'Each character can have specific powers linked to a magic system, with name, description and intensity.' },
    ],
  },

  arcs: {
    it: [
      { element: '.view-hd .btn-p', title: 'Crea un arco narrativo', desc: 'Un arco è l\'evoluzione di una trama: ha fasi (Innesco, Sviluppo, Climax…), uno stato e elementi coinvolti.' },
      { title: 'Traccia le fasi', desc: 'Definisci le fasi dell\'arco e segna in quale si trova la storia al momento. Utile per non perdere il filo.' },
      { title: 'Collega tutto', desc: 'Associa personaggi, luoghi e sessioni all\'arco. Dal pannello dettaglio vedi il quadro completo della trama.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Create a story arc', desc: 'An arc is a storyline\'s evolution: it has phases (Trigger, Rising, Climax…), a status and involved elements.' },
      { title: 'Track phases', desc: 'Define the arc\'s phases and mark which one the story is currently in. Useful to not lose track.' },
      { title: 'Link everything', desc: 'Associate characters, places and sessions with the arc. The detail panel shows the full picture of the plot.' },
    ],
  },

  connections: {
    it: [
      { title: 'Il grafo delle relazioni', desc: 'Ogni nodo è un elemento del mondo. I link mostrano le relazioni tra personaggi, luoghi, fazioni e archi narrativi.' },
      { title: 'Naviga il grafo', desc: 'Trascina i nodi per riorganizzare, usa scroll o pinch per zoomare. Clicca un nodo per aprire il pannello dettaglio.' },
      { title: 'Filtra e focalizza', desc: 'Usa i filtri per categoria per semplificare la vista. Focalizza su un elemento per vedere solo le sue connessioni dirette.' },
    ],
    en: [
      { title: 'The relationship graph', desc: 'Each node is a world element. Links show relationships between characters, places, factions and arcs.' },
      { title: 'Navigate the graph', desc: 'Drag nodes to rearrange, scroll or pinch to zoom. Click a node to open the detail panel.' },
      { title: 'Filter & focus', desc: 'Use category filters to simplify the view. Focus on one element to see only its direct connections.' },
    ],
  },

  analisi: {
    it: [
      { title: 'Analisi automatica con AI', desc: 'Incolla un testo (riassunto sessione, racconto, scheda PG) e Nexar lo analizza con AI per estrarre proposte utili al tuo mondo.' },
      { title: 'Tipi di proposte', desc: 'L\'AI può rilevare: nuovi elementi da creare, connessioni mancanti, incongruenze narrative, aggiornamenti a descrizioni e fazioni.' },
      { title: 'Applica o scarta', desc: 'Ogni proposta può essere accettata (si applica al database) oppure scartata. Rimangono salvate finché non decidi.' },
    ],
    en: [
      { title: 'Automatic AI analysis', desc: 'Paste a text (session recap, story, character sheet) and Nexar uses AI to extract useful proposals for your world.' },
      { title: 'Proposal types', desc: 'The AI can detect: new elements to create, missing connections, narrative inconsistencies, description and faction updates.' },
      { title: 'Apply or discard', desc: 'Each proposal can be accepted (applied to the database) or discarded. They remain saved until you decide.' },
    ],
  },

  testi: {
    it: [
      { element: '.view-hd .btn-p', title: 'Salva un testo', desc: 'Carica un file .txt/.md o incolla il testo direttamente. Nexar lo divide in sezioni/capitoli automaticamente.' },
      { title: 'Leggi e analizza', desc: 'Ogni testo salvato può essere letto nel reader, rinominato o inviato direttamente all\'analisi AI con un click.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Save a text', desc: 'Upload a .txt/.md file or paste text directly. Nexar splits it into sections/chapters automatically.' },
      { title: 'Read and analyze', desc: 'Each saved text can be read, renamed or sent directly to AI analysis with one click.' },
    ],
  },

  editor: {
    it: [
      { title: 'Editor narrativo', desc: 'Scrivi contenuti con formattazione avanzata: titoli, grassetto, corsivo, liste e molto altro. Salva con Ctrl+S.' },
      { title: 'Capitoli e statistiche', desc: 'Organizza il documento in capitoli nella colonna sinistra. Le statistiche mostrano il conteggio parole in tempo reale.' },
      { title: 'Collega al mondo', desc: 'Nel pannello a destra puoi collegare gli elementi del database menzionati nel capitolo per tenere tutto connesso.' },
    ],
    en: [
      { title: 'Narrative editor', desc: 'Write content with advanced formatting: headings, bold, italic, lists and more. Save with Ctrl+S.' },
      { title: 'Chapters & statistics', desc: 'Organize the document into chapters in the left column. Statistics show real-time word count.' },
      { title: 'Link to the world', desc: 'In the right panel link database elements mentioned in the chapter to keep everything connected.' },
    ],
  },

  sessioni: {
    it: [
      { element: '.view-hd .btn-p', title: 'Registra una sessione', desc: 'Ogni sessione ha numero, titolo, data reale e riassunto. Il diario permanente della tua campagna.' },
      { title: 'Tab Preparazione', desc: 'Prima della sessione: prepara PNG coinvolti, luoghi previsti, fili narrativi attivi e obiettivi DM con checklist.' },
      { title: 'Tab Riassunto', desc: 'Dopo la sessione: documenta cosa è successo. I riassunti costruiscono la memoria storica della campagna.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Record a session', desc: 'Each session has a number, title, real date and summary. The permanent diary of your campaign.' },
      { title: 'Preparation tab', desc: 'Before the session: prepare involved PCs, expected locations, active narrative threads and DM objectives with checklist.' },
      { title: 'Summary tab', desc: 'After the session: document what happened. Summaries build the historical memory of your campaign.' },
    ],
  },

  fili: {
    it: [
      { element: '.view-hd .btn-p', title: 'Crea un filo narrativo', desc: 'Un filo è una sottotrama o mistero in corso. Parte Aperto → In sviluppo → Risolto.' },
      { title: 'Avanza il filo', desc: 'Usa i pulsanti sulla carta per spostare il filo alla fase successiva man mano che la storia progredisce.' },
      { title: 'Collega sessioni e personaggi', desc: 'Associa ogni filo alle sessioni in cui è apparso e ai personaggi coinvolti per non perdere il filo della trama.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Create a narrative thread', desc: 'A thread is a subplot or ongoing mystery. It starts Open → In Progress → Resolved.' },
      { title: 'Advance the thread', desc: 'Use the buttons on the card to move the thread to the next phase as the story progresses.' },
      { title: 'Link sessions & characters', desc: 'Associate each thread with sessions where it appeared and involved characters to never lose track.' },
    ],
  },

  rumors: {
    it: [
      { element: '.view-hd .btn-p', title: 'Aggiungi un rumor', desc: 'Voci, indiscrezioni, segreti. Ogni rumor ha una fonte, uno stato e può essere collegato agli elementi coinvolti.' },
      { title: 'Traccia lo stato', desc: 'Ogni rumor parte come Ignoto. Man mano che i giocatori indagano: In indagine → Confermato o Smentito.' },
      { title: 'Note DM private', desc: 'Aggiungi note DM visibili solo a te — la verità dietro la voce — separate dal testo pubblico del rumor.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Add a rumor', desc: 'Rumors, gossip, secrets. Each rumor has a source, status and can be linked to involved elements.' },
      { title: 'Track status', desc: 'Each rumor starts Unknown. As players investigate: Under Investigation → Confirmed or Debunked.' },
      { title: 'Private DM notes', desc: 'Add DM-only notes — the truth behind the rumor — separate from the public rumor text.' },
    ],
  },

  handout: {
    it: [
      { element: '.view-hd .btn-p', title: 'Crea un handout', desc: 'Lettere, mappe, indizi, pergamene — documenti da mostrare fisicamente ai giocatori durante la sessione.' },
      { title: 'Rivela ai giocatori', desc: 'Ogni handout è nascosto di default. Usa "Rivela" per renderlo visibile. Solo gli handout rivelati appaiono ai tuoi giocatori.' },
      { title: 'Collega a sessioni', desc: 'Associa ogni handout alla sessione in cui viene introdotto e agli elementi del mondo che cita.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Create a handout', desc: 'Letters, maps, clues, parchments — documents to physically show players during the session.' },
      { title: 'Reveal to players', desc: 'Each handout is hidden by default. Use "Reveal" to make it visible. Only revealed handouts appear to your players.' },
      { title: 'Link to sessions', desc: 'Associate each handout with the session it\'s introduced in and the world elements it mentions.' },
    ],
  },

  tavole: {
    it: [
      { element: '.view-hd .btn-p', title: 'Crea una tavola casuale', desc: 'Una tavola è una lista di risultati possibili, ognuno con un peso che ne determina la probabilità relativa.' },
      { title: 'Come funzionano i pesi', desc: 'Peso 2 = doppia probabilità rispetto a peso 1. Esempio: voci con peso 1, 1, 2 → la terza voce esce nel 50% dei casi.' },
      { title: 'Tira e trasporta', desc: 'Clicca 🎲 Tira per un risultato casuale ponderato. Esporta le tavole in JSON e importale in qualsiasi altro mondo.' },
    ],
    en: [
      { element: '.view-hd .btn-p', title: 'Create a random table', desc: 'A table is a list of possible results, each with a weight that determines its relative probability.' },
      { title: 'How weights work', desc: 'Weight 2 = twice the probability of weight 1. Example: entries with weight 1, 1, 2 → third entry comes up 50% of the time.' },
      { title: 'Roll and transfer', desc: 'Click 🎲 Roll for a weighted random result. Export tables as JSON and import them into any other world.' },
    ],
  },
};

export function getViewTour(viewId, lang) {
  const tour = TOURS[viewId];
  if (!tour) return null;
  const steps = tour[lang] || tour.it;
  return steps.map(step => ({
    ...(step.element ? { element: step.element } : {}),
    popover: { title: step.title, description: step.desc, side: 'bottom' },
  }));
}

export const hasViewTour = (viewId) => !!TOURS[viewId];
