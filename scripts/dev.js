import { createServer } from 'vite'
import { Tunnel } from 'cloudflared'

const PORT = 5679

async function main() {
  const server = await createServer({
    server: { port: PORT },
  })
  await server.listen()

  console.log(`\n[minchki] Vite prêt sur http://localhost:${PORT}`)
  console.log('[minchki] Ouverture du tunnel Cloudflare (quick tunnel)...\n')

  const tunnel = Tunnel.quick(`http://localhost:${PORT}`)

  tunnel.once('url', (url) => {
    const line = '='.repeat(64)
    console.log(line)
    console.log(`[minchki] URL publique : ${url}`)
    console.log('\nÀ coller dans Webflow (Page Settings → Custom Code → Before </body>) :\n')
    console.log(`<script type="module" src="${url}/@vite/client"></script>`)
    console.log(`<script type="module" src="${url}/src/main.js"></script>`)
    console.log('\n⚠️  Cette URL change à chaque redémarrage de ce script (quick tunnel).')
    console.log(line + '\n')
  })

  tunnel.on('error', (err) => {
    console.error('[minchki] Erreur tunnel Cloudflare :', err)
  })

  let shuttingDown = false
  const shutdown = async () => {
    if (shuttingDown) return
    shuttingDown = true
    console.log('\n[minchki] Arrêt du serveur et du tunnel...')
    tunnel.stop()
    await server.close()
    process.exit(0)
  }

  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err) => {
  console.error('[minchki] Échec du démarrage :', err)
  process.exit(1)
})
