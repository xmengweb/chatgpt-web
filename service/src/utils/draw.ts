import axios from 'axios'
import type { IDrawIng, IDrawResult } from 'src/type'

const TOKEN = process.env.MIDJOURNEY_TOKEN

const request = axios.create({
  baseURL: 'https://api.zxx.im/v1/',
  timeout: 10000,
})

export interface IRequestCallBody {
  action: string
  fast: boolean
  token: string
  prompt?: string
  imageId?: string
  index?: number
}

class ApiClient {
  public token: string

  constructor(token: string) {
    this.token = token
  }

  callApi(action: string, fast = true, prompt = null, imageId = null, index = null) {
    // 构造API请求的payload
    const payload: IRequestCallBody = {
      action,
      fast,
      token: this.token,
    }

    if (prompt)
      payload.prompt = prompt

    if (imageId)
      payload.imageId = imageId

    if (index !== null)
      payload.index = index

    // 发送POST请求调用API
    return new Promise<IDrawIng>((resolve, reject) => {
      request.post('/request', payload).then((res) => {
        resolve(res.data)
      }).catch((err) => {
        reject(err)
      })
    })
  }

  getWebhookStatus(taskId: string) {
    // 发送GET请求获取Webhook状态
    return new Promise<IDrawResult>((resolve, reject) => {
      request.get(`webhook/${taskId}`).then((res) => {
        resolve(res.data)
      }).catch((err) => {
        reject(err)
      })
    })
  }
}

export const drawClient = new ApiClient(TOKEN)
