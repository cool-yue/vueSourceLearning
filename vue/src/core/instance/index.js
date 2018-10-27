import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

// 这里定义了Vue的构造函数
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)
  ) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

initMixin(Vue)  // 这里仅仅在Vue.prototype上面引入了_init这个方法,这个方法主要是执行了一个vue是实例实例化的过程中所有的东西，例如钩子，属性处理，初始化
stateMixin(Vue) // 在Vue原型属性上定义了几个属性,Vue.prototype.$data,Vue.protoType.$props,Vue.protoType.$set,Vue.protoType.$delete,Vue.protoType.$watch
eventsMixin(Vue) // 在Vue原型属性上定义了几个属性,Vue.protoType.$on,Vue.protoType.$once,Vue.protoType.$off,Vue.protoType.$emit
lifecycleMixin(Vue) // 在Vue原型属性上定义了几个属性,Vue.protoType._update,Vue.protoType.$forceUpdate,Vue.protoType.$destroy
renderMixin(Vue) // 在Vue原型属性上定义了几个属性,Vue.prototype.$nextTick,Vue.prototype._render,还有茫茫多的renderHelper

export default Vue
