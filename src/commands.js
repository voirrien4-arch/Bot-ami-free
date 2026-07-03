var config = require('./config');
var memberManager = require('./memberManager');
var ai = require('./ai');
var antiSpam = require('./antiSpam');
var groupSettings = require('./groupSettings');
var os = require('os');

var botActive = true;
var startTime = Date.now();

function isBotActive() { return botActive; }
function setBotActive(state) { botActive = state; }

// ─── Helpers ───────────────────────────────────────────────────
function formatUptime() {
  var ms = Date.now() - startTime;
  var s = Math.floor((ms / 1000) % 60);
  var m = Math.floor((ms / 60000) % 60);
  var h = Math.floor((ms / 3600000) % 24);
  var d = Math.floor(ms / 86400000);
  if (d > 0) return d + 'j ' + h + 'h ' + m + 'm';
  if (h > 0) return h + 'h ' + m + 'm ' + s + 's';
  if (m > 0) return m + 'm ' + s + 's';
  return s + 's';
}

function getRam() {
  var used = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
  var total = Math.round(os.totalmem() / 1024 / 1024);
  return used + 'MB/' + total + 'MB';
}

function getDate() {
  var now = new Date();
  var days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  return now.toLocaleDateString('fr-FR') + ' • ' + days[now.getDay()];
}

function channelFooter() {
  return '\n\n> 🚀 *Darkboy* | Odkbxss\n> 📡 ' + config.channelLink;
}

