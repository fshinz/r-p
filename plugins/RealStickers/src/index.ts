import { findByName } from '@revenge-mod/metro'
import { after, before } from '@vendetta/patcher'
import type { Embed, Message } from 'vendetta-extras'

const patches: (() => void)[] = []
const RowManager = findByName('RowManager')

// Regex for Discord CDN stickers, Ezgif conversions, and Markdown Hyperlinks
const stickerCdnRegex = /https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/stickers\/(\d+)\.(png|gif|webp|apng)(?:\?size=\d+)?/
const ezgifRegex = /https:\/\/(?:i\.)?ezgif\.com\/[^\s)]+/
const markdownLinkRegex = /^\[(.*?)\]\((https:\/\/.*?)\)$/

patches.push(
    before('generate', RowManager.prototype, ([data]) => {
        if (data.rowType !== 1) return

        let content = data.message.content as string
        if (!content?.length) return

        let stickerUrl: string | null = null
        let cleanContent = content.trim()

        // 1. Check if the entire message is a Markdown hyperlink: [Sticker Name](URL)
        const mdMatch = cleanContent.match(markdownLinkRegex)
        if (mdMatch) {
            const url = mdMatch[2]
            if (stickerCdnRegex.test(url) || ezgifRegex.test(url)) {
                stickerUrl = url
                cleanContent = ''
            }
        }

        // 2. Otherwise, check for plain sticker URLs (CDN or Ezgif)
        if (!stickerUrl) {
            const cdnMatch = cleanContent.match(stickerCdnRegex) || cleanContent.match(ezgifRegex)
            if (cdnMatch) {
                stickerUrl = cdnMatch[0]
                cleanContent = cleanContent.replace(stickerUrl, '').trim()
            }
        }

        if (!stickerUrl) return

        // Strip the URL/Hyperlink from raw chat content
        data.message.content = cleanContent

        // Inject sticker image embed
        const embeds = (data.message.embeds as Embed[]) || []
        embeds.push({
            type: 'image',
            url: stickerUrl,
            image: {
                url: stickerUrl,
                proxy_url: stickerUrl,
                width: 160,
                height: 160,
            },
        })

        data.message.embeds = embeds
        data.__realsticker = true
    })
)

patches.push(
    after('generate', RowManager.prototype, ([data], row) => {
        if (data.rowType !== 1 || data.__realsticker !== true) return

        // Clean up empty AST text structures if the message was ONLY a sticker
        const { content } = row.message as Message
        if (Array.isArray(content)) {
            if (content.length === 0 || (content.length === 1 && content[0].content?.trim() === '')) {
                row.message.content = []
            }
        }
    })
)

export const onUnload = () => patches.forEach(unpatch => unpatch())
