import { findByName } from '@vendetta/metro'
import { after, before } from '@vendetta/patcher'

interface Embed {
    type: string
    url: string
    image: {
        url: string
        proxy_url: string
        width: number
        height: number
        srcIsAnimated?: boolean
    }
}

interface Message {
    content: string | Array<{ content?: string }>
    embeds?: Embed[]
    __realsticker?: boolean
}

const patches: (() => void)[] = []
const RowManager = findByName('RowManager')

const stickerCdnRegex = /https:\/\/(?:cdn|media)\.discordapp\.(?:com|net)\/stickers\/(\d+)\.(png|gif|webp|apng)(?:\?size=\d+)?/
const ezgifRegex = /https:\/\/(?:i\.)?ezgif\.com\/[^\s)]+/
const markdownLinkRegex = /^\[(.*?)\]\((https:\/\/.*?)\)$/

patches.push(
    before('generate', RowManager.prototype, ([data]: [{ rowType: number; message: Message; __realsticker?: boolean }]) => {
        if (data.rowType !== 1) return

        let content = data.message.content
        if (typeof content !== 'string' || !content.length) return

        let stickerUrl: string | null = null
        let cleanContent = content.trim()

        const mdMatch = cleanContent.match(markdownLinkRegex)
        if (mdMatch) {
            const url = mdMatch[2]
            if (stickerCdnRegex.test(url) || ezgifRegex.test(url)) {
                stickerUrl = url
                cleanContent = ''
            }
        }

        if (!stickerUrl) {
            const cdnMatch = cleanContent.match(stickerCdnRegex) || cleanContent.match(ezgifRegex)
            if (cdnMatch) {
                stickerUrl = cdnMatch[0]
                cleanContent = cleanContent.replace(stickerUrl, '').trim()
            }
        }

        if (!stickerUrl) return

        data.message.content = cleanContent

        const embeds = (data.message.embeds as Embed[]) || []
        
        // Check if the URL is animated (gif/apng)
        const isAnimated = stickerUrl.includes('.gif') || stickerUrl.includes('.apng')

        embeds.push({
            type: 'image',
            url: stickerUrl,
            image: {
                url: stickerUrl,
                proxy_url: stickerUrl,
                width: 160,
                height: 160,
                srcIsAnimated: isAnimated,
            },
        })

        data.message.embeds = embeds
        data.__realsticker = true
    })
)

patches.push(
    after('generate', RowManager.prototype, ([data]: [{ rowType: number; __realsticker?: boolean }], row: { message: Message }) => {
        if (data.rowType !== 1 || data.__realsticker !== true) return

        const { content } = row.message
        if (Array.isArray(content)) {
            if (content.length === 0 || (content.length === 1 && content[0].content?.trim() === '')) {
                row.message.content = []
            }
        }
    })
)

export const onUnload = () => patches.forEach(unpatch => unpatch())