// ─── Commandes ADMIN ──────────────────────────────────────────
async function handleAdminCommand(sock, msg, command, args, senderId, groupId) {
  switch (command) {
    case '!on':
      botActive = true;
      await sock.sendMessage(groupId, { text: '✅ *Darkboy activé !* 🚀' + channelFooter() });
      break;

    case '!off':
      botActive = false;
      await sock.sendMessage(groupId, { text: '🔴 *ChapeauNoir désactivé.*' + channelFooter() });
      break;

    case '!ban':
      if (msg.message && msg.message.extendedTextMessage &&
          msg.message.extendedTextMessage.contextInfo &&
          msg.message.extendedTextMessage.contextInfo.participant) {
        var target = msg.message.extendedTextMessage.contextInfo.participant;
        var reason = args.join(' ') || 'Violation des règles';
        await memberManager.banMember(target, reason);
        await sock.groupParticipantsUpdate(groupId, [target], 'remove').catch(function() {});
        await sock.sendMessage(groupId, { text: '🚫 *Membre banni*\nRaison: ' + reason + channelFooter() });
      }
      break;

    case '!unban':
      if (args[0]) {
        await memberManager.unbanMember(args[0] + '@s.whatsapp.net');
        antiSpam.unbanUser(args[0] + '@s.whatsapp.net');
        await sock.sendMessage(groupId, { text: '✅ ' + args[0] + ' débanni.' + channelFooter() });
      }
      break;

    case '!admin':
      if (msg.message && msg.message.extendedTextMessage &&
          msg.message.extendedTextMessage.contextInfo &&
          msg.message.extendedTextMessage.contextInfo.participant) {
        var t = msg.message.extendedTextMessage.contextInfo.participant;
        await memberManager.setAdmin(t, true);
        await sock.groupParticipantsUpdate(groupId, [t], 'promote').catch(function() {});
        await sock.sendMessage(groupId, { text: '⭐ Nouveau admin promu !' + channelFooter() });
      }
      break;

    case '!deadmin':
      if (msg.message && msg.message.extendedTextMessage &&
          msg.message.extendedTextMessage.contextInfo &&
          msg.message.extendedTextMessage.contextInfo.participant) {
        var t2 = msg.message.extendedTextMessage.contextInfo.participant;
        await memberManager.setAdmin(t2, false);
        await sock.groupParticipantsUpdate(groupId, [t2], 'demote').catch(function() {});
        await sock.sendMessage(groupId, { text: '🔽 Admin rétrogradé.' + channelFooter() });
      }
      break;

    case '!kick':
      var kickTarget = null;
      if (msg.message && msg.message.extendedTextMessage) {
        var ctx = msg.message.extendedTextMessage.contextInfo;
        if (ctx && ctx.participant) kickTarget = ctx.participant;
        if (ctx && ctx.mentionedJid && ctx.mentionedJid.length) kickTarget = ctx.mentionedJid[0];
      }
      if (kickTarget) {
        await sock.groupParticipantsUpdate(groupId, [kickTarget], 'remove').catch(function() {});
        await sock.sendMessage(groupId, {
          text: '👢 @' + kickTarget.split('@')[0] + ' a été expulsé.' + channelFooter(),
          mentions: [kickTarget]
        });
      } else {
        await sock.sendMessage(groupId, { text: '❌ Mentionne ou réponds au membre à expulser.' });
      }
      break;

    case '!promote':
      var promTarget = null;
      if (msg.message && msg.message.extendedTextMessage) {
        var pctx = msg.message.extendedTextMessage.contextInfo;
        if (pctx && pctx.participant) promTarget = pctx.participant;
        if (pctx && pctx.mentionedJid && pctx.mentionedJid.length) promTarget = pctx.mentionedJid[0];
      }
      if (promTarget) {
        await sock.groupParticipantsUpdate(groupId, [promTarget], 'promote').catch(function() {});
        await sock.sendMessage(groupId, {
          text: '⬆️ @' + promTarget.split('@')[0] + ' promu administrateur.' + channelFooter(),
          mentions: [promTarget]
        });
      } else {
        await sock.sendMessage(groupId, { text: '❌ Mentionne ou réponds au membre à promouvoir.' });
      }
      break;

    case '!demote':
      var demTarget = null;
      if (msg.message && msg.message.extendedTextMessage) {
        var dctx = msg.message.extendedTextMessage.contextInfo;
        if (dctx && dctx.participant) demTarget = dctx.participant;
        if (dctx && dctx.mentionedJid && dctx.mentionedJid.length) demTarget = dctx.mentionedJid[0];
      }
      if (demTarget) {
        await sock.groupParticipantsUpdate(groupId, [demTarget], 'demote').catch(function() {});
        await sock.sendMessage(groupId, {
          text: '⬇️ @' + demTarget.split('@')[0] + ' rétrogradé.' + channelFooter(),
          mentions: [demTarget]
        });
      } else {
        await sock.sendMessage(groupId, { text: '❌ Mentionne ou réponds au membre à rétrograder.' });
      }
      break;

    case '!mute':
      await sock.groupSettingUpdate(groupId, 'announcement').catch(function() {});
      await sock.sendMessage(groupId, { text: '🔇 *Groupe muté.* Seuls les admins peuvent écrire.' + channelFooter() });
      break;

    case '!unmute':
      await sock.groupSettingUpdate(groupId, 'not_announcement').catch(function() {});
      await sock.sendMessage(groupId, { text: '🔊 *Groupe démuté.* Tous les membres peuvent écrire.' + channelFooter() });
      break;

    case '!tagall':
    case '!hidetag': {
      var tagText = args.join(' ') || '📢 *Message à tous les membres* 🚀';
      var metadata = await sock.groupMetadata(groupId).catch(function() { return null; });
      if (!metadata) { await sock.sendMessage(groupId, { text: '❌ Erreur groupe.' }); break; }
      var allIds = metadata.participants.map(function(p) { return p.id; });
      var displayText = command === '!tagall' ? tagText : ' ';
      await sock.sendMessage(groupId, { text: displayText, mentions: allIds });
      break;
    }

    case '!annonce':
      var annonce = args.join(' ');
      if (annonce) {
        await sock.sendMessage(groupId, {
          text: '📢 *ANNONCE OFFICIELLE*\n\n' + annonce + '\n\n🚀 *— Odkbxss  | CDarkboy*' + channelFooter(),
        });
      }
      break;

    case '!setlink':
      if (args[0]) {
        config.groupLink = args[0];
        await sock.sendMessage(groupId, { text: '✅ Lien du groupe mis à jour !' + channelFooter() });
      }
      break;

    case '!welcome':
      var wSub = args[0] ? args[0].toLowerCase() : '';
      if (wSub === 'on') {
        groupSettings.set(groupId, 'welcome', true);
        await sock.sendMessage(groupId, { text: '✅ *Messages de bienvenue activés* 👋' + channelFooter() });
      } else if (wSub === 'off') {
        groupSettings.set(groupId, 'welcome', false);
        await sock.sendMessage(groupId, { text: '❌ *Messages de bienvenue désactivés.*' + channelFooter() });
      } else {
        var wStatus = groupSettings.get(groupId, 'welcome', false) ? '✅ Activé' : '❌ Désactivé';
        await sock.sendMessage(groupId, {
          text: '╭━━━ *WELCOME* ━━━\n┃\n┃ 📌 *Statut:* ' + wStatus + '\n┃\n┃ 📖 Commandes:\n┃ !welcome on  → Activer\n┃ !welcome off → Désactiver\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter()
        });
      }
      break;

    case '!goodbye':
      var gSub = args[0] ? args[0].toLowerCase() : '';
      if (gSub === 'on') {
        groupSettings.set(groupId, 'goodbye', true);
        await sock.sendMessage(groupId, { text: '✅ *Messages d\'au revoir activés* 👋' + channelFooter() });
      } else if (gSub === 'off') {
        groupSettings.set(groupId, 'goodbye', false);
        await sock.sendMessage(groupId, { text: '❌ *Messages d\'au revoir désactivés.*' + channelFooter() });
      } else {
        var gStatus = groupSettings.get(groupId, 'goodbye', false) ? '✅ Activé' : '❌ Désactivé';
        await sock.sendMessage(groupId, {
          text: '╭━━━ *GOODBYE* ━━━\n┃\n┃ 📌 *Statut:* ' + gStatus + '\n┃\n┃ 📖 Commandes:\n┃ !goodbye on  → Activer\n┃ !goodbye off → Désactiver\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter()
        });
      }
      break;

    case '!antilink':
      var alSub = args[0] ? args[0].toLowerCase() : '';
      if (alSub === 'on') {
        groupSettings.set(groupId, 'antilink', true);
        await sock.sendMessage(groupId, { text: '🔗 *Anti-liens activé.* Les liens seront supprimés.' + channelFooter() });
      } else if (alSub === 'off') {
        groupSettings.set(groupId, 'antilink', false);
        await sock.sendMessage(groupId, { text: '✅ *Anti-liens désactivé.*' + channelFooter() });
      } else {
        var alStatus = groupSettings.get(groupId, 'antilink', false) ? '✅ Activé' : '❌ Désactivé';
        await sock.sendMessage(groupId, {
          text: '╭━━━ *ANTILINK* ━━━\n┃\n┃ 📌 *Statut:* ' + alStatus + '\n┃\n┃ 📖 Commandes:\n┃ !antilink on  → Activer\n┃ !antilink off → Désactiver\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter()
        });
      }
      break;

    case '!antispam':
      var asSub = args[0] ? args[0].toLowerCase() : '';
      if (asSub === 'on') {
        groupSettings.set(groupId, 'antispam', true);
        await sock.sendMessage(groupId, { text: '🛡️ *Anti-spam activé.*' + channelFooter() });
      } else if (asSub === 'off') {
        groupSettings.set(groupId, 'antispam', false);
        await sock.sendMessage(groupId, { text: '✅ *Anti-spam désactivé.*' + channelFooter() });
      } else {
        var asStatus = groupSettings.get(groupId, 'antispam', true) ? '✅ Activé' : '❌ Désactivé';
        await sock.sendMessage(groupId, {
          text: '╭━━━ *ANTISPAM* ━━━\n┃\n┃ 📌 *Statut:* ' + asStatus + '\n┃\n┃ 📖 Commandes:\n┃ !antispam on  → Activer\n┃ !antispam off → Désactiver\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter()
        });
      }
      break;

    case '!annoncetous':
      var msg2 = args.join(' ');
      if (msg2) {
        var allMembers = await memberManager.getAllMembers();
        var ids = Object.keys(allMembers);
        for (var i = 0; i < ids.length; i++) {
          await sock.sendMessage(ids[i], {
            text: '📢 *Message de Mcamara*\n\n' + msg2 + '\n\n🚀 Darkboy',
          }).catch(function() {});
        }
        await sock.sendMessage(groupId, { text: '✅ Message envoyé à tous.' + channelFooter() });
      }
      break;

    case '!stats':
      var members = await memberManager.getAllMembers();
      var total = Object.keys(members).length;
      var admins = Object.values(members).filter(function(m) { return m.isAdmin; }).length;
      await sock.sendMessage(groupId, {
        text: '╭━━━ *STATISTIQUES* ━━━\n┃\n┃ 👥 *Membres:* ' + total + '\n┃ ⭐ *Admins:* ' + admins + '\n┃ 🤖 *Bot:* ' + (botActive ? '✅ Actif' : '🔴 Inactif') + '\n┃ ⏱️ *Uptime:* ' + formatUptime() + '\n┃ 💾 *RAM:* ' + getRam() + '\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter(),
      });
      break;

    case '!reset':
      if (args[0]) {
        ai.resetConversation(args[0] + '@s.whatsapp.net');
        await sock.sendMessage(groupId, { text: '🔄 Historique réinitialisé pour ' + args[0] + channelFooter() });
      } else {
        ai.resetConversation(senderId);
        await sock.sendMessage(groupId, { text: '🔄 Votre historique réinitialisé.' + channelFooter() });
      }
      break;


    // ── Pair ──
    case '!pair': {
      var pairNum = args[0] ? args[0].replace(/[^0-9]/g, '') : '';
      if (!pairNum || pairNum.length < 8 || pairNum.length > 15) {
        await sock.sendMessage(groupId, {
          text: '❌ *Utilisation:* !pair [numéro]\n\n📱 Format international sans + ni espaces\n*Exemple:* !pair 22662408620' + channelFooter()
        });
        break;
      }
      // Accès au système de sessions du bot principal
      var botModule = require('./bot');
      var existingSessions = botModule.getSessions();
      var alreadyExists = existingSessions.filter(function(s) { return s.phone === pairNum; })[0];
      if (alreadyExists) {
        var existStatus = alreadyExists.isConnected ? '✅ Déjà connecté' : '⏳ En cours de connexion';
        await sock.sendMessage(groupId, {
          text: '⚠️ Le numéro *+' + pairNum + '* a déjà une session.\n📊 Statut: ' + existStatus + channelFooter()
        });
        break;
      }
      var newSession = {
        id: botModule.getNextId(),
        phone: pairNum,
        pairingCode: null,
        isConnected: false,
        sock: null,
        status: 'starting',
        retries: 0,
      };
      botModule.pushSession(newSession);
      await sock.sendMessage(groupId, {
        text: '⏳ *Connexion de +' + pairNum + ' en cours...*\n\nGénération du code d'appairage...' + channelFooter()
      });
      // Démarrer la session et attendre le code
      botModule.startSession(newSession).catch(function(e) {
        newSession.status = 'error';
      });
      // Attendre que le code soit généré (max 15s)
      var waited = 0;
      var checkCode = setInterval(async function() {
        waited += 1000;
        if (newSession.pairingCode) {
          clearInterval(checkCode);
          await sock.sendMessage(groupId, {
            text: '╭━━━ *CODE D'APPAIRAGE* ━━━\n┃\n' +
              '┃ 🔑 *Code:* ' + newSession.pairingCode + '\n' +
              '┃ 📱 *Numéro:* +' + pairNum + '\n┃\n' +
              '┃ 📌 *Instructions:*\n┃\n' +
              '┃ 1️⃣ Ouvre WhatsApp sur ton téléphone\n' +
              '┃ 2️⃣ ⚙️ Paramètres\n' +
              '┃ 3️⃣ Appareils connectés\n' +
              '┃ 4️⃣ Connecter un appareil\n' +
              '┃ 5️⃣ Entre le code ci-dessus\n┃\n' +
              '┃ ⏳ *Code valable ~60 secondes*\n┃\n' +
              '╰━━━━━━━━━━━━━━━' + channelFooter(),
            contextInfo: {
              externalAdReply: {
                title: '🎩 ChapeauNoir — Connexion',
                body: 'by Odkbxss | Session ' + newSession.id,
                mediaType: 1,
                renderLargerThumbnail: false,
                sourceUrl: config.channelLink,
              }
            }
          });
        } else if (newSession.isConnected) {
          clearInterval(checkCode);
          await sock.sendMessage(groupId, {
            text: '✅ *+' + pairNum + ' est connecté !*\n🎩 Session active — le bot répond sur ce numéro.' + channelFooter()
          });
        } else if (waited >= 15000 || newSession.status === 'error') {
          clearInterval(checkCode);
          await sock.sendMessage(groupId, {
            text: '❌ Impossible de générer un code pour *+' + pairNum + '*\n\nVérifie le numéro et réessaie.' + channelFooter()
          });
        }
      }, 1000);
      break;
    }

    default:
      return false;
  }
  return true;
}

