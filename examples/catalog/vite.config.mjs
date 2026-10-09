export default {
  plugins: [
    {
      name: 'catalog-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url !== '/api/catalog') return next();
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify([
              {
                id: 'cup',
                name: 'Morning cup',
                category: 'Home',
                material: 'Stoneware',
                shape: 'cup',
              },
              {
                id: 'book',
                name: 'Everyday notebook',
                category: 'Desk',
                material: 'Recycled paper',
                shape: 'notebook',
              },
              {
                id: 'vase',
                name: 'Sunday vase',
                category: 'Home',
                material: 'Clay',
                shape: 'vase',
              },
            ]),
          );
        });
      },
    },
  ],
};
