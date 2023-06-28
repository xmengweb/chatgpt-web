import { defineStore } from 'pinia'
import { getToken, removeToken, setToken } from './helper'
import { store } from '@/store'
import { fetchSession } from '@/api'
import axios from '@/utils/request/axios'

export interface AuthState {
  token: string | undefined
  session: { auth: boolean } | null
  tokenInfo: {
    Id?: number
    code?: string
    total?: number
    remain?: number
    notes?: string
    state?: number
  }
}

export const useAuthStore = defineStore('auth-store', {
  state: (): AuthState => ({
    token: getToken(),
    // { status: 'Success', message: '', data: { auth: hasAuth }
    session: null,
    tokenInfo: {},
  }),

  actions: {
    async getSession() {
      try {
        const { data } = await fetchSession<{ auth: boolean }>()
        this.session = { ...data }
        return Promise.resolve(data)
      }
      catch (error) {
        return Promise.reject(error)
      }
    },
    async getCodeInfo() {
      const res = await axios.post('/codeRemain', {
        code: this.token,
      })
      if (res.data.status === 'Fail')
        this.removeToken()
      else this.tokenInfo = res.data.info
    },
    async useCodeOnce(type: string) {
      if (this.tokenInfo.remain) {
        await axios.post('/codeUse', {
          code: this.token,
          type,
        })
        await this.getCodeInfo()
        if (this.tokenInfo.remain === undefined || this.tokenInfo.remain <= 0)
          this.removeToken()
      }
    },

    setToken(token: string) {
      this.token = token
      setToken(token)
    },

    removeToken() {
      this.token = undefined
      this.tokenInfo = {}
      removeToken()
    },
  },
})

export function useAuthStoreWithout() {
  return useAuthStore(store)
}
