import { IRoute } from "./utils"

// todo ..
// allow user to extend routes
export const generatorGetRouterCode = (fileList: IRoute[]) => {
return `export function getRoutes() {
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
`
}

export const generatorRouterIndex = () => {
return `import React, { Component } from 'react'
import { Routes, Route } from "react-router-dom";
import { getRoutes } from './getRouter';

const asyncComponent = (importComponent) => {
  class InnerComponent extends Component<any, any> {
    constructor(porps) {
      super(porps)
      this.state = {
        component: null
      }
    }
    componentDidMount() {
      importComponent()
        .then(cmp => {
          this.setState({ component: cmp.default }) //.default 是模块有default输出接口
        })
    }

    render() {
      const C = this.state.component;
      return C ? <C {...this.props} /> : null;
    }
  }

  return <InnerComponent />
}

const getRouterList = (routers: ReturnType<typeof getRoutes>) => {
  const _concat = (_routers: any[]) => {
    return _routers?.map(router =>
      <Route
        key={router.path}
        path={router.path}
        element={asyncComponent(router.component.loader)}
      >
        {_concat(router?.routes)}
      </Route>
    )
  }
  
  return _concat(routers)
}

const Router = () => {
  const routers = getRoutes()
  const routerList = getRouterList(routers)
  
  return (
    <Routes>
      {routerList}
    </Routes>
  );
}

export default Router
`
}