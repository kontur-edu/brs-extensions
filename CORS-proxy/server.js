const host = process.env.HOST || '0.0.0.0';
const port = process.env.PORT || 81;

const cors_proxy = require('./lib/cors-anywhere');
cors_proxy.createServer({
    redirectSameOrigin: true,
}).listen(port, host, function () {
    console.log('Running CORS Anywhere on ' + host + ':' + port);
});
