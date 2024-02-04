import chokidar from 'chokidar'
import { throttle } from 'lodash'
import { existsSync, statSync } from 'fs';
import { join } from 'path';

interface Opts {
  path?: string
  singular?: string
  callback: () => void
}

function isDirectoryAndExist(path: string) {
  return existsSync(path) && statSync(path).isDirectory();
}

export class Watcher {
  watcherList: chokidar.FSWatcher[] = []
  callback: () => void

  constructor (config: Opts) {
    this.callback = config.callback

    if(config.path) {
      this.watcherList.push(this.createWatcher(config.path))
    } else {
      let cwd = process.cwd()
      let absSrcPath = cwd;
      if (isDirectoryAndExist(join(cwd, 'src'))) {
        absSrcPath = join(cwd, 'src');
      }
      const absPagesPath = config.singular
      ? join(absSrcPath, 'page')
      : join(absSrcPath, 'pages');
  
      this.watcherList.push(this.createWatcher(absPagesPath))
    }
  }

  unwatch () {
    this.watcherList.forEach((watcher) => watcher.close())
  }

  createWatcher (path: string) {
    const watcher = chokidar.watch(path, {
      // ignore .dot_files and _mock.js
      ignored: /(^|[\/\\])(_mock.js$|\..)/,
      ignoreInitial: true,
    });
    watcher.on(
      'all',
      throttle(async (event, path) => {
        this.callback()
      }, 100),
    );
    // watcher.on(
    //   'add',
    //   throttle(async (event, path) => {
        
    //   }, 100),
    // );
    // watcher.on(
    //   'unlink',
    //   throttle(async (event, path) => {
        
    //   }, 100),
    // );

    return watcher
  }
}