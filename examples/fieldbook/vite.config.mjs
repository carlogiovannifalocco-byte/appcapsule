const notes = [
  {
    id: 'attention',
    title: 'The art of paying attention',
    minutes: 3,
    paragraphs: [
      'A good idea often begins with something small: a pause, a question, a detail everyone else walked past.',
      'Attention is a practice. We make room for it by closing a tab, taking a longer walk, and letting a thought finish before starting another.',
      'Try this today. Pick one ordinary object and spend a minute noticing what you have never noticed about it. There is usually more there than you think.',
    ],
  },
  {
    id: 'less',
    title: 'A little less, done well',
    minutes: 2,
    paragraphs: [
      'There is a particular satisfaction in a small thing made with care. The sturdy handle. The sentence that says exactly what it means.',
      'Choose one thing that deserves your attention. Give it a clear beginning, an honest middle, and a considered ending.',
      'Progress can look like removing something that was getting in the way.',
    ],
  },
];
export default {
  plugins: [
    {
      name: 'fieldbook-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/api/notes')) return next();
          res.setHeader('Content-Type', 'application/json');
          if (req.url === '/api/notes')
            return res.end(JSON.stringify(notes.map(({ paragraphs, ...note }) => note)));
          const note = notes.find((n) => req.url === `/api/notes/${n.id}`);
          res.statusCode = note ? 200 : 404;
          res.end(JSON.stringify(note ?? { error: 'Not found' }));
        });
      },
    },
  ],
};
