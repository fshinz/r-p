// index.ts
import { storage } from '@vendetta/plugin'
import patchInviteEmbed from './patches/InviteEmbedPatch'
import Settings from './Settings'

let patches: (() => void)[] = []

export default {
    onLoad: () => {
        storage.showCustomButton ??= true
        storage.buttonLabel ??= "My Button"
        
        patches.push(patchInviteEmbed())
    },
    onUnload: () => {
        for (const unpatch of patches) {
            unpatch()
        }
        patches = []
    },
    settings: Settings,
}