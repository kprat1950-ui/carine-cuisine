let recipes = JSON.parse(localStorage.getItem('carine_recipes') || '[]');
let courses = JSON.parse(localStorage.getItem('carine_courses') || '[]');
let currentRecipe = null;
let editingId = null;
let currentFilter = 'all';
let currentPortions = 4;
let basePortions = 4;
let portionsMemory = JSON.parse(localStorage.getItem('carine_portions') || '{}');
let currentPhotoBase64 = null;

function saveRecipes() { localStorage.setItem('carine_recipes', JSON.stringify(recipes)); }
function saveCourses() { localStorage.setItem('carine_courses', JSON.stringify(courses)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function showToast(msg, type) {
  type = type || '';
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  setTimeout(function() { toast.className = 'toast hidden'; }, 2500);
}

function getCatLabel(cat) {
  var map = { entrees: 'Entrees', plats: 'Plats', desserts: 'Desserts', boissons: 'Boissons', snacks: 'Snacks' };
  return map[cat] || cat;
}
function getCatEmoji(cat) {
  var map = { entrees: '🥗', plats: '🍽', desserts: '🍰', boissons: '🥤', snacks: '🧁' };
  return map[cat] || '🍴';
}
function formatTime(min) {
  if (!min) return '-';
  if (min < 60) return min + ' min';
  var h = Math.floor(min / 60), m = min % 60;
  return m > 0 ? h + 'h' + m : h + 'h';
}

var loveMessages = ["Je t’aime autant que tu aimes la cuisine... et c’est infini 🍓","Avec toi, même les recettes ratées deviennent un souvenir parfait 🥰","Pétillante comme le champagne, douce comme la crème brülée ✨","Ces yeux verts qui étincellent... même tes recettes ne sont pas aussi envoutantes 💚","Une sportive qui ne lâche rien, même devant une recette compliquée 💪🍳","Ta cuisine a un super pouvoir : elle transforme chaque repas en moment magique 🌟","Tu es le secret ingrédient de chaque recette que tu touches 🌟","Aussi belle que pétillante, aussi forte que gourmande — c’est toi, Carine 👑","Tes yeux verts brillent plus que toutes les étoiles Michelin 💚⭐","Chaque recette que tu cuisines est une déclaration d’amour 🍓"];

window.addEventListener('load', function() {
  var msg = loveMessages[Math.floor(Math.random() * loveMessages.length)];
  var msgEl = document.getElementById('splash-love-msg');
  if (msgEl) msgEl.textContent = msg;
  setTimeout(function() {
    document.getElementById('splash-screen').style.display = 'none';
    document.getElementById('app').classList.remove('hidden');
    renderRecipes();
    updateStats();
  }, 3200);
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
      return r.name.toLowerCase().indexOf(term) >= 0 ||
        (r.desc || '').toLowerCase().indexOf(term) >= 0 ||
        (r.ingredients || []).some(function(i) { return i.name.toLowerCase().indexOf(term) >= 0; });
    });
  }
  if (filtered.length === 0) { grid.innerHTML = ''; empty.classList.remove('hidden'); return; }
  empty.classList.add('hidden');
  grid.innerHTML = filtered.map(function(recipe) {
    var imgHtml = recipe.photo
      ? '<img src="' + recipe.photo + '" alt="" loading="lazy" />'
      : '<div class="card-img-placeholder">' + getCatEmoji(recipe.cat) + '</div>';
    return '<div class="recipe-card" onclick="openDetail(`' + recipe.id + '`)">'
      + '<div class="card-img-container">' + imgHtml
      + '<button type="button" class="card-fav ' + (recipe.fav ? 'active' : '') + '" onclick="event.stopPropagation();toggleFav(`' + recipe.id + '`)"><i class="fas fa-heart"></i></button>'
      + '<span class="card-cat-badge">' + getCatLabel(recipe.cat) + '</span>'
      + '</div><div class="card-body">'
      + '<div class="card-title">' + recipe.name + '</div>'
      + '<div class="card-meta"><i class="fas fa-clock"></i> ' + formatTime(recipe.time) + ' <i class="fas fa-users"></i> ' + (recipe.portions || 4) + '</div>'
      + '</div></div>';
  }).join('');
}

function updateStats() {
  document.getElementById('stat-total').textContent = recipes.length;
  document.getElementById('stat-favs').textContent = recipes.filter(function(r) { return r.fav; }).length;
  document.getElementById('stat-cat').textContent = new Set(recipes.map(function(r) { return r.cat; })).size;
}

