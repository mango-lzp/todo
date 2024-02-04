export function getRoutes() {
  const routes = [
    {
      path: "/",
      component: { loader: () => import(/* webpackChunkName: 'layouts__index' */'@/layouts')},
      routes: [${fileList.map(file => `{
        path: "/${file.path}",
        component: { loader: () => import('@/pages${file.absPath}') }
      }`).join(',')}]
    }
  ];

  return routes;
}