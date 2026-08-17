#!/usr/bin/env node

import crypto from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const WINDOWS_ASSETS = {
  whisper: {
    url: 'https://github.com/ggml-org/whisper.cpp/releases/download/v1.9.2/whisper-bin-x64.zip',
    sha256: '49dcc16de826f20bd53d44f947a1ae49dfa81f86cad67a64d80820cb192d674a',
    archiveName: 'whisper-v1.9.2-x64.zip',
  },
  ffmpeg: {
    url: 'https://github.com/BtbN/FFmpeg-Builds/releases/download/autobuild-2026-08-16-13-00/ffmpeg-n8.1.2-44-g7c533d0f86-win64-gpl-8.1.zip',
    sha256: 'd2425b12dc746a2b044148c6100440d4065876ac4ed6e3eb13a68437b7719796',
    archiveName: 'ffmpeg-8.1-win64-gpl.zip',
  },
  whisperBaseModel: {
    url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/5359861c739e955e79d9a303bcbc70fb988958b1/ggml-base.bin',
    sha1: '465707469ff3a37a2b9b8d8f89f2f99de7299dac',
  },
}

function download(url, destination) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, response => {
      if (
        response.statusCode >= 300 &&
        response.statusCode < 400 &&
        response.headers.location
      ) {
        response.resume()
        return download(response.headers.location, destination)
          .then(resolve)
          .catch(reject)
      }

      if (response.statusCode !== 200) {
        response.resume()
        reject(new Error(`Download failed with HTTP ${response.statusCode}`))
        return
      }

      const file = fs.createWriteStream(destination)
      response.pipe(file)
      file.on('finish', () => file.close(resolve))
      file.on('error', reject)
    })
    request.on('error', reject)
  })
}

function digest(filePath, algorithm) {
  const hash = crypto.createHash(algorithm)
  hash.update(fs.readFileSync(filePath))
  return hash.digest('hex')
}

function verifyDigest(filePath, algorithm, expected) {
  const actual = digest(filePath, algorithm)
  if (actual !== expected) {
    throw new Error(
      `${algorithm.toUpperCase()} mismatch for ${path.basename(filePath)}. Expected ${expected}, got ${actual}`
    )
  }
}

function expandZip(archivePath, destination) {
  fs.mkdirSync(destination, { recursive: true })
  execFileSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      `Expand-Archive -LiteralPath '${archivePath.replaceAll("'", "''")}' -DestinationPath '${destination.replaceAll("'", "''")}' -Force`,
    ],
    { stdio: 'inherit' }
  )
}

function findFile(root, names) {
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) {
      const nested = findFile(fullPath, names)
      if (nested) return nested
    } else if (names.includes(entry.name)) {
      return fullPath
    }
  }
  return null
}

function copyMatchingFiles(root, destination, names) {
  for (const name of names) {
    const source = findFile(root, [name])
    if (source) {
      fs.copyFileSync(source, path.join(destination, name))
    }
  }
}

async function installVerifiedArchive(asset, installer) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiki-runtime-'))
  const archivePath = path.join(workDir, asset.archiveName)
  const extractDir = path.join(workDir, 'extract')

  try {
    console.log(`Downloading verified runtime asset: ${asset.url}`)
    await download(asset.url, archivePath)
    verifyDigest(archivePath, 'sha256', asset.sha256)
    console.log(`Verified SHA-256: ${asset.sha256}`)
    expandZip(archivePath, extractDir)
    installer(extractDir)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}

async function installVerifiedFile(asset, destination) {
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kiki-runtime-'))
  const temporaryPath = path.join(workDir, path.basename(destination))

  try {
    console.log(`Downloading verified model asset: ${asset.url}`)
    await download(asset.url, temporaryPath)
    verifyDigest(temporaryPath, 'sha1', asset.sha1)
    console.log(`Verified SHA-1: ${asset.sha1}`)
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    fs.copyFileSync(temporaryPath, destination)
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true })
  }
}

async function prepareWindowsRuntime() {
  if (process.platform !== 'win32') {
    console.log('Kiki pinned runtime preparation is currently Windows-specific; skipping.')
    return
  }
  if (process.arch !== 'x64') {
    throw new Error(`Unsupported Windows architecture for pinned runtime: ${process.arch}`)
  }

  const backendDir = path.join(process.cwd(), 'resources', 'backend')
  const binDir = path.join(backendDir, 'bin')
  const modelsDir = path.join(backendDir, 'models')
  fs.mkdirSync(binDir, { recursive: true })
  fs.mkdirSync(modelsDir, { recursive: true })

  const whisperTarget = path.join(binDir, 'main.exe')
  if (!fs.existsSync(whisperTarget)) {
    await installVerifiedArchive(WINDOWS_ASSETS.whisper, extractDir => {
      const cli = findFile(extractDir, ['whisper-cli.exe', 'main.exe'])
      if (!cli) throw new Error('Verified whisper.cpp archive did not contain a CLI executable')
      fs.copyFileSync(cli, whisperTarget)
      copyMatchingFiles(extractDir, binDir, [
        'ggml-base.dll',
        'ggml-cpu.dll',
        'ggml.dll',
        'whisper.dll',
      ])
    })
  } else {
    console.log(`Whisper runtime already present: ${whisperTarget}`)
  }

  const ffmpegTarget = path.join(binDir, 'ffmpeg.exe')
  if (!fs.existsSync(ffmpegTarget)) {
    await installVerifiedArchive(WINDOWS_ASSETS.ffmpeg, extractDir => {
      const executable = findFile(extractDir, ['ffmpeg.exe'])
      if (!executable) throw new Error('Verified FFmpeg archive did not contain ffmpeg.exe')
      fs.copyFileSync(executable, ffmpegTarget)
    })
  } else {
    console.log(`FFmpeg runtime already present: ${ffmpegTarget}`)
  }

  const baseModelTarget = path.join(modelsDir, 'whisper-base.bin')
  if (!fs.existsSync(baseModelTarget)) {
    await installVerifiedFile(WINDOWS_ASSETS.whisperBaseModel, baseModelTarget)
  } else {
    console.log(`Whisper Base model already present: ${baseModelTarget}`)
  }
}

prepareWindowsRuntime().catch(error => {
  console.error(`Kiki Windows runtime preparation failed: ${error.message}`)
  process.exit(1)
})
