import { existsSync, readFileSync, readdirSync, statSync, lstatSync } from 'fs';
import { parse } from 'dotenv'
import { parse as babelParse } from '@babel/parser'
import { join, resolve, relative, extname } from 'path';
import traverse from '@babel/traverse';

export function loadDotEnv(envPath: string): void {
  if (existsSync(envPath)) {
    const parsed = parse(readFileSync(envPath, 'utf-8')) || {};
    Object.keys(parsed).forEach((key) => {
      if (!process.env.hasOwnProperty(key)) {
        process.env[key] = parsed[key];
      }
    });
  }
}

export function createRouteId(file: string) {
  return winPath(stripFileExtension(file));
}

export function stripFileExtension(file: string) {
  return file.replace(/\.[a-z0-9]+$/i, '');
}

export function byLongestFirst(a: string, b: string): number {
  return b.length - a.length;
}

export function findParentRouteId(
  routeIds: string[],
  childRouteId: string,
): string | undefined {
  return routeIds.find((id) => childRouteId.startsWith(`${id}/`));
}

export function winPath(path: string) {
  const isExtendedLengthPath = /^\\\\\?\\/.test(path);
  if (isExtendedLengthPath) {
    return path;
  }
  return path.replace(/\\/g, '/');
}

export function isReactComponent(code: string) {
  const ast = babelParse(code, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx', 'classProperties']
  });
  let hasJSXElement = false;
  traverse(ast as any, {
    JSXElement(path) {
      hasJSXElement = true;
      path.stop();
    },
  });
  return hasJSXElement;
}

export function getFileList(root: string) {
  if (!existsSync(root)) return [];
  return readdirSync(root).filter((file) => {
    const absFile = join(root, file);
    const fileStat = statSync(absFile);
    const isDirectory = fileStat.isDirectory();
    const isFile = fileStat.isFile();
    if (
      isDirectory &&
      ['components', 'component', 'utils', 'util'].includes(file)
    ) {
      return false;
    }
    if (file.charAt(0) === '.') return false;
    if (file.charAt(0) === '_') return false;
    // exclude test file
    if (/\.(test|spec|e2e)\.(j|t)sx?$/.test(file)) return false;
    // d.ts
    if (/\.d\.ts$/.test(file)) return false;
    if (isFile) {
      if (!/\.(j|t)sx?$/.test(file)) return false;
      const content = readFileSync(absFile, 'utf-8');
      if (!isReactComponent(content)) return false;
    }
    return true;
  });
}

export interface IRoute {
  path: string;
  absPath: string;
  file: string;
  id: string;
  parentId?: string;
  [key: string]: any;
}

export function defineRoutes(callback: (defineRoute: Function) => void) {
  const routes: { [key: string]: IRoute } = Object.create(null);
  const parentRoutes: IRoute[] = [];
  const defineRoute = (opts: {
    path: string;
    file: string;
    options?: {};
    children: Function;
  }) => {
    opts.options = opts.options || {};
    const parentRoute =
      parentRoutes.length > 0 ? parentRoutes[parentRoutes.length - 1] : null;
    const parentId = parentRoute?.id;
    const parentAbsPath = parentRoute?.absPath;
    const absPath = [parentAbsPath, opts.path].join('/');
    const route = {
      // 1. root index route path: '/'
      // 2. nested children route path
      //    - dir
      //      - some.ts  -> 'some'
      //      - index.ts -> ''
      //    - dir.tsx    -> '/dir'
      path: absPath === '/' ? '/' : opts.path,
      id: createRouteId(opts.file),
      parentId,
      file: opts.file,
      absPath,
    };
    routes[route.id] = route;
    if (opts.children) {
      parentRoutes.push(route);
      opts.children();
      parentRoutes.pop();
    }
  };
  callback(defineRoute);
  return routes;
}

const routeModuleExts = ['.js', '.jsx', '.ts', '.tsx', '.md', '.mdx', '.vue'];
export function isRouteModuleFile(opts: { file: string; exclude?: RegExp[] }) {
  // TODO: add cache strategy
  for (const excludeRegExp of opts.exclude || []) {
    if (
      opts.file &&
      excludeRegExp instanceof RegExp &&
      excludeRegExp.test(opts.file)
    ) {
      return false;
    }
  }

  // console.log(resolve('src/pages/',opts.file))
  const content = readFileSync(resolve('src/pages/',opts.file), 'utf-8')
  return routeModuleExts.includes(extname(opts.file)) && isReactComponent(content)
}

export function getConventionRoutes(opts: {
  base: string;
  prefix?: string;
  exclude?: RegExp[];
}) {
  const files: { [routeId: string]: string } = {};
  if (!(existsSync(opts.base) && statSync(opts.base).isDirectory())) {
    return {} as {[key: string]: IRoute};
  }
  visitFiles({
    dir: opts.base,
    visitor: (file) => {
      const routeId = createRouteId(file);
      if (isRouteModuleFile({ file: winPath(file), exclude: opts.exclude })) {
        files[routeId] = winPath(file);
      }
    },
  });

  const routeIds = Object.keys(files).sort(byLongestFirst);

  function defineNestedRoutes(defineRoute: any, parentId?: string) {
    const childRouteIds = routeIds.filter(
      (id) => findParentRouteId(routeIds, id) === parentId,
    );
    for (let routeId of childRouteIds) {
      let routePath = createRoutePath(
        parentId ? routeId.slice(parentId.length + 1) : routeId,
      );
      defineRoute({
        path: routePath,
        file: `${opts.prefix || ''}${files[routeId]}`,
        children() {
          defineNestedRoutes(defineRoute, routeId);
        },
      });
    }
  }

  return defineRoutes(defineNestedRoutes);
}

function visitFiles(opts: {
  dir: string;
  visitor: (file: string) => void;
  baseDir?: string;
}): void {
  opts.baseDir = opts.baseDir || opts.dir;
  for (let filename of readdirSync(opts.dir)) {
    let file = resolve(opts.dir, filename);
    let stat = lstatSync(file);
    if (stat.isDirectory()) {
      visitFiles({ ...opts, dir: file });
    } else if (
      stat.isFile() &&
      ['.tsx', '.ts', '.js', '.jsx', '.md', '.mdx', '.vue'].includes(
        extname(file)
      )
    ) {
      opts.visitor(relative(opts.baseDir, file));
    }
  }
}

function createRoutePath(routeId: string): string {
  let path = routeId
    // routes/$ -> routes/*
    // routes/nested/$.tsx (with a "routes/nested.tsx" layout)
    .replace(/^\$$/, '*')
    // routes/docs.$ -> routes/docs/*
    // routes/docs/$ -> routes/docs/*
    .replace(/(\/|\.)\$$/, '/*')
    // routes/$user -> routes/:user
    .replace(/\$/g, ':')
    // routes/not.nested -> routes/not/nested
    .replace(/\./g, '/');

  // /index/index -> ''
  path = /\b\/?index\/index$/.test(path) ? path.replace(/\/?index$/, '') : path;
  // /(?<!:)\/?\bindex$/
  // e/index true
  // index true
  // e/:index false
  // e/index -> e  index -> ''  e/:index -> e/:index
  path = /\b\/?(?<!:)index$/.test(path) ? path.replace(/\/?index$/, '') : path;
  path = /\b\/?README$/.test(path) ? path.replace(/\/?README$/, '') : path;

  return path;
}