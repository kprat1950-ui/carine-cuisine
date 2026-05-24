let recipes = JSON.parse(localStorage.getItem('carine_recipes') || '[]');
let courses = JSON.parse(localStorage.getItem('carine_courses') || '[]');
let currentRecipe = null;
let editingId = null;
let currentFilter = 'all';
let currentPortions = 4;
let basePortions = 4;
let currentPhotoBase64 = null;

function saveRecipes() { localStorage.setItem('carine_recipes', JSON.stringify(recipes)); }
function saveCourses() { localStorage.setItem('carine_courses', JSON.stringify(courses)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function showToast(msg, type) {
  type = type || '';
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(function() { toast.className = 'toast hidden'; }, 2500);
}

function getCatLabel(cat) {
  const map = { entrees: 'Entrees', plats: 'Plats', desserts: 'Desserts', boissons: 'Boissons', snacks: 'Snacks' };
  return map[cat] || cat;
}
function getCatEmoji(cat) {
  const map = { entrees: '🥗', plats: '🍽️', desserts: '🍰', boissons: '🥤', snacks: '🧁' };
  return map[cat] || '🍴';
}
function formatTime(min) {
  if (!min) return '-';
  if (min < 60) return min + ' min';
  var h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? h + 'h' + m : h + 'h';
}

window.addEventListener('load', function() {
  setTimeout(function() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    renderRecipes();
    updateStats();
  }, 2600);
});

function renderRecipes(filter, searchTerm) {
  filter = filter || currentFilter;
  searchTerm = searchTerm || '';
  var grid = document.getElementById('recipes-grid');
  var empty = document.getElementById('empty-state');
  var filtered = recipes.filter(function(r) {
    if (filter === 'favoris') return r.fav;
    if (filter !== 'all') return r.cat === filter;
    return true;
  });
  if (searchTerm.trim()) {
    var term = searchTerm.toLowerCase();
    filtered = filtered.filter(function(r) {
      return r.name.toLowerCase().includes(term) ||
        (r.desc || '').toLowerCase().includes(term) ||
        (r.ingredients || []).some(function(i) { return i.name.toLowerCase().includes(term); });
    });
  }
  if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(function(recipe) {
    return '<div class="recipe-card" onclick="openDetail('' + recipe.id + '')">' +
      '<div class="card-img-container">' +
      (recipe.photo ? '<img src="' + recipe.photo + '" alt="' + recipe.name + '" loading="lazy" />' : '<div class="card-img-placeholder">' + getCatEmoji(recipe.cat) + '</div>') +
      '<button class="card-fav ' + (recipe.fav ? 'active' : '') + '" onclick="toggleFav(event,'' + recipe.id + '')"><i class="fas fa-heart"></i></button>' +
      '<span class="card-cat-badge">' + getCatLabel(recipe.cat) + '</span>' +
      '</div><div class="card-body">' +
      '<div class="card-title">' + recipe.name + '</div>' +
      '<div class="card-meta"><i class="fas fa-clock"></i> ' + formatTime(recipe.time) + ' <i class="fas fa-users"></i> ' + (recipe.portions || 4) + '</div>' +
      '</div></div>';
  }).join('');
}

function updateStats() {
  document.getElementById('stat-total').textContent = recipes.length;
  document.getElementById('stat-favs').textContent = recipes.filter(function(r) { return r.fav; }).length;
  document.getElementById('stat-cat').textContent = new Set(recipes.map(function(r) { return r.cat; })).size;
}

function toggleFav(e, id) {
  e.stopPropagation();
  var r = recipes.find(function(r) { return r.id === id; });
  if (!r) return;
  r.fav = !r.fav;
  saveRecipes(); renderRecipes(); updateStats();
  showToast(r.fav ? 'Ajoute aux favoris !' : 'Retire des favoris', r.fav ? 'success' : '');
  if (currentRecipe && currentRecipe.id === id) {
    document.getElementById('btn-fav-detail').classList.toggle('active', r.fav);
    currentRecipe.fav = r.fav;
  }
}

var searchInput = document.getElementById('search-input');
var searchClear = document.getElementById('search-clear');
searchInput.addEventListener('input', function() {
  searchClear.classList.toggle('hidden', !searchInput.value);
  renderRecipes(currentFilter, searchInput.value);
});
searchClear.addEventListener('click', function() {
  searchInput.value = ''; searchClear.classList.add('hidden');
  renderRecipes(currentFilter, '');
});

document.querySelectorAll('.cat-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = btn.dataset.cat;
    renderRecipes(currentFilter, searchInput.value);
  });
});

