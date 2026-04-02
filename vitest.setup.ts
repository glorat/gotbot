import fs from 'fs'
import path from 'path'

process.env.NODE_ENV = 'test'

const testDataPath = path.resolve('./test-data')
const seedPath = path.join(testDataPath, 'test_stt.seed.json')
const runtimePath = path.join(testDataPath, 'test_stt.json')

if (fs.existsSync(seedPath)) {
  fs.copyFileSync(seedPath, runtimePath)
}
