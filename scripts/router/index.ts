import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path'
import { getConventionRoutes, loadDotEnv } from './utils';
import { Watcher } from './watch'
import { generatorGetRouterCode, generatorRouterIndex } from './generator';

const envPath = resolve(__dirname, '../../.env')
loadDotEnv(envPath)

const pagePath = resolve(envPath, '../', process.env.ROUTER_CONFIG ?? './', './pages') || resolve(__dirname, '../../src/pages')

const generator = () => {
  const conventionRouter = getConventionRoutes({ base: pagePath })
  const routerList = Object.values(conventionRouter)

  if(!existsSync(resolve(pagePath, '../.router/getRouter.ts'))){
    mkdirSync(resolve(pagePath, '../.router'))
  }

  writeFileSync(resolve(pagePath, '../.router/getRouter.ts'), generatorGetRouterCode(routerList))
  writeFileSync(resolve(pagePath, '../.router/index.tsx'), generatorRouterIndex())
}

const watcher = new Watcher({
  callback: generator
})

generator()
console.log('routers done')

process.on('SIGINT', () => watcher.unwatch())
process.on('SIGTERM', () => watcher.unwatch())