function toggleFav(id) {
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
  currentPortions = portionsMemory[r.id] !== undefined ? portionsMemory[r.id] : basePortions;
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
    var icon = r.video.indexOf('tiktok') >= 0 ? 'fab fa-tiktok' : (r.video.indexOf('youtube') >= 0 || r.video.indexOf('youtu.be') >= 0 ? 'fab fa-youtube' : 'fas fa-play-circle');
    link.innerHTML = '<i class="' + icon + '"></i> Voir la video';
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
  var el = document.getElementById('detail-ingredients');
  if (!ingredients || ingredients.length === 0) { el.innerHTML = '<li class="empty-list">Aucun ingredient</li>'; return; }
  var isSectioned = ingredients.length > 0 && typeof ingredients[0].items !== 'undefined';
  if (!isSectioned) {
    el.innerHTML = ingredients.map(function(ing) {
      var qty = (portions && base && ing.qty) ? (parseFloat(ing.qty) * portions / base).toFixed(1).replace(/\.0$/,'') : (ing.qty || '');
      var rawQty = parseFloat(ing.qty);
      return '<li class="ing-item"><span class="ing-qty conv-qty" onclick="showConversionPopup(event,\'' + qty + '\',\'' + (ing.unit || '').replace(/'/g, '') + '\')" title="📏 Convertir">' + qty + ' ' + (ing.unit || '') + '</span><span class="ing-name">' + ing.name + '</span></li>';
    }).join('');
  } else {
    el.innerHTML = ingredients.map(function(section) {
      var title = section.title ? '<li class="ing-section-title"><i class="fas fa-layer-group"></i> ' + section.title + '</li>' : '';
      var items = (section.items || []).map(function(ing) {
        var qty = (portions && base && ing.qty) ? (parseFloat(ing.qty) * portions / base).toFixed(1).replace(/\.0$/,'') : (ing.qty || '');
        var rawQty = parseFloat(ing.qty);
      return '<li class="ing-item"><span class="ing-qty conv-qty" onclick="showConversionPopup(event,\'' + qty + '\',\'' + (ing.unit || '').replace(/'/g, '') + '\')" title="📏 Convertir">' + qty + ' ' + (ing.unit || '') + '</span><span class="ing-name">' + ing.name + '</span></li>';
      }).join('');
      return title + items;
    }).join('');
  }
}
function renderSteps(steps) {
  var el = document.getElementById('detail-steps');
  if (!steps || steps.length === 0) { el.innerHTML = '<li class="empty-list">Aucune etape</li>'; return; }
  var isSectioned = steps.length > 0 && typeof steps[0].items !== 'undefined';
  el.innerHTML = '';
  if (!isSectioned) {
    steps.forEach(function(s, i) {
      var li = document.createElement('li');
      li.className = 'step-item';
      li.innerHTML = '<span class="step-num">' + (i+1) + '</span><span class="step-text">' + s.text + '</span>';
      li.addEventListener('click', function() { this.querySelector('.step-text').classList.toggle('done'); });
      el.appendChild(li);
    });
  } else {
    var stepNum = 0;
    steps.forEach(function(section) {
      if (section.title) {
        var titleLi = document.createElement('li');
        titleLi.className = 'step-section-title';
        titleLi.innerHTML = '<i class="fas fa-layer-group"></i> ' + section.title;
        el.appendChild(titleLi);
      }
      (section.items || []).forEach(function(s) {
        stepNum++;
        var li = document.createElement('li');
        li.className = 'step-item';
        li.innerHTML = '<span class="step-num">' + stepNum + '</span><span class="step-text">' + s.text + '</span>';
        li.addEventListener('click', function() { this.querySelector('.step-text').classList.toggle('done'); });
        el.appendChild(li);
      });
    });
  }
}

function closeDetail() {
  document.getElementById('modal-detail').classList.add('hidden');
  document.body.style.overflow = '';
  currentRecipe = null;
}

document.getElementById('btn-fav-detail').addEventListener('click', function() {
  if (currentRecipe) toggleFav(currentRecipe.id);
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
    addIngredientSection('');
    document.getElementById('steps-list-form').innerHTML = '';
    addStepSection('');
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
    document.getElementById('ingredients-list-form').innerHTML = '';
    if (r.ingredients && r.ingredients.length > 0) {
      var ingIsSectioned = typeof r.ingredients[0].items !== 'undefined';
      if (!ingIsSectioned) {
        var sec = addIngredientSection('');
        var ilist = sec.querySelector('.ing-rows-list');
        ilist.innerHTML = '';
        r.ingredients.forEach(function(ing) {
          addIngredientRow(ilist);
          var row = ilist.lastElementChild;
          row.querySelector('.ing-qty').value = ing.qty || '';
          row.querySelector('.ing-unit').value = ing.unit || '';
          row.querySelector('.ing-name').value = ing.name || '';
        });
      } else {
        r.ingredients.forEach(function(section) {
          var sec = addIngredientSection(section.title || '');
          var ilist = sec.querySelector('.ing-rows-list');
          ilist.innerHTML = '';
          (section.items || []).forEach(function(ing) {
            addIngredientRow(ilist);
            var row = ilist.lastElementChild;
            row.querySelector('.ing-qty').value = ing.qty || '';
            row.querySelector('.ing-unit').value = ing.unit || '';
            row.querySelector('.ing-name').value = ing.name || '';
          });
        });
      }
    } else { addIngredientSection(''); }
    document.getElementById('steps-list-form').innerHTML = '';
    if (r.steps && r.steps.length > 0) {
      var stepIsSectioned = typeof r.steps[0].items !== 'undefined';
      if (!stepIsSectioned) {
        var ssec = addStepSection('');
        var slist = ssec.querySelector('.step-rows-list');
        slist.innerHTML = '';
        r.steps.forEach(function(step) {
          addStepRow(slist);
          slist.lastElementChild.querySelector('.step-text-input').value = step.text || '';
        });
        updateStepNumbers();
      } else {
        r.steps.forEach(function(section) {
          var ssec = addStepSection(section.title || '');
          var slist = ssec.querySelector('.step-rows-list');
          slist.innerHTML = '';
          (section.items || []).forEach(function(step) {
            addStepRow(slist);
            slist.lastElementChild.querySelector('.step-text-input').value = step.text || '';
          });
        });
        updateStepNumbers();
      }
    } else { addStepSection(''); }
}


function addIngredientSection(sectionTitle) {
  var container = document.getElementById('ingredients-list-form');
  var sectionDiv = document.createElement('div');
  sectionDiv.className = 'form-section-block';
  sectionDiv.innerHTML = '<div class="form-section-header">' +
    '<input type="text" class="section-title-input" placeholder="Titre de la section (ex: Pour la pate)" />' +
    '<button type="button" class="btn-remove-section" onclick="this.closest(\'.form-section-block\').remove()"><i class="fas fa-times"></i></button>' +
    '</div>' +
    '<ul class="ing-rows-list"></ul>' +
    '<button type="button" class="btn-add-item-in-section" onclick="addIngredientRow(this.previousElementSibling)">' +
    '<i class="fas fa-plus"></i> Ajouter un ingredient</button>';
  if (sectionTitle) sectionDiv.querySelector('.section-title-input').value = sectionTitle;
  container.appendChild(sectionDiv);
  addIngredientRow(sectionDiv.querySelector('.ing-rows-list'));
  return sectionDiv;
}

function addIngredientRow(list) {
  if (!list) list = document.querySelector('#ingredients-list-form .ing-rows-list:last-of-type');
  if (!list) return;
  var li = document.createElement('li');
  li.className = 'ingredient-form-row';
  li.innerHTML = '<input type="text" class="ing-qty" placeholder="Qte" />' +
    '<input type="text" class="ing-unit" placeholder="Unite" />' +
    '<input type="text" class="ing-name" placeholder="Nom ingredient" />' +
    '<button type="button" class="btn-remove-item" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>';
  list.appendChild(li);
}

function addStepSection(sectionTitle) {
  var container = document.getElementById('steps-list-form');
  var sectionDiv = document.createElement('div');
  sectionDiv.className = 'form-section-block';
  sectionDiv.innerHTML = '<div class="form-section-header">' +
    '<input type="text" class="section-title-input" placeholder="Titre de la section (ex: Preparer la pate)" />' +
    '<button type="button" class="btn-remove-section" onclick="this.closest(\'.form-section-block\').remove(); updateStepNumbers()"><i class="fas fa-times"></i></button>' +
    '</div>' +
    '<ol class="step-rows-list"></ol>' +
    '<button type="button" class="btn-add-item-in-section" onclick="addStepRow(this.previousElementSibling)">' +
    '<i class="fas fa-plus"></i> Ajouter une etape</button>';
  if (sectionTitle) sectionDiv.querySelector('.section-title-input').value = sectionTitle;
  container.appendChild(sectionDiv);
  addStepRow(sectionDiv.querySelector('.step-rows-list'));
  updateStepNumbers();
  return sectionDiv;
}

function addStepRow(list) {
  if (!list) list = document.querySelector('#steps-list-form .step-rows-list:last-of-type');
  if (!list) return;
  var li = document.createElement('li');
  li.className = 'step-form-row';
  li.innerHTML = '<span class="step-num-badge">1</span>' +
    '<input type="text" class="step-text-input" placeholder="Decrivez cette etape..." />' +
    '<button type="button" class="btn-remove-item" onclick="this.parentElement.remove(); updateStepNumbers()"><i class="fas fa-times"></i></button>';
  list.appendChild(li);
  updateStepNumbers();
}

function updateStepNumbers() {
  document.querySelectorAll('#steps-list-form .step-num-badge').forEach(function(b, i) { b.textContent = i + 1; });
}

document.getElementById('btn-add-ingredient').addEventListener('click', function() { addIngredientSection(''); });
document.getElementById('btn-add-step').addEventListener('click', function() { addStepSection(''); });

document.getElementById('form-photo-picker').addEventListener('click', function() {
  document.getElementById('photo-input').click();
});
document.getElementById('photo-input').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(ev) {
    currentPhotoBase64 = ev.target.result;
    var preview = document.getElementById('photo-preview');
    var placeholder = document.getElementById('photo-placeholder');
    preview.src = currentPhotoBase64;
    preview.classList.remove('hidden');
    placeholder.classList.add('hidden');
  };
  reader.readAsDataURL(file);
});
document.getElementById('btn-save-recipe').addEventListener('click', saveRecipe);
function saveRecipe() {
  var name = document.getElementById('form-name').value.trim();
  if (!name) { showToast('Donne un nom a la recette !', 'error'); return; }
      var ingredients = [];
    document.querySelectorAll('#ingredients-list-form .form-section-block').forEach(function(section) {
      var titleEl = section.querySelector('.section-title-input');
      var sTitle = titleEl ? titleEl.value.trim() : '';
      var items = [];
      section.querySelectorAll('.ingredient-form-row').forEach(function(row) {
        var qty = row.querySelector('.ing-qty').value.trim();
        var unit = row.querySelector('.ing-unit').value.trim();
        var name = row.querySelector('.ing-name').value.trim();
        if (name) items.push({ qty: qty, unit: unit, name: name });
      });
      if (items.length > 0) ingredients.push({ title: sTitle, items: items });
    });
    var steps = [];
    document.querySelectorAll('#steps-list-form .form-section-block').forEach(function(section) {
      var titleEl = section.querySelector('.section-title-input');
      var sTitle = titleEl ? titleEl.value.trim() : '';
      var items = [];
      section.querySelectorAll('.step-text-input').forEach(function(input) {
        var text = input.value.trim();
        if (text) items.push({ text: text });
      });
      if (items.length > 0) steps.push({ title: sTitle, items: items });
    });
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
    return '<li class="courses-item ' + (item.checked ? 'checked' : '') + '" onclick="toggleCourse(' + i + ')">'
      + '<div class="courses-checkbox"></div>'
      + '<span class="courses-qty">' + (item.qty || '') + '</span>'
      + '<span>' + item.name + '</span>'
      + '<span class="courses-from">' + (item.from || '') + '</span></li>';
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


// ============================================================
// EXPORT / IMPORT JSON
// ============================================================
function exportRecipes() {
  var data = JSON.stringify({ recipes: recipes, courses: courses, exportDate: new Date().toISOString() }, null, 2);
  var blob = new Blob([data], { type: "application/json" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = "richard-kitchen-backup-" + new Date().toISOString().split("T")[0] + ".json";
  a.click();
  URL.revokeObjectURL(url);
  showToast("Sauvegarde exportée !", "success");
}

function importRecipes(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      if (!data.recipes || !Array.isArray(data.recipes)) throw new Error("Format invalide");
      var existing = recipes.length;
      var imported = data.recipes.filter(function(nr) {
        return !recipes.find(function(r) { return r.id === nr.id; });
      });
      recipes = recipes.concat(imported);
      saveRecipes();
      renderRecipes();
      updateStats();
      showToast(imported.length + " recette(s) importée(s) !", "success");
    } catch(err) {
      showToast("Fichier invalide", "error");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

// ============================================================
// SHARE RECIPE (Image + PDF)
// ============================================================
function shareRecipe(recipe) {
  recipe = recipe || currentRecipe;
  if (!recipe) return;
  var modal = document.getElementById("modal-share");
  if (modal) {
    buildSharePreview(recipe);
    modal.classList.remove("hidden");
  }
}

function buildSharePreview(recipe) {
  var preview = document.getElementById("share-preview-card");
  if (!preview) return;
  var catEmoji = getCatEmoji(recipe.cat);
  var catLabel = getCatLabel(recipe.cat);
  var ingHtml = "";
  var ingredients = recipe.ingredients || [];
  if (ingredients.length > 0 && ingredients[0].items) {
    ingredients.forEach(function(section) {
      if (section.title) ingHtml += "<div class=\"share-section-title\">" + section.title + "</div>";
      (section.items || []).forEach(function(ing) {
        if (ing.name) ingHtml += "<li>" + (ing.qty ? ing.qty + " " : "") + (ing.unit ? ing.unit + " " : "") + ing.name + "</li>";
      });
    });
  } else {
    ingredients.forEach(function(ing) {
      if (ing.name) ingHtml += "<li>" + (ing.qty ? ing.qty + " " : "") + (ing.unit ? ing.unit + " " : "") + ing.name + "</li>";
    });
  }
  var stepsHtml = "";
  var steps = recipe.steps || [];
  var stepNum = 0;
  if (steps.length > 0 && steps[0].items) {
    steps.forEach(function(section) {
      if (section.title) stepsHtml += "<div class=\"share-section-title\">" + section.title + "</div>";
      (section.items || []).forEach(function(s) {
        if (s) { stepNum++; stepsHtml += "<li><span class=\"step-num\">" + stepNum + "</span>" + s + "</li>"; }
      });
    });
  } else {
    steps.forEach(function(s, i) {
      if (s) stepsHtml += "<li><span class=\"step-num\">" + (i+1) + "</span>" + s + "</li>";
    });
  }
  var photoHtml = recipe.photo
    ? "<img src=\"" + recipe.photo + "\" class=\"share-card-photo\" alt=\"\" />"
    : "<div class=\"share-card-photo-placeholder\">" + catEmoji + "</div>";
  preview.innerHTML = "<div class=\"share-card\">"    + photoHtml    + "<div class=\"share-card-body\">"    + "<div class=\"share-card-header\"><span class=\"share-cat-badge\">" + catEmoji + " " + catLabel + "</span><h2>" + recipe.name + "</h2>"    + (recipe.desc ? "<p class=\"share-desc\">" + recipe.desc + "</p>" : "")    + "<div class=\"share-meta\">"    + "<span>🕒 " + formatTime(recipe.time) + "</span>"    + "<span>👥 " + (recipe.portions || 4) + " pers.</span>"    + "<span>📊 " + (recipe.diff || "Facile") + "</span>"    + "</div></div>"    + (ingHtml ? "<div class=\"share-section\"><h3>🥕 Ingrédients</h3><ul>" + ingHtml + "</ul></div>" : "")    + (stepsHtml ? "<div class=\"share-section\"><h3>📋 Préparation</h3><ol>" + stepsHtml + "</ol></div>" : "")    + "<div class=\"share-footer\">Richard's Kitchen 🍓</div>"    + "</div></div>";
}

function downloadShareImage() {
  var card = document.querySelector("#share-preview-card .share-card");
  if (!card) return;
  // Use html2canvas if available
  if (typeof html2canvas !== "undefined") {
    showToast("Génération en cours...", "");
    html2canvas(card, { scale: 2, useCORS: true, backgroundColor: "#FDF8F0" }).then(function(canvas) {
      var link = document.createElement("a");
      link.download = (currentRecipe ? currentRecipe.name.replace(/\s+/g, "-") : "recette") + ".png";
      link.href = canvas.toDataURL("image/png");
      link.click();
      showToast("Image téléchargée !", "success");
    });
  } else {
    showToast("Capture non disponible", "error");
  }
}

function downloadSharePDF() {
  var card = document.querySelector("#share-preview-card .share-card");
  if (!card) return;
  if (typeof html2canvas !== "undefined" && typeof jspdf !== "undefined") {
    showToast("Génération PDF...", "");
    html2canvas(card, { scale: 2, useCORS: true, backgroundColor: "#FDF8F0" }).then(function(canvas) {
      var imgData = canvas.toDataURL("image/png");
      var pdf = new jspdf.jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      var pW = pdf.internal.pageSize.getWidth();
      var pH = pdf.internal.pageSize.getHeight();
      var ratio = canvas.height / canvas.width;
      var imgH = pW * ratio;
      if (imgH > pH) { imgH = pH; }
      pdf.addImage(imgData, "PNG", 0, 0, pW, imgH);
      pdf.save((currentRecipe ? currentRecipe.name.replace(/\s+/g, "-") : "recette") + ".pdf");
      showToast("PDF téléchargé !", "success");
    });
  } else {
    showToast("PDF non disponible", "error");
  }
}

// ============================================================
// EVENT LISTENERS for new features
// ============================================================
document.addEventListener("DOMContentLoaded", function() {
  var btnExport = document.getElementById("btn-export-json");
  if (btnExport) btnExport.addEventListener("click", exportRecipes);
  var importInput = document.getElementById("import-json-input");
  if (importInput) importInput.addEventListener("change", importRecipes);
  var btnImport = document.getElementById("btn-import-json");
  if (btnImport) btnImport.addEventListener("click", function() { document.getElementById("import-json-input").click(); });
  var btnShareClose = document.getElementById("btn-share-close");
  if (btnShareClose) btnShareClose.addEventListener("click", function() { document.getElementById("modal-share").classList.add("hidden"); });
  var overlayShare = document.getElementById("overlay-share");
  if (overlayShare) overlayShare.addEventListener("click", function() { document.getElementById("modal-share").classList.add("hidden"); });
  var btnShareImg = document.getElementById("btn-share-image");
  if (btnShareImg) btnShareImg.addEventListener("click", downloadShareImage);
  var btnSharePdf = document.getElementById("btn-share-pdf");
  if (btnSharePdf) btnSharePdf.addEventListener("click", downloadSharePDF);
  var btnShareRecipe = document.getElementById("btn-share-recipe");
  if (btnShareRecipe) btnShareRecipe.addEventListener("click", function() { shareRecipe(currentRecipe); });
});


// ============================================================
// PORTIONS MEMORY - Save/restore portions per recipe
// ============================================================
function savePortionsMemory(recipeId, portions) {
  if (!recipeId) return;
  portionsMemory[recipeId] = portions;
  localStorage.setItem('carine_portions', JSON.stringify(portionsMemory));
}

// Override portions +/- with memory save
(function setupPortionsMemory() {
  var btnMinus = document.getElementById('portions-minus');
  var btnPlus = document.getElementById('portions-plus');
  var display = document.getElementById('portions-display');
  if (btnMinus) {
    btnMinus.addEventListener('click', function() {
      if (currentPortions > 1) {
        currentPortions--;
        display.textContent = currentPortions;
        if (currentRecipe) {
          savePortionsMemory(currentRecipe.id, currentPortions);
          renderIngredients(currentRecipe.ingredients || [], currentPortions, basePortions);
          renderSteps(currentRecipe.steps || []);
        }
      }
    });
  }
  if (btnPlus) {
    btnPlus.addEventListener('click', function() {
      currentPortions++;
      display.textContent = currentPortions;
      if (currentRecipe) {
        savePortionsMemory(currentRecipe.id, currentPortions);
        renderIngredients(currentRecipe.ingredients || [], currentPortions, basePortions);
        renderSteps(currentRecipe.steps || []);
      }
    });
  }
})();

// ============================================================
// CONVERSION D'UNITES FRANCAISES
// Popup au clic sur une quantite dans la fiche recette
// ============================================================
var conversionRules = [
  // Poids
  { units: ['g', 'gr', 'gramme', 'grammes'],
    convert: function(v) {
      var results = [];
      if (v >= 1000) results.push((v/1000).toFixed(2).replace(/\.?0+$/, '') + ' kg');
      else results.push(v + ' g');
      results.push((v/28.35).toFixed(1) + ' oz');
      if (v >= 500) results.push((v/453.6).toFixed(2) + ' lb');
      // Cuillères approximatives
      results.push('≈ ' + Math.round(v/15) + ' c. \u00e0 soupe');
      return results;
    }
  },
  // Volume liquide
  { units: ['ml', 'mL', 'millilitre', 'millilitres'],
    convert: function(v) {
      var results = [];
      if (v >= 1000) results.push((v/1000).toFixed(2).replace(/\.?0+$/, '') + ' L');
      else if (v >= 100) results.push((v/100).toFixed(1) + ' cl');
      results.push((v/100).toFixed(1) + ' cl');
      results.push((v/250).toFixed(2).replace(/\.?0+$/, '') + ' tasse(s)');
      results.push(Math.round(v/15) + ' c. \u00e0 soupe');
      return [...new Set(results)];
    }
  },
  { units: ['cl', 'cL', 'centilitre', 'centilitres'],
    convert: function(v) {
      var ml = v * 10;
      var results = [];
      results.push(ml + ' ml');
      if (v >= 10) results.push((v/10).toFixed(1).replace(/\.?0+$/, '') + ' L');
      results.push((v/25).toFixed(2).replace(/\.?0+$/, '') + ' tasse(s)');
      results.push(Math.round(ml/15) + ' c. \u00e0 soupe');
      return results;
    }
  },
  { units: ['L', 'litre', 'litres', 'l'],
    convert: function(v) {
      var results = [];
      results.push((v*100) + ' cl');
      results.push((v*1000) + ' ml');
      results.push(Math.round(v*4) + ' tasse(s)');
      return results;
    }
  },
  // Cuilleres
  { units: ['c. \u00e0 soupe', 'cs', 'c.s.', 'cuill\u00e8re \u00e0 soupe'],
    convert: function(v) {
      var results = [];
      results.push((v*15) + ' ml');
      results.push((v*1.5) + ' cl');
      results.push(v*3 + ' c. \u00e0 caf\u00e9');
      return results;
    }
  },
  { units: ['c. \u00e0 caf\u00e9', 'cc', 'c.c.', 'cuill\u00e8re \u00e0 caf\u00e9'],
    convert: function(v) {
      var results = [];
      results.push((v*5) + ' ml');
      results.push(Math.round(v/3*10)/10 + ' c. \u00e0 soupe');
      return results;
    }
  },
  // kg
  { units: ['kg', 'kilogramme', 'kilogrammes'],
    convert: function(v) {
      var results = [];
      results.push((v*1000) + ' g');
      results.push((v*35.27).toFixed(1) + ' oz');
      results.push((v*2.205).toFixed(2) + ' lb');
      return results;
    }
  }
];

function detectAndConvert(qtyStr, unitStr) {
  var val = parseFloat(qtyStr);
  if (isNaN(val)) return null;
  var unit = (unitStr || '').trim().toLowerCase();
  for (var i = 0; i < conversionRules.length; i++) {
    var rule = conversionRules[i];
    for (var j = 0; j < rule.units.length; j++) {
      if (unit === rule.units[j].toLowerCase()) {
        return { value: val, unit: unitStr, conversions: rule.convert(val) };
      }
    }
  }
  return null;
}

function showConversionPopup(event, qtyStr, unitStr) {
  event.stopPropagation();
  var result = detectAndConvert(qtyStr, unitStr);
  if (!result) return;
  // Remove existing popup
  var existing = document.getElementById('conversion-popup');
  if (existing) existing.remove();
  var popup = document.createElement('div');
  popup.id = 'conversion-popup';
  popup.className = 'conversion-popup';
  var html = '<div class="conv-header"><span>📏 ' + result.value + ' ' + result.unit + ' =</span><button type="button" class="conv-close" onclick="document.getElementById(\'conversion-popup\').remove()">×</button></div>';
  html += '<ul class="conv-list">';
  for (var i = 0; i < result.conversions.length; i++) {
    html += '<li>' + result.conversions[i] + '</li>';
  }
  html += '</ul>';
  popup.innerHTML = html;
  // Position near the click
  document.body.appendChild(popup);
  var rect = event.target.getBoundingClientRect();
  var top = rect.bottom + window.scrollY + 8;
  var left = Math.min(rect.left, window.innerWidth - 220);
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
  // Auto close after 4 seconds
  setTimeout(function() { var p = document.getElementById('conversion-popup'); if (p) p.remove(); }, 4000);
}

// Close popup when clicking elsewhere
document.addEventListener('click', function(e) {
  if (!e.target.closest('#conversion-popup') && !e.target.classList.contains('conv-qty')) {
    var p = document.getElementById('conversion-popup');
    if (p) p.remove();
  }
});
