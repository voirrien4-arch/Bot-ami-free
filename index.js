require('dotenv').config();
const { startBot } = require('./src/bot');

console.log(`
╔══════════════════════════════════════╗
║   🎩  Darkboy WhatsApp Bot         ║
║   👨‍💻  by Odkbxss                     ║
║   🔐  Hacking Ethique Assistant      ║
╚══════════════════════════════════════╝
`);

startBot().catch(function(err) {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
