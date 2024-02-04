import React from "react";
import { useRequest } from "@/hooks";

export default () => {
  const [value, setValue] = React.useState("")
  const { request } = useRequest()
  request({
    url: 'baidu.com',
    method: 'GET'
  })
  return (
    <div>
      <button><h1>+</h1></button>
      <input value={value} onChange={e => setValue(e.target.value)} type="text" />
    </div>
  );
}