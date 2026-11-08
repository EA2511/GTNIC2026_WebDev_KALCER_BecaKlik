// ==============================================================================
// server.js - Custom Entrypoint Node.js untuk cPanel / Cloud Hosting
// Platform: BecaKlik Majalengka (Next.js 15 + Prisma)
// ==============================================================================

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Inisialisasi aplikasi Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    createServer(async (req, res) => {
      try {
        // Parse URL permintaan masuk
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
      } catch (err) {
        console.error('Terjadi kesalahan saat memproses request:', req.url, err);
        res.statusCode = 500;
        res.end('500 - Internal Server Error');
      }
    })
      .once('error', (err) => {
        console.error('Server gagal start pada port:', port, err);
        process.exit(1);
      })
      .listen(port, () => {
        console.log(`> BecaKlik Production Server siap di http://${hostname}:${port}`);
        console.log(`> Mode: ${dev ? 'Development' : 'Production'}`);
      });
  })
  .catch((err) => {
    console.error('Gagal mempersiapkan aplikasi Next.js:', err);
    process.exit(1);
  });
