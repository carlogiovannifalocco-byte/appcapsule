import './style.css';
const saved = new Set();
let products = [],
  savedOnly = false;
function render() {
  const category = document.querySelector('#filter').value;
  const visible = products.filter(
    (p) =>
      (category === 'All objects' || p.category === category) && (!savedOnly || saved.has(p.id)),
  );
  const items = document.querySelector('#items');
  items.replaceChildren();
  for (const product of visible) {
    const article = document.createElement('article');
    const art = document.createElement('div');
    art.className = `art ${product.shape}`;
    art.setAttribute('aria-hidden', 'true');
    const object = document.createElement('i');
    art.append(object);
    const caption = document.createElement('div');
    caption.className = 'caption';
    const heading = document.createElement('h2');
    heading.textContent = product.name;
    const label = document.createElement('p');
    label.textContent = `${product.category} · ${product.material}`;
    const button = document.createElement('button');
    button.textContent = saved.has(product.id) ? 'Saved ✓' : 'Save +';
    button.setAttribute('aria-label', `Save ${product.name}`);
    button.setAttribute('aria-pressed', String(saved.has(product.id)));
    button.onclick = () => {
      if (saved.has(product.id)) saved.delete(product.id);
      else saved.add(product.id);
      render();
    };
    caption.append(heading, label, button);
    article.append(art, caption);
    items.append(article);
  }
  document.querySelector('#count').textContent = `${visible.length} objects`;
  document.querySelector('#view-saved').textContent = savedOnly
    ? 'Show all'
    : `Saved (${saved.size})`;
  document.querySelector('#empty').hidden = visible.length !== 0;
}
document.querySelector('#filter').onchange = render;
document.querySelector('#view-saved').onclick = () => {
  savedOnly = !savedOnly;
  render();
};
const request = new XMLHttpRequest();
request.open('GET', '/api/catalog');
request.responseType = 'json';
request.onload = () => {
  products = request.response;
  render();
};
request.onerror = () => {
  document.querySelector('#count').textContent = 'Could not load the collection.';
};
request.send();
