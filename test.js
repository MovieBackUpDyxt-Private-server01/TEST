const config = require('../config')
const { cmd, commands } = require('../command')
const { getBuffer, getGroupAdmins, getRandom, h2k, isUrl, Json, runtime, sleep, fetchJson} = require('../lib/functions')

var desct = "Chat with "

var needus = "*Hellow.! i am frozen md whatsapp user bot. How can i help you.?*" 

var cantf = "*Server is busy. Try again later.!*"


cmd({
    pattern: "chatgpt",
    alias: ["ai","gpt","openai","chat"],
    react: '👾',
    desc: desct + "chatgpt",
    category: "ai",
    use: '.chatgpt <query>',
    filename: __filename
},
async(conn, mek, m,{from, l, prefix, quoted, body, isCmd, command, args, q, isGroup, sender, senderNumber, botNumber2, botNumber, pushname, isMe, isOwner, groupMetadata, groupName, participants, groupAdmins, isBotAdmins, isAdmins, reply}) => {
try{
if(!q) return reply(needus)

let res = await fetchJson('https://dark-yasiya-api-new.vercel.app/ai/chatgpt?q=' + q)

return await reply(res.result)
} catch (e) {
await conn.sendMessage(from, { react: { text: '❌', key: mek.key } })
reply(cantf)
console.log(e)
}
})
