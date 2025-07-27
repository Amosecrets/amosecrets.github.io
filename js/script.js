// ========== 1. Define your games here ==============
const games = [
  {
    title: 'Space Blaster',
    image: 'assets/space-blaster.jpg',
    description: 'An infinite arcade shooter. Defeat waves, upgrade weapons, survive!',
    genres: ['Shooter', 'Arcade'],
    playLink: 'games/space-blaster/index.html',
    repoLink: 'https://github.com/you/space-blaster'
  },
  {
    title: 'Puzzle Escape',
    image: 'assets/puzzle-escape.jpg',
    description: 'A bite-sized, portal-style first-person puzzle game built with Three.js.',
    genres: ['Puzzle', '3D'],
    playLink: 'games/puzzle-escape/',
    repoLink: 'https://github.com/you/puzzle-escape'
  },
  {
    title: 'Turbo Racer',
    image: 'assets/turbo-racer.jpg',
    description: 'Retro-style top-down racing with drifting, nitro, and pixel art.',
    genres: ['Racing', 'Arcade'],
    playLink: 'https://you.itch.io/turbo-racer',
    repoLink: ''
  }
  // Add more objects in the same shape ↓
];

// ========== 2. Populate genre <select> =============
const genreSelect = document.getElementById('genreFilter');
const uniqueGenres = [...new Set(games.flatMap(g => g.genres))].sort();
uniqueGenres.forEach(g => {
  const opt = document.createElement('option');
  opt.value = g;
  opt.textContent = g;
  genreSelect.appendChild(opt);
});

// ========== 3. Render game cards ===================
const grid = document.getElementById('gameGrid');
function createCard(game) {
  const card = document.createElement('article');
  card.className = 'card';
  card.innerHTML = `
      <img src="${game.image}" alt="${game.title} screenshot">
      <div class="card-body">
        <h3>${game.title}</h3>
        <div class="tags">${game.genres.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        <p>${game.description}</p>
        <div class="card-actions">
          <a href="${game.playLink}" class="play" target="_blank" rel="noopener">Play</a>
          ${game.repoLink ? `<a href="${game.repoLink}" class="repo" target="_blank" rel="noopener">Repo</a>` : ''}
        </div>
      </div>`;
  return card;
}
function render(filterText='', genre='all'){
  grid.innerHTML = '';
  games
    .filter(g =>
      g.title.toLowerCase().includes(filterText) &&
      (genre === 'all' || g.genres.includes(genre))
    )
    .forEach(g => grid.appendChild(createCard(g)));

  // If no games match, show a friendly message.
  if(!grid.children.length){
    grid.innerHTML = `<p style="opacity:.7">No games match your search.</p>`;
  }
}

// ========== 4. Hook up filters =====================
const searchBar = document.getElementById('searchBar');
searchBar.addEventListener('input', () => {
  render(searchBar.value.trim().toLowerCase(), genreSelect.value);
});
genreSelect.addEventListener('change', () => {
  render(searchBar.value.trim().toLowerCase(), genreSelect.value);
});

// ========== 5. Initial render & misc ===============
render();
document.getElementById('year').textContent = new Date().getFullYear();