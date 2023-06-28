import type { Router } from 'vue-router'
import axios from '@/utils/request/axiosAdmin'
import { useAuthStoreWithout } from '@/store/modules/auth'
import { ss } from '@/utils/storage'

export function setupPageGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    if (to.name === 'admin' || to.name === 'Charge' || to.name === 'Arguments') {
      if (ss.get('token')) {
        try {
          await axios.get('/veryToken')
          next()
        }
        catch (error) {
          next('/login')
        }
      }
      else {
        next('/login')
      }
    }
    else {
      const authStore = useAuthStoreWithout()
      if (!authStore.session) {
        try {
          const data = await authStore.getSession()
          if (String(data.auth) === 'false' && authStore.token)
            authStore.removeToken()
          next()
        }
        catch (error) {
          if (from.path !== '/500')
            next({ name: '500' })
          else
            next()
        }
      }
      else {
        next()
      }
    }
  })
}
