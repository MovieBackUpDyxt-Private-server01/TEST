const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { cmd, commands } = require('../command');
const { sinhalaSub } = require('mrnima-moviedl');
const oce = "`";

cmd({
    pattern: "sinhalasub",
    react: '📑',
    category: "download",
    desc: "Search movies on sinhalasub and get download links",
    filename: __filename
}, async (conn, m, mek, { from, q, reply }) => {
    try {
        if (!q) return await reply('Please provide a search query! (e.g., Deadpool)');

        const movie = await sinhalaSub();
        const results = await movie.search(q);
        const searchResults = results.result.slice(0, 10);

        if (!searchResults || searchResults.length === 0) {
            return await reply(`No results found for: ${q}`);
        }

        let resultsMessage = `📽️ *Search Results for* "${q}":\n\n`;
        searchResults.forEach((result, index) => {
            resultsMessage += `*${index + 1}.* ${result.title}\n🔗 Link: ${result.link}\n\n`;
        });

        const sentMsg = await conn.sendMessage(from, { text: resultsMessage }, { quoted: mek });
        const messageID = sentMsg.key.id;

        // Listener for selecting the movie
        const movieSelectionListener = async (messageUpdate) => {
            const replyMek = messageUpdate.messages[0];
            if (!replyMek.message) return;
            const messageType = replyMek.message.conversation || replyMek.message.extendedTextMessage?.text;
            const senderJid = replyMek.key.remoteJid;

            // Ensure the message is a reply to the search results and from the same user
            const isReplyToSentMsg = replyMek.message.extendedTextMessage?.contextInfo?.stanzaId === messageID && senderJid === from;

            if (isReplyToSentMsg) {
                let [selectedNumber, targetJid] = messageType.split(/\s*\|\s*/);
                const selectedMovieIndex = parseInt(selectedNumber.trim()) - 1;
                targetJid = targetJid ? targetJid.trim() : from;

                if (selectedMovieIndex >= 0 && selectedMovieIndex < searchResults.length) {
                    const selectedMovie = searchResults[selectedMovieIndex];
                    const apiUrl = `https://zazie-md-apis.vercel.app/api/sinhalasub/movie?url=${encodeURIComponent(selectedMovie.link)}`;

                    try {
                        const response = await axios.get(apiUrl);
                        const movieData = response.data.result;

                        // Prepare the movieInfo message
                        let movieInfo = `*🎬 ${movieData.title}*\n\n` +
                            `*1 | Movie Information*\n\n`;

                        // Adding available qualities starting from option 2
                        const allLinks = [...(movieData.dl_links3 || []), ...(movieData.dl_links || [])];
                        allLinks.forEach((link, index) => {
                            const optionNumber = index + 2; // Start from 2
                            movieInfo += `*${optionNumber} | ${link.quality}* [ ${link.size} ]\n`;
                        });

                        movieInfo += `\n📩 *Please reply with the option number.*`;

                        const optionsMsg = await conn.sendMessage(from, { text: movieInfo }, { quoted: replyMek });
                        const optionsMessageID = optionsMsg.key.id;

                        // Listener for selecting the option (Get Details or Quality)
                        const optionSelectionListener = async (optionUpdate) => {
                            const optionReply = optionUpdate.messages[0];
                            if (!optionReply.message) return;
                            const optionType = optionReply.message.conversation || optionReply.message.extendedTextMessage?.text;
                            const optionSenderJid = optionReply.key.remoteJid;

                            // Ensure the message is a reply to the options message and from the same user
                            const isReplyToOptionsMsg = optionReply.message.extendedTextMessage?.contextInfo?.stanzaId === optionsMessageID && optionSenderJid === from;

                            if (isReplyToOptionsMsg) {
                                let [optionSelected, targetJid] = optionType.split(/\s*\|\s*/);
                                targetJid = targetJid ? targetJid.trim() : from;

                                const selectedOptionIndex = parseInt(optionSelected.trim());

                                if (selectedOptionIndex === 1) {
                                    // React to indicate processing
                                    await conn.sendMessage(from, { react: { text: '🔄', key: optionReply.key } });

                                    // Send Movie Details
                                    const details = `🫧 _*ᴛɪᴛʟᴇ: ${movieData.title}*_\n\n\n🎛️ *ʀᴇʟᴇᴀꜱᴇ: ${movieData.date}*\n\n🌐 *ᴄᴏᴜɴᴛʀʏ: ${movieData.country}*\n\n⏱️ *ᴅᴜʀᴀᴛɪᴏɴ: ${movieData.runtime}*\n\n🚀 *ɪᴍᴅʙ: ${movieData.imdb}*\n\n❄️ *ᴅɪʀᴇᴄᴛᴏʀ: ${movieData.director}*\n\n⚡ *ᴜʀʟ:*  ${selectedMovie.link}\n\n🎭 *ᴄᴀꜱᴛ: ${movieData.cast.map(c => c.cast_name).join(', ')}*\n\n📝 *ᴄᴀᴛᴇɢᴏʀɪᴇ: ${movieData.category.join(', ')}*\n\n> ＱＵＥＥＮ ＺＡＺＩＥ-ＭＤ-Ｖ3`;
                                    await conn.sendMessage(targetJid, {
                                        text: details,
                                        contextInfo: {
                                            externalAdReply: {
                                                title: movieData.title,
                                                body: movieData.title,
                                                thumbnailUrl: movieData.thumbnail,// Use the URL directly here
                                                sourceUrl: selectedMovie.link,
                                                mediaType: 1,
                                                renderLargerThumbnail: true
                                            }
                                        }                        
                                    });

                                    // React to indicate completion
                                    await conn.sendMessage(from, { react: { text: '📜', key: optionReply.key } });

                                } else if (selectedOptionIndex >= 2 && selectedOptionIndex < (2 + allLinks.length)) {
                                    const qualityIndex = selectedOptionIndex - 2;
                                    const selectedLink = allLinks[qualityIndex];
                                    const downloadUrl = selectedLink.link;

                                    // React to indicate download is starting
                                    await conn.sendMessage(from, { react: { text: '⬇️', key: optionReply.key } });

                                    // Handle different download URL formats
                                    if (downloadUrl.includes('pixeldrain.com')) {
                                        const fileId = downloadUrl.split('/').pop();
                                        const directDownloadUrl = `https://pixeldrain.com/api/file/${fileId}`;
                                    
                                    await conn.sendMessage(from, { react: { text: '⬆️', key: optionReply.key } });
                                    
                                        await conn.sendMessage(targetJid, {
                                            document: { url: directDownloadUrl },
                                            mimetype: "video/mp4",
                                            fileName: `⛒ ${movieData.title} - ${selectedLink.quality} ⛒.mp4`,
                                            caption: `${movieData.title}\n\n${oce}( ${selectedLink.quality} )${oce}\n\n> ＱＵＥＥＮＺＡＺＩＥ-ＭＤ-Ｖ3`,
                                        });

                                        // React to indicate completion
                                        await conn.sendMessage(from, { react: { text: '✔️', key: optionReply.key } });

                                    } else if (downloadUrl.includes('ddl.sinhalasub.net')) {
                                        
                                    await conn.sendMessage(from, { react: { text: '⬆️', key: optionReply.key } });
                                        // Send the direct download URL as a document link                                    
                                        await conn.sendMessage(targetJid, {
                                            document: { url: downloadUrl },
                                            mimetype: "video/mp4",
                                            fileName: `⛒ ${movieData.title} - ${selectedLink.quality} ⛒.mp4`,
                                            caption: `${movieData.title}\n\n${oce}( ${selectedLink.quality} )${oce}\n\n> ＱＵＥＥＮＺＡＺＩＥ-ＭＤ-Ｖ3`,
                                        });

                                      // React to indicate completion
                                        await conn.sendMessage(from, { react: { text: '✔️', key: optionReply.key } });

                                    } else {
                                        await reply('Unsupported link format. Cannot process the download.');
                                    }
                                } else {
                                    await reply("Invalid option. Please reply with a valid number.");
                                }
                            }
                        };

                        conn.ev.on('messages.upsert', optionSelectionListener);
                    } catch (error) {
                        console.error('Error fetching movie details:', error);
                        await reply('An error occurred while fetching movie details. Please try again.');
                    }
                } else {
                    await reply('Invalid selection. Please reply with a valid number.');
                }
            }
        };

        // Add listener for movie selection
        conn.ev.on('messages.upsert', movieSelectionListener);
    } catch (error) {
        console.error('Error during search:', error);
        reply('An error occurred while searching!');
    }
});
