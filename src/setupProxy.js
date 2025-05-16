const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:8300',
      changeOrigin: true,
      pathRewrite: { '^/api': '/sport' },
      onProxyReq: (proxyReq, req, res) => {
      },
      onError: (err, req, res) => {
      }
    })
  );
};