// ─── Commandes MEMBRES ────────────────────────────────────────
async function handleMemberCommand(sock, msg, command, args, senderId, groupId) {
  var member = await memberManager.getMember(senderId);
  var memberName = member ? member.name : (msg.pushName || 'Membre');

  switch (command) {

    // ── Aide / Menu ──
    case '!menu':
    case '!aide':
    case '!help': {
      var uptime = formatUptime();
      var ram = getRam();
      var date = getDate();
      var menuText =
'╭━━━━━━━━━━━━━━━━━━━╮\n' +
'┃    🚀 *Darkboy*     ┃\n' +
'╰━━━━━━━━━━━━━━━━━━━╯\n\n' +
'┌─────────────────────\n' +
'│ 👤 *Membre:* ' + memberName + '\n' +
'│ ⏱️ *Uptime:* ' + uptime + '\n' +
'│ 💾 *RAM:* ' + ram + '\n' +
'│ 📅 *Date:* ' + date + '\n' +
'│ 🔖 *Version:* ' + config.botVersion + '\n' +
'└─────────────────────\n\n' +
'╭━━ 🌐 *GÉNÉRAL* ━━\n' +
'┃ !menu — Ce menu\n' +
'┃ !alive — Statut du bot\n' +
'┃ !ping — Latence\n' +
'┃ !uptime — Temps actif\n' +
'┃ !lien — Lien du groupe\n' +
'┃ !canal — Chaîne WhatsApp\n' +
'┃ !pair [num] — Connecter un numéro\n' +
'┃ !regles — Règles\n' +
'┃ !apropos — À propos\n' +
'╰━━━━━━━━━━━━━━━━━━━\n\n' +
'╭━━ 👤 *PROFIL* ━━\n' +
'┃ !profil — Ton profil\n' +
'┃ !reset — Reset historique IA\n' +
'╰━━━━━━━━━━━━━━━━━━━\n\n' +
'╭━━ 🤖 *IA HACKING* ━━\n' +
'┃ !topics — Sujets IA\n' +
'┃ 💬 Pose ta question directement !\n' +
'╰━━━━━━━━━━━━━━━━━━━\n\n' +
'╭━━ 👥 *GROUPE* ━━\n' +
'┃ !groupinfo — Infos du groupe\n' +
'┃ !vv — Voir msg view once\n' +
'╰━━━━━━━━━━━━━━━━━━━\n\n' +
'╭━━ 👑 *ADMIN* ━━\n' +
'┃ !on / !off — Activer/désactiver bot\n' +
'┃ !ban / !unban — Bannir membre\n' +
'┃ !kick — Expulser membre\n' +
'┃ !promote / !demote — Admin\n' +
'┃ !mute / !unmute — Silence groupe\n' +
'┃ !tagall — Taguer tout le monde\n' +
'┃ !hidetag — Tag silencieux\n' +
'┃ !welcome on/off — Bienvenue\n' +
'┃ !goodbye on/off — Au revoir\n' +
'┃ !antilink on/off — Anti-liens\n' +
'┃ !antispam on/off — Anti-spam\n' +
'┃ !annonce [msg] — Annonce\n' +
'┃ !stats — Statistiques\n' +
'╰━━━━━━━━━━━━━━━━━━━\n\n' +
'> 🎩 *Darkboy v' + config.botVersion + '* | by *Odkbxss*\n' +
'> 📡 ' + config.channelLink;
      await sock.sendMessage(groupId, {
        text: menuText,
        contextInfo: {
          externalAdReply: {
            title: '🚀 Darkboy — Bot WhatsApp',
            body: 'by Odkbxss | Hacking Éthique',
            mediaType: 1,
            renderLargerThumbnail: false,
            sourceUrl: config.channelLink,
          }
        }
      });
      break;
    }

    // ── Alive ──
    case '!alive': {
      var pingStart = Date.now();
      var lat = Date.now() - pingStart;
      var aliveText =
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `DARK BOY REPORT`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩\n' +
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `𝗕𝗢𝗧 : Darkboy`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩\n' +
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `𝗩𝗘𝗥𝗦𝗜𝗢𝗡 : ' + config.botVersion + '`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩\n' +
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `𝗦𝗧𝗔𝗧𝗨𝗧 : 🟢 ONLINE`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩\n' +
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `𝗨𝗣𝗧𝗜𝗠𝗘 : ' + formatUptime() + '`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩\n' +
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `𝗖𝗥𝗘𝗔𝗧𝗘𝗨𝗥 : Odkbxss`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩\n' +
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `𝗣𝗥𝗘𝗙𝗜𝗫𝗘 : !`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩\n' +
'┏━━━━━━━━━━━━━━━━━━🎩\n' +
'┃❏ `𝗥𝗔𝗠 : ' + getRam() + '`\n' +
'┗━━━━━━━━━━━━━━━━━━🎩';
      await sock.sendMessage(groupId, {
        text: aliveText,
        contextInfo: {
          externalAdReply: {
            title: '🚀 Darkboy — ONLINE',
            body: 'by Odkbxss | Hacking Éthique',
            mediaType: 1,
            renderLargerThumbnail: true,
            sourceUrl: config.channelLink,
          }
        }
      });
      break;
    }

    // ── Ping ──
    case '!ping': {
      var pStart = Date.now();
      await sock.sendPresenceUpdate('composing', groupId);
      var pLat = Date.now() - pStart;
      var pEmoji = pLat < 300 ? '🟢' : pLat < 700 ? '🟡' : '🔴';
      var pQuality = pLat < 300 ? 'Excellent' : pLat < 700 ? 'Bon' : 'Lent';
      await sock.sendMessage(groupId, {
        text: '╔══════════════════╗\n║   *PONG !*  🏓\n╚══════════════════╝\n\n' +
          pEmoji + ' *Latence:* ' + pLat + 'ms\n' +
          '⚡ *Qualité:* ' + pQuality + '\n' +
          '📶 *Statut:* En ligne\n' +
          '⏱️ *Uptime:* ' + formatUptime() + '\n' + channelFooter()
      });
      break;
    }

    // ── Uptime ──
    case '!uptime': {
      var uStr = formatUptime();
      var uStart = new Date(startTime).toLocaleString('fr-FR');
      await sock.sendMessage(groupId, {
        text: '╭━━━ *UPTIME* ━━━\n┃\n┃ 🟢 *Actif depuis:*\n┃ ' + uStr + '\n┃\n┃ 📅 *Démarrage:*\n┃ ' + uStart + '\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter()
      });
      break;
    }

    // ── Lien ──
    case '!lien':
      await sock.sendMessage(groupId, {
        text: '🔗 *Lien du groupe*\n\n' + (config.groupLink || 'Non configuré') + '\n\nPartage avec tes amis ! 🎩' + channelFooter(),
      });
      break;

    // ── Canal ──
    case '!canal':
      await sock.sendMessage(groupId, {
        text: '📡 *Chaîne WhatsApp — Odkbxss*\n\n' + config.channelLink + '\n\n🚀 Rejoins la chaîne de Odkbxss pour les updates !' + channelFooter(),
        contextInfo: {
          externalAdReply: {
            title: '📡 Chaîne Darkboy',
            body: 'Rejoins la chaîne de Odkbxss',
            mediaType: 1,
            renderLargerThumbnail: false,
            sourceUrl: config.channelLink,
          }
        }
      });
      break;

    // ── Règles ──
    case '!regles':
      await sock.sendMessage(groupId, {
        text: '╭━━━ *RÈGLES — DARK BOY* ━━━\n┃\n┃ 1️⃣ Respect mutuel\n┃ 2️⃣ Hacking éthique uniquement\n┃ 3️⃣ Pas de spam\n┃ 4️⃣ Pas de contenu illégal\n┃ 5️⃣ Questions liées à la cybersécurité\n┃ 6️⃣ Partage tes connaissances\n┃ 7️⃣ Admins = dernier mot\n┃\n┃ ⚠️ Violation = ban immédiat\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter(),
      });
      break;

    // ── À propos ──
    case '!apropos':
      await sock.sendMessage(groupId, {
        text: '╭━━━ *À PROPOS* ━━━\n┃\n┃ 🚀 *Darkboy Assistant v' + config.botVersion + '*\n┃\n┃ 👨‍💻 *Créateur:* Odkbxss\n┃ 🔒 *Spécialité:* Cybersécurité & CTF\n┃ ⚡ *Délai IA:* ~2.9 secondes\n┃ 🤖 *Basé sur:* Baileys\n┃\n┃ 📡 *Chaîne:*\n┃ ' + config.channelLink + '\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter(),
        contextInfo: {
          externalAdReply: {
            title: '🚀 Darkboy Bot',
            body: 'Créé par Odkbxss | Hacking Éthique',
            mediaType: 1,
            renderLargerThumbnail: false,
            sourceUrl: config.channelLink,
          }
        }
      });
      break;

    // ── Profil ──
    case '!profil': {
      var histCount = ai.getHistoryCount(senderId);
      await sock.sendMessage(groupId, {
        text: '╭━━━ *TON PROFIL* ━━━\n┃\n┃ 📛 *Nom:* ' + memberName + '\n┃ 📨 *Messages:* ' + (member ? member.messageCount : 0) + '\n┃ 💬 *Messages IA:* ' + histCount + '\n┃ ⭐ *Statut:* ' + (member && member.isAdmin ? 'Admin' : 'Membre') + '\n┃ 📅 *Depuis:* ' + (member && member.joinedAt ? new Date(member.joinedAt).toLocaleDateString('fr-FR') : 'Inconnu') + '\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter(),
      });
      break;
    }

    // ── Topics IA ──
    case '!topics':
      await sock.sendMessage(groupId, {
        text: '╭━━━ *SUJETS IA* ━━━\n┃\n┃ 🔓 Ethical Hacking\n┃ 🛡️ Cybersécurité défensive\n┃ 🏴 CTF\n┃ 🌐 Web Hacking (SQLi, XSS...)\n┃ 🔑 Cryptographie\n┃ 📡 Réseau & Protocoles\n┃ 🐧 Kali Linux\n┃ 🔧 Metasploit, Burp Suite, Nmap\n┃ 🐍 Python sécurité\n┃ 🔍 OSINT\n┃ ☁️ Cloud Security\n┃\n┃ 💬 Pose ta question directement !\n┃\n╰━━━━━━━━━━━━━━━' + channelFooter(),
      });
      break;

    // ── Reset IA ──
    case '!reset':
      ai.resetConversation(senderId);
      await sock.sendMessage(groupId, {
        text: '🔄 Historique réinitialisé ! Comment puis-je t\'aider ? 🚀' + channelFooter(),
      });
      break;

    // ── GroupInfo ──
    case '!groupinfo': {
      if (!groupId.endsWith('@g.us')) {
        await sock.sendMessage(groupId, { text: '❌ Cette commande fonctionne uniquement dans un groupe.' });
        break;
      }
      var gmeta = await sock.groupMetadata(groupId).catch(function() { return null; });
      if (!gmeta) { await sock.sendMessage(groupId, { text: '❌ Impossible de récupérer les infos du groupe.' }); break; }
      var gAdmins = gmeta.participants.filter(function(p) { return p.admin; }).length;
      var gMembers = gmeta.participants.length;
      var gOwner = gmeta.owner ? gmeta.owner.split('@')[0] : 'Inconnu';
      var gDesc = gmeta.desc || 'Aucune description.';
      var gInfoText =
        '╭━━━ *INFOS DU GROUPE* ━━━\n┃\n' +
        '┃ 📌 *Nom:* ' + gmeta.subject + '\n' +
        '┃ 👥 *Membres:* ' + gMembers + '\n' +
        '┃ ⭐ *Admins:* ' + gAdmins + '\n' +
        '┃ 👑 *Créateur:* @' + gOwner + '\n' +
        '┃ 📝 *Description:*\n┃ ' + gDesc.substring(0, 100) + (gDesc.length > 100 ? '...' : '') + '\n┃\n' +
        '╰━━━━━━━━━━━━━━━' + channelFooter();
      var gpPic = null;
      try { gpPic = await sock.profilePictureUrl(groupId, 'image'); } catch(e) {}
      if (gpPic) {
        await sock.sendMessage(groupId, { image: { url: gpPic }, caption: gInfoText, mentions: [gmeta.owner || ''] });
      } else {
        await sock.sendMessage(groupId, { text: gInfoText, mentions: [gmeta.owner || ''] });
      }
      break;
    }

    // ── VV (view once) ──
    case '!vv': {
      var quotedMsg = msg.message && msg.message.extendedTextMessage &&
        msg.message.extendedTextMessage.contextInfo &&
        msg.message.extendedTextMessage.contextInfo.quotedMessage;
      if (!quotedMsg) {
        await sock.sendMessage(groupId, { text: '❌ Réponds à un message view once (image/vidéo) avec !vv' });
        break;
      }
      var vvType = null;
      var vvMedia = null;
      if (quotedMsg.imageMessage && quotedMsg.imageMessage.viewOnce) { vvType = 'image'; vvMedia = quotedMsg.imageMessage; }
      else if (quotedMsg.videoMessage && quotedMsg.videoMessage.viewOnce) { vvType = 'video'; vvMedia = quotedMsg.videoMessage; }
      if (!vvType) {
        await sock.sendMessage(groupId, { text: '❌ Ce message n\'est pas un view once valide.' });
        break;
      }
      try {
        var { downloadMediaMessage } = require('baileys');
        var vvBuffer = await downloadMediaMessage(
          { message: {} },
          'buffer', {},
          { logger: console, reuploadRequest: sock.updateMediaMessage }
        ).catch(function() { return null; });
        if (vvBuffer) {
          if (vvType === 'image') await sock.sendMessage(groupId, { image: vvBuffer, caption: '🔓 View once déverrouillé 🚀' });
          else await sock.sendMessage(groupId, { video: vvBuffer, caption: '🔓 View once déverrouillé 🚀' });
        } else {
          await sock.sendMessage(groupId, { text: '⚠️ Impossible de télécharger ce view once.' });
        }
      } catch(e) {
        await sock.sendMessage(groupId, { text: '⚠️ Erreur lors du déverrouillage du view once.' });
      }
      break;
    }


    default:
      return false;
  }
  return true;
}

