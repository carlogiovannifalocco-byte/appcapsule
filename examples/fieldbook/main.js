import './style.css';
const container = document.querySelector('#app');
function element(tag, text, className) {
  const node = document.createElement(tag);
  node.textContent = text;
  if (className) node.className = className;
  return node;
}
async function render() {
  const id = location.hash.replace('#/', '');
  container.replaceChildren();
  if (!id) {
    const data = await (await fetch('/api/notes')).json();
    container.append(
      element('p', 'COLLECTED THOUGHTS · VOL. 01', 'eyebrow'),
      element('h1', 'Room for a\nnew perspective.'),
      element('p', 'A few notes on paying attention to the things that matter.', 'intro'),
    );
    const list = element('div', '', 'notes');
    for (const [index, note] of data.entries()) {
      const link = element('a', '', 'note');
      link.href = `#/${note.id}`;
      link.append(
        element('span', `0${index + 1}`, 'number'),
        element('h2', note.title),
        element('span', `${note.minutes} min read ↗`, 'meta'),
      );
      list.append(link);
    }
    container.append(list);
  } else {
    const response = await fetch(`/api/notes/${encodeURIComponent(id)}`);
    if (!response.ok) {
      container.append(element('h1', 'Note not found'));
      return;
    }
    const note = await response.json();
    const back = element('a', '← Back to the reading room', 'back');
    back.href = '#/';
    const article = document.createElement('article');
    article.append(element('p', 'A NOTE FROM FIELDBOOK', 'eyebrow'), element('h1', note.title));
    for (const paragraph of note.paragraphs) article.append(element('p', paragraph));
    container.append(back, article);
  }
}
window.addEventListener('hashchange', () => {
  render().catch(showError);
});
function showError() {
  container.replaceChildren(element('h1', 'This note is outside the recorded demo.'));
}
render().catch(showError);
