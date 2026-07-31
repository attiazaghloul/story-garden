import { rm } from 'node:fs/promises'

// Do not bundle the previously published wrapper APK inside the native APK.
await rm(new URL('../dist/StoryGarden.apk', import.meta.url), { force: true })