// ─── Handler Welcome/Goodbye ──────────────────────────────────
async function handleGroupParticipantUpdate(sock, update) {
  var groupId = update.id;
  var participants = update.participants;
  var action = update.action;

  if (action === 'add' && groupSettings.get(groupId, 'welcome', false)) {
    for (var i = 0; i < participants.length; i++) {
      var newMember = participants[i];
      var gmeta = await sock.groupMetadata(groupId).catch(function() { return null; });
      var count = gmeta ? gmeta.participants.length : '?';
      var groupName = gmeta ? gmeta.subject : 'ce groupe';
      var gpPic = null;
      try { gpPic = await sock.profilePictureUrl(groupId, 'image'); } catch(e) {}
      var welcomeCaption =
        '╭━━━ *BIENVENUE* ━━━\n┃\n' +
        '┃ 👋 *Bienvenue @' + newMember.split('@')[0] + ' !*\n┃\n' +
        '┃ 📌 *Groupe:* ' + groupName + '\n' +
        '┃ 👥 *Membres:* ' + count + '\n┃\n' +
        '┃ 📖 Tape *!menu* pour voir les commandes\n' +
        '┃ 🤖 Pose tes questions en hacking éthique !\n┃\n' +
        '╰━━━━━━━━━━━━━━━' + channelFooter();
      if (gpPic) {
        await sock.sendMessage(groupId, { image: { url: gpPic }, caption: welcomeCaption, mentions: [newMember] });
      } else {
        await sock.sendMessage(groupId, { text: welcomeCaption, mentions: [newMember] });
      }
    }
  }

  if (action === 'remove' && groupSettings.get(groupId, 'goodbye', false)) {
    for (var j = 0; j < participants.length; j++) {
      var leftMember = participants[j];
      var gm2 = await sock.groupMetadata(groupId).catch(function() { return null; });
      var remaining = gm2 ? gm2.participants.length : '?';
      var groupName2 = gm2 ? gm2.subject : 'le groupe';
      var gpPic2 = null;
      try { gpPic2 = await sock.profilePictureUrl(groupId, 'image'); } catch(e) {}
      var goodbyeCaption =
        '╭━━━ *AU REVOIR* ━━━\n┃\n' +
        '┃ 👋 *@' + leftMember.split('@')[0] + ' a quitté le groupe.*\n┃\n' +
        '┃ 📌 *Groupe:* ' + groupName2 + '\n' +
        '┃ 👥 *Membres restants:* ' + remaining + '\n┃\n' +
        '╰━━━━━━━━━━━━━━━' + channelFooter();
      if (gpPic2) {
        await sock.sendMessage(groupId, { image: { url: gpPic2 }, caption: goodbyeCaption, mentions: [leftMember] });
      } else {
        await sock.sendMessage(groupId, { text: goodbyeCaption, mentions: [leftMember] });
      }
    }
  }
}

// ─── Check antilink ───────────────────────────────────────────
async function checkAntiLink(sock, msg, groupId, senderId, isAdmin) {
  if (isAdmin) return false;
  if (!groupSettings.get(groupId, 'antilink', false)) return false;
  var text = msg.message && (
    (msg.message.conversation) ||
    (msg.message.extendedTextMessage && msg.message.extendedTextMessage.text) || ''
  );
  if (!text) return false;
  var linkRegex = /(https?:\/\/|www\.|chat\.whatsapp\.com)[^\s]*/i;
  if (!linkRegex.test(text)) return false;
  await sock.sendMessage(groupId, {
    text: '🔗 ⚠️ @' + senderId.split('@')[0] + ' Les liens sont interdits dans ce groupe !',
    mentions: [senderId]
  });
  try { await sock.groupParticipantsUpdate(groupId, [senderId], 'remove'); } catch(e) {}
  return true;
}

module.exports = {
  handleAdminCommand,
  handleMemberCommand,
  handleGroupParticipantUpdate,
  checkAntiLink,
  isBotActive,
  setBotActive,
};
