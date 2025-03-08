const { createProxyMiddleware } = require('http-proxy-middleware');
require('dotenv').config();

const API_URL = process.env.API_URL || 'https://memegents-102364148288.us-central1.run.app/';

module.exports = function(app) {
    app.use(
        '/api',
        createProxyMiddleware({
            target: API_URL,
            changeOrigin: true,
        })
    );
};
