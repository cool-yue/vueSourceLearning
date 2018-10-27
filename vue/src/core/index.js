import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'

// 初始化全局API
initGlobalAPI(Vue)

// 在Vue.prototype上面绑定$isServer,get函数为isServerRending,这里先不管
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering
})

// 这里再绑定一个$ssrContext属性
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

Vue.version = '__VERSION__'

export default Vue
