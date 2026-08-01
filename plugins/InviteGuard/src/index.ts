// index.ts
import { storage } from '@vendetta/plugin'
import patchInviteEmbed from './patches/InviteEmbedPatch'  // ← This should match
import Settings from './Settings'

let patches: (() => void)[] = []

export default {
    onLoad: () => {
        storage.showCustomButton ??= true
        
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