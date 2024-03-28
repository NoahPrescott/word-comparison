import { constants, promises as fs } from 'fs'
import { platform } from 'os'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const projectDirname = resolve(dirname(__dirname))

/**
 * @param {string} directory
 */
async function renameTemplates(directory) {
  const files = await fs.readdir(directory, { withFileTypes: true })

  for (const file of files) {
    const fullPath = join(directory, file.name)

    if (file.isDirectory()) {
      // Recursive call for directories
      await renameTemplates(fullPath)
    } else if (file.isFile() && file.name.endsWith('-template.ts')) {
      // Rename file if it ends with '-template.ts'
      const newFileName = file.name.replace('-template.ts', '.ts')
      const newFullPath = join(directory, newFileName)
      await fs.rename(fullPath, newFullPath)
      console.log(`Renamed ${file.name} to ${newFileName}`)
    }
  }
}

async function createLink() {
  // const packageRoot = process.env.INIT_CWD
  const sourceFile = join(projectDirname, 'eslint.config.mjs')
  const targetFile = join(projectDirname, 'eslint.config.js')

  console.log(`linking ${sourceFile} to ${targetFile}`)

  try {
    // Check if targetFile exists and is a symlink
    const exists = await fs
      .access(targetFile, constants.F_OK)
      .then(() => true)
      .catch(() => false)
    if (exists) {
      const stats = await fs.lstat(targetFile)
      if (stats.isSymbolicLink() || stats.isFIFO()) {
        // If targetFile is a symlink, remove it
        await fs.unlink(targetFile)
      } else {
        // If targetFile exists but is not a symlink, throw an error
        throw new Error(`Target file ${targetFile} exists and is not a symlink.`)
      }
    }

    if (platform() === 'win32') {
      // On Windows, create a symbolic link
      await fs.symlink(sourceFile, targetFile, 'file')
      console.log('Symbolic link created successfully.')
    } else {
      // On Unix-like systems, create a hard link
      await fs.link(sourceFile, targetFile)
      console.log('Hard link created successfully.')
    }

    const srcDir = join(projectDirname, 'src')
    await renameTemplates(srcDir)
  } catch (err) {
    console.error('Error creating link:: ', err)
  }
}

createLink().catch((err) => {
  console.error(err)
})
