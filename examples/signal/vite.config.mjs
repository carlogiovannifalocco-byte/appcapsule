const projects = [
  {
    id: 'atlas',
    name: 'Atlas website',
    category: 'Design',
    description: 'A quieter, clearer home for everything we make.',
    color: 'mint',
    icon: '◈',
    progress: 72,
    due: 'Oct 24',
    members: ['AM', 'JL', 'SK'],
    tasks: ['Refine the type scale', 'Build the case-study page', 'Review mobile navigation'],
    activity: 'Avery updated the homepage exploration',
  },
  {
    id: 'orbit',
    name: 'Orbit mobile',
    category: 'Product',
    description: 'Small moments. A more thoughtful mobile experience.',
    color: 'purple',
    icon: '◎',
    progress: 46,
    due: 'Nov 02',
    members: ['SK', 'RN'],
    tasks: ['Map the onboarding flow', 'Test the prototype', 'Document interaction patterns'],
    activity: 'Sam shared a new interaction prototype',
  },
  {
    id: 'fieldnotes',
    name: 'Fieldnotes',
    category: 'Research',
    description: 'Turning good questions into the next right thing.',
    color: 'orange',
    icon: '⌁',
    progress: 89,
    due: 'Oct 18',
    members: ['JL', 'AM'],
    tasks: ['Synthesize interview notes', 'Share the opportunity map', 'Close the feedback loop'],
    activity: 'Jamie added three research insights',
  },
  {
    id: 'studio',
    name: 'Studio system',
    category: 'Design',
    description: 'The ingredients for a consistent, expressive brand.',
    color: 'blue',
    icon: '▦',
    progress: 34,
    due: 'Nov 12',
    members: ['RN', 'AM', 'SK'],
    tasks: ['Audit the component library', 'Update color tokens', 'Publish the icon set'],
    activity: 'Robin refreshed the component inventory',
  },
];

export default {
  plugins: [
    {
      name: 'signal-demo-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (!req.url?.startsWith('/api/')) return next();
          const url = new URL(req.url, 'http://localhost');
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          if (url.pathname === '/api/projects')
            return res.end(
              JSON.stringify(projects.map(({ tasks, activity, ...project }) => project)),
            );
          if (url.pathname.startsWith('/api/projects/')) {
            const project = projects.find((p) => p.id === url.pathname.split('/').at(-1));
            if (project) return res.end(JSON.stringify(project));
          }
          res.statusCode = 404;
          res.end(JSON.stringify({ message: 'Not found' }));
        });
      },
    },
  ],
};