function openDetail(id) {
  var r = recipes.find(function(r) { return r.id === id; });
  if (!r) return;
  currentRecipe = r;
  basePortions = r.portions || 4;
  currentPortions = basePortions;
  document.getElementById('detail-img').src = r.photo || '';
  document.getElementById('detail-img').style.display = r.photo ? 'block' : 'none';
  document.getElementById('detail-cat-badge').textContent = getCatLabel(r.cat);
  document.getElementById('detail-title').textContent = r.name;
  document.getElementById('detail-desc').textContent = r.desc || '';
  document.getElementById('detail-time').textContent = formatTime(r.time);
  document.getElementById('detail-portions').textContent = r.portions || 4;
  document.getElementById('detail-diff').textContent = r.diff || 'Facile';
  document.getElementById('portions-display').textContent = currentPortions;
  document.getElementById('btn-fav-detail').classList.toggle('active', !!r.fav);
  renderIngredients(r.ingredients || [], currentPortions, basePortions);
  renderSteps(r.steps || []);
  var videoSection = document.getElementById('detail-video-section');
  if (r.video) {
    videoSection.classList.remove('hidden');
    var link = document.getElementById('detail-video-link');
    link.href = r.video;
    var isTT = r.video.includes('tiktok');
    var isYT = r.video.includes('youtube') || r.video.includes('youtu.be');
    link.innerHTML = '<i class="fa' + (isTT ? 'b fa-tiktok' : isYT ? 'b fa-youtube' : 's fa-play-circle') + '"></i> Voir la video';
  } else { videoSection.classList.add('hidden'); }
  var notesSection = document.getElementById('detail-notes-section');
  if (r.notes) {
    notesSection.classList.remove('hidden');
    document.getElementById('detail-notes').textContent = r.notes;
  } else { notesSection.classList.add('hidden'); }
  document.getElementById('modal-detail').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function renderIngredients(ingredients, portions, base) {
  document.getElementById('detail-ingredients').innerHTML = ingredients.map(function(ing) {
    var qtyDisplay = ing.qty;
    if (ing.qty && !isNaN(parseFloat(ing.qty))) {
      var adjusted = parseFloat(ing.qty) * portions / base;
      qtyDisplay = (Number.isInteger(adjusted) ? adjusted : adjusted.toFixed(1)) + (ing.unit ? ' ' + ing.unit : '');
    } else if (ing.qty) { qtyDisplay = ing.qty + (ing.unit ? ' ' + ing.unit : ''); }
    return '<li><span class="ingredient-dot"></span><span class="ingredient-qty">' + (qtyDisplay || '') + '</span><span class="ingredient-name">' + ing.name + '</span></li>';
  }).join('');
}

function renderSteps(steps) {
  document.getElementById('detail-steps').innerHTML = steps.map(function(step, i) {
    return '<li onclick="this.querySelector('.step-text').classList.toggle('done')">' +
      '<span class="step-number">' + (i+1) + '</span>' +
      '<span class="step-text">' + step + '</span></li>';
  }).join('');
}

document.getElementById('portions-minus').addEventListener('click', function() {
  if (currentPortions <= 1) return;
  currentPortions--;
  document.getElementById('portions-display').textContent = currentPortions;
  renderIngredients(currentRecipe.ingredients || [], currentPortions, basePortions);
});
document.getElementById('portions-plus').addEventListener('click', function() {
  currentPortions++;
  document.getElementById('portions-display').textContent = currentPortions;
  renderIngredients(currentRecipe.ingredients || [], currentPortions, basePortions);
});

document.getElementById('btn-back-detail').addEventListener('click', closeDetail);
document.getElementById('overlay-detail').addEventListener('click', closeDetail);
function closeDetail() {
  document.getElementById('modal-detail').classList.add('hidden');
  document.body.style.overflow = '';
  currentRecipe = null;
}

document.getElementById('btn-fav-detail').addEventListener('click', function() {
  if (currentRecipe) toggleFav({ stopPropagation: function() {} }, currentRecipe.id);
});
document.getElementById('btn-edit-detail').addEventListener('click', function() {
  if (currentRecipe) { var id = currentRecipe.id; closeDetail(); setTimeout(function() { openForm(id); }, 100); }
});

function openForm(editId) {
  editId = editId || null;
  editingId = editId;
  document.getElementById('form-title').textContent = editId ? 'Modifier la recette' : 'Nouvelle recette';
  clearForm();
  if (editId) { var r = recipes.find(function(r) { return r.id === editId; }); if (r) fillForm(r); }
  else { addIngredientRow(); addStepRow(); }
  document.getElementById('modal-form').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function clearForm() {
  ['form-name','form-desc','form-video','form-notes'].forEach(function(id) { document.getElementById(id).value = ''; });
  document.getElementById('form-cat').value = 'plats';
  document.getElementById('form-diff').value = 'Facile';
  document.getElementById('form-time').value = '';
  document.getElementById('form-portions').value = '';
  document.getElementById('photo-preview').src = '';
  document.getElementById('photo-preview').classList.add('hidden');
  document.getElementById('photo-placeholder').style.display = 'flex';
  document.getElementById('ingredients-list-form').innerHTML = '';
  document.getElementById('steps-list-form').innerHTML = '';
  currentPhotoBase64 = null;
}

function fillForm(r) {
  document.getElementById('form-name').value = r.name || '';
  document.getElementById('form-desc').value = r.desc || '';
  document.getElementById('form-cat').value = r.cat || 'plats';
  document.getElementById('form-diff').value = r.diff || 'Facile';
  document.getElementById('form-time').value = r.time || '';
  document.getElementById('form-portions').value = r.portions || '';
  document.getElementById('form-video').value = r.video || '';
  document.getElementById('form-notes').value = r.notes || '';
  if (r.photo) {
    document.getElementById('photo-preview').src = r.photo;
    document.getElementById('photo-preview').classList.remove('hidden');
    document.getElementById('photo-placeholder').style.display = 'none';
    currentPhotoBase64 = r.photo;
  }
  (r.ingredients || []).forEach(function(ing) { addIngredientRow(ing.qty, ing.unit, ing.name); });
  if (!r.ingredients || r.ingredients.length === 0) addIngredientRow();
  (r.steps || []).forEach(function(step) { addStepRow(step); });
  if (!r.steps || r.steps.length === 0) addStepRow();
}

function addIngredientRow(qty, unit, name) {
  qty = qty || ''; unit = unit || ''; name = name || '';
  var container = document.getElementById('ingredients-list-form');
  var row = document.createElement('div');
  row.className = 'ingredient-form-row';
  row.innerHTML = '<input type="text" placeholder="Qte" value="' + qty + '" class="ing-qty" />' +
    '<input type="text" placeholder="Unite" value="' + unit + '" class="ing-unit" style="flex:0 0 70px"/>' +
    '<input type="text" placeholder="Nom ingredient" value="' + name + '" class="ing-name" />' +
    '<button class="btn-remove-item" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
  container.appendChild(row);
}
document.getElementById('btn-add-ingredient').addEventListener('click', function() { addIngredientRow(); });

function addStepRow(text) {
  text = text || '';
  var container = document.getElementById('steps-list-form');
  var count = container.children.length + 1;
  var row = document.createElement('div');
  row.className = 'step-form-row';
  row.innerHTML = '<span class="step-num-badge">' + count + '</span>' +
    '<textarea placeholder="Decris cette etape..." rows="2" class="step-text-input">' + text + '</textarea>' +
    '<button class="btn-remove-item" onclick="this.parentElement.remove();updateStepNumbers()"><i class="fas fa-times"></i></button>';
  container.appendChild(row);
}
function updateStepNumbers() {
  document.querySelectorAll('#steps-list-form .step-num-badge').forEach(function(b, i) { b.textContent = i + 1; });
}
document.getElementById('btn-add-step').addEventListener('click', function() { addStepRow(); });

document.getElementById('form-photo-picker').addEventListener('click', function() { document.getElementById('photo-input').click(); });
document.getElementById('photo-input').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    currentPhotoBase64 = ev.target.result;
    document.getElementById('photo-preview').src = currentPhotoBase64;
    document.getElementById('photo-preview').classList.remove('hidden');
    document.getElementById('photo-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
});

document.getElementById('btn-save-recipe').addEventListener('click', saveRecipe);
function saveRecipe() {
  var name = document.getElementById('form-name').value.trim();
  if (!name) { showToast('Donne un nom a la recette !', 'error'); return; }
  var ingredients = Array.from(document.querySelectorAll('.ingredient-form-row')).map(function(row) {
    return { qty: row.querySelector('.ing-qty').value.trim(), unit: row.querySelector('.ing-unit').value.trim(), name: row.querySelector('.ing-name').value.trim() };
  }).filter(function(i) { return i.name; });
  var steps = Array.from(document.querySelectorAll('.step-text-input')).map(function(t) { return t.value.trim(); }).filter(function(s) { return s; });
  var existing = editingId ? recipes.find(function(r) { return r.id === editingId; }) : null;
  var recipe = {
    id: editingId || generateId(),
    name: name,
    desc: document.getElementById('form-desc').value.trim(),
    cat: document.getElementById('form-cat').value,
    diff: document.getElementById('form-diff').value,
    time: parseInt(document.getElementById('form-time').value) || null,
    portions: parseInt(document.getElementById('form-portions').value) || 4,
    video: document.getElementById('form-video').value.trim(),
    notes: document.getElementById('form-notes').value.trim(),
    photo: currentPhotoBase64 || null,
    ingredients: ingredients,
    steps: steps,
    fav: existing ? existing.fav : false,
    createdAt: Date.now()
  };
  if (editingId) {
    var idx = recipes.findIndex(function(r) { return r.id === editingId; });
    if (idx !== -1) recipes[idx] = recipe;
    showToast('Recette modifiee !', 'success');
  } else {
    recipes.unshift(recipe);
    showToast('Recette ajoutee !', 'success');
  }
  saveRecipes(); closeForm(); renderRecipes(); updateStats();
}

function closeForm() {
  document.getElementById('modal-form').classList.add('hidden');
  document.body.style.overflow = '';
  editingId = null;
}
document.getElementById('btn-back-form').addEventListener('click', closeForm);
document.getElementById('overlay-form').addEventListener('click', closeForm);

document.getElementById('btn-delete-recipe').addEventListener('click', function() {
  if (!currentRecipe) return;
  if (!confirm('Supprimer cette recette ?')) return;
  recipes = recipes.filter(function(r) { return r.id !== currentRecipe.id; });
  saveRecipes(); closeDetail(); renderRecipes(); updateStats();
  showToast('Recette supprimee');
});

function openCourses() {
  renderCourses();
  document.getElementById('modal-courses').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}
function closeCourses() {
  document.getElementById('modal-courses').classList.add('hidden');
  document.body.style.overflow = '';
}
function renderCourses() {
  var list = document.getElementById('courses-list');
  var empty = document.getElementById('courses-empty');
  if (courses.length === 0) { list.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  list.innerHTML = courses.map(function(item, i) {
    return '<li class="courses-item ' + (item.checked ? 'checked' : '') + '" onclick="toggleCourse(' + i + ')">' +
      '<div class="courses-checkbox"></div>' +
      '<span class="courses-qty">' + (item.qty || '') + '</span>' +
      '<span>' + item.name + '</span>' +
      '<span class="courses-from">' + (item.from || '') + '</span></li>';
  }).join('');
}
function toggleCourse(i) {
  courses[i].checked = !courses[i].checked;
  saveCourses(); renderCourses();
}

document.getElementById('btn-add-to-courses').addEventListener('click', function() {
  if (!currentRecipe) return;
  var ings = currentRecipe.ingredients || [];
  if (ings.length === 0) { showToast('Aucun ingredient !', 'error'); return; }
  ings.forEach(function(ing) {
    if (!ing.name) return;
    if (!courses.find(function(c) { return c.name.toLowerCase() === ing.name.toLowerCase(); })) {
      courses.push({ name: ing.name, qty: ing.qty ? ing.qty + (ing.unit ? ' ' + ing.unit : '') : '', from: currentRecipe.name, checked: false });
    }
  });
  saveCourses(); showToast('Ingredients ajoutes aux courses !', 'success');
});

document.getElementById('btn-clear-courses').addEventListener('click', function() {
  if (!confirm('Vider toute la liste ?')) return;
  courses = []; saveCourses(); renderCourses(); showToast('Liste videe');
});

document.getElementById('btn-back-courses').addEventListener('click', closeCourses);
document.getElementById('overlay-courses').addEventListener('click', closeCourses);
document.getElementById('btn-courses').addEventListener('click', openCourses);
document.getElementById('btn-add-main').addEventListener('click', function() { openForm(); });
document.getElementById('btn-add-empty').addEventListener('click', function() { openForm(); });
document.getElementById('nav-add').addEventListener('click', function() { openForm(); });
document.getElementById('nav-courses-btn').addEventListener('click', openCourses);
document.getElementById('nav-favs').addEventListener('click', function() {
  currentFilter = 'favoris';
  document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.cat === 'favoris'); });
  renderRecipes('favoris', '');
});
document.getElementById('nav-home').addEventListener('click', function() {
  currentFilter = 'all';
  document.querySelectorAll('.cat-btn').forEach(function(b) { b.classList.toggle('active', b.dataset.cat === 'all'); });
  searchInput.value = ''; renderRecipes('all', '');
});
document.getElementById('nav-search-btn').addEventListener('click', function() { searchInput.focus(); });
