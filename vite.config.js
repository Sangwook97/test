import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const currentFilePath = fileURLToPath(import.meta.url)
const currentDirectory = dirname(currentFilePath)

/**
 * 프로젝트의 data 폴더를 빌드 결과물인 dist/data로 복사합니다.
 *
 * 개발 환경:
 *   my-board/data/*.json
 *
 * Netlify 배포 결과:
 *   my-board/dist/data/*.json
 */
function copyLocalDataPlugin() {
  return {
    name: 'copy-localhub-data',

    // npm run build를 실행할 때만 동작합니다.
    apply: 'build',

    closeBundle() {
      const sourceDirectory = resolve(currentDirectory, 'data')
      const targetDirectory = resolve(currentDirectory, 'dist', 'data')

      if (!existsSync(sourceDirectory)) {
        throw new Error(
          `[copy-localhub-data] 원본 데이터 폴더를 찾을 수 없습니다: ${sourceDirectory}`,
        )
      }

      // 이전 빌드 결과에 남아 있는 data 폴더를 제거합니다.
      rmSync(targetDirectory, {
        recursive: true,
        force: true,
      })

      // dist/data 폴더를 다시 만듭니다.
      mkdirSync(targetDirectory, {
        recursive: true,
      })

      // data 폴더 안의 모든 JSON 파일을 dist/data로 복사합니다.
      cpSync(sourceDirectory, targetDirectory, {
        recursive: true,
      })

      console.log('[copy-localhub-data] data 폴더 복사 완료')
      console.log(`[copy-localhub-data] 원본: ${sourceDirectory}`)
      console.log(`[copy-localhub-data] 대상: ${targetDirectory}`)
    },
  }
}

export default defineConfig({
  plugins: [
    vue(),
    copyLocalDataPlugin(),
  ],
})