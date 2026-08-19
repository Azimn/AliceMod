#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const appConfigPath = path.join(root, 'app-config.json')

if (!fs.existsSync(appConfigPath)) {
  const localConfig = {
    VITE_GOOGLE_CLIENT_ID: '',
    VITE_GOOGLE_CLIENT_SECRET: '',
  }

  fs.writeFileSync(appConfigPath, `${JSON.stringify(localConfig, null, 2)}\n`, 'utf8')
  console.log('Created local app-config.json with Google integration disabled.')
} else {
  console.log('Using existing app-config.json.')
}
