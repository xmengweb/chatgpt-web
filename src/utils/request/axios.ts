import axios, { type AxiosResponse } from 'axios'
import { useAuthStore } from '@/store'

const service = axios.create({
  baseURL: import.meta.env.VITE_GLOB_API_URL,
  timeout: 10000000,
})

service.interceptors.request.use(
  (config) => {
    const code = useAuthStore().token
    // if (token)
    //   config.headers.Authorization = `Bearer ${token}`
    if (code)
      config.headers.Authorization = `Bearer ${code}`
    return config
  },
  (error) => {
    return Promise.reject(error.response)
  },
)

service.interceptors.response.use(
  (response: AxiosResponse): AxiosResponse => {
    if (response.status === 200)
      return response

    throw new Error(response.status.toString())
  },
  (error) => {
    return Promise.reject(error)
  },
)

export default service
