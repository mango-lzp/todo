import { Client, getClient } from '@tauri-apps/api/http';
import { useCallback, useEffect, useRef } from 'react';

export const useRequest = () => {
  const clientRef = useRef<Client>()
  useEffect(() => {
    (async () => {
      clientRef.current = await getClient()
    })();
  }, [])


  const request = useCallback(async <T>(...args: Parameters<Client['request']>) => {
    if(!clientRef.current) {
      clientRef.current = await getClient()
    }

    return clientRef.current.request<T>(...args)
  }, [])

  return { request }
};