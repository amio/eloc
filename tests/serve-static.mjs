import { createServer } from 'node:http'
import sirv from 'sirv'

const serve = sirv(process.cwd(), { dev: true })
createServer((req, res) => {
  if (req.url === '/' || /^\/(?:new\/?|local\/[^/]+\/?)$/.test(new URL(req.url, 'http://localhost').pathname)) req.url = '/public/index.html'
  serve(req, res, () => {
    res.writeHead(404).end('Not Found')
  })
}).listen(Number(process.argv[2]), '127.0.0.1')
