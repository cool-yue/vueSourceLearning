/* @flow */

import config from '../config'
import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { mark, measure } from '../util/perf'
import { initLifecycle, callHook } from './lifecycle'
import { initProvide, initInjections } from './inject'
import { extend, mergeOptions, formatComponentName } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  Vue.prototype._init = function (options?: Object) {
    const vm: Component = this
    // a uid
    vm._uid = uid++

    let startTag, endTag
    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      startTag = `vue-perf-init:${vm._uid}`
      endTag = `vue-perf-end:${vm._uid}`
      mark(startTag)
    }

    // a flag to avoid this being observed
    // obeserver会在data函数返回的对象或者data对象里面插一个__ob__
    // 表示这是state,将_isVue插入到这里,表示这个对象首先是Vue
    // 实例，不用去观察他，而是要观察他的data
    vm._isVue = true
    // merge options
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.

      // 一般情况下这里没有_isComponent的字段
      initInternalComponent(vm, options)
    } else {
      // 一般会运行这里
      // 把Vm上的一些属性，Vue上面的一些属性
      // 也就是说是全局API
      // util set delete nextTick options use mixin cid extend component directive filter version compile
      // options为用户传入的一些属性
      // vm为vm上面的属性,比如_uid
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm.constructor),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      // 这里主要是方便开发用的
      initProxy(vm)
    } else {
      // 这里在production模式下,只在vm上给一个_renderProxy,然后赋值为自己
      vm._renderProxy = vm
    }
    // expose real self
    // _self赋值给自己
    vm._self = vm
    initLifecycle(vm) // 绑定了几个flag比如isMounted,初始化了$parent,$children,并且找到了第一个no abstract作为parent并且把他的children属性插入当前vm
    initEvents(vm) // 创建了vm._events和vm._hasHookEvent,在_parentListeners属性中取这个值，如有有值就push到vm的_events里面
    initRender(vm) // 这里初始化了vm._vnode,_staticTrees,parentVnode,parentContext,初始化了$slot,$scopedSlots ,初始化了createElement,这里及以上都做了组件创建前的准备工作
    callHook(vm, 'beforeCreate') // 这里调用beforeCreate钩子,如果是render渲染的就是'hook:开头的事件',如果是传入Vue的option传入的hook,就调用'vm['beforeCreate']'
    initInjections(vm) // resolve injections before data/props
    // 这里的注入就是父子组件通信的状态,provide/inject一对api,这里先不管，先看后面的
    initState(vm)// 这里绑定了用户传入的options,有就init,没有就不init
    // options.props 存在就绑定,就跳过,因为用户可能传入的是render
    // options.methods
    // options.data
    // options.computed
    // options.watch
    initProvide(vm) // resolve provide after data/props
    // 这里的注入就是父子组件通信的状态,provide/inject一对api,这里先不管，先看后面的
    callHook(vm, 'created')

    /* istanbul ignore if */
    if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
      vm._name = formatComponentName(vm, false)
      mark(endTag)
      measure(`${vm._name} init`, startTag, endTag)
    }

    if (vm.$options.el) {
      vm.$mount(vm.$options.el) // 有el元素就挂载
      // 很有意思的是$mount这个函数并不是在lifecycle里面定义
      // 而是在runtime with complier里面定义
    }
  }
}

function initInternalComponent (vm: Component, options: InternalComponentOptions) {
  const opts = vm.$options = Object.create(vm.constructor.options)
  // 创建一个对象,该对象的_proto_指向vm.constructor.options
  // doing this because it's faster than dynamic enumeration.
  // 这里这么指定值的原因的就是比动态去遍历出来效率更高
  // 有的放矢
  opts.parent = options.parent // 拿到parent
  opts.propsData = options.propsData // 拿到propsData
  opts._parentVnode = options._parentVnode // 拿到父Vnode
  opts._parentListeners = options._parentListeners // 拿到父Listener
  opts._renderChildren = options._renderChildren//
  opts._componentTag = options._componentTag
  opts._parentElm = options._parentElm
  opts._refElm = options._refElm
  if (options.render) {
    opts.render = options.render
    opts.staticRenderFns = options.staticRenderFns
  }
}

// 这里就是通过拿到祖先的options和extend options通过去重
// 最后并入到本地的Ctor的options
// 最后更新了option的Cotr赋值给options.components[options.name] = Ctor
export function resolveConstructorOptions (Ctor: Class<Component>) {
  let options = Ctor.options
  if (Ctor.super) {
    const superOptions = resolveConstructorOptions(Ctor.super)
    const cachedSuperOptions = Ctor.superOptions
    if (superOptions !== cachedSuperOptions) {
      // super option changed,
      // need to resolve new options.
      Ctor.superOptions = superOptions
      // check if there are any late-modified/attached options (#4976)
      const modifiedOptions = resolveModifiedOptions(Ctor)
      // update base extend options
      if (modifiedOptions) {
        extend(Ctor.extendOptions, modifiedOptions)
      }
      options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
      if (options.name) {
        options.components[options.name] = Ctor
      }
    }
  }
  return options
}
// 处理修改的options
function resolveModifiedOptions (Ctor: Class<Component>): ?Object {
  let modified
  const latest = Ctor.options
  const extended = Ctor.extendOptions
  const sealed = Ctor.sealedOptions
  for (const key in latest) {
    if (latest[key] !== sealed[key]) {
      if (!modified) modified = {}
      modified[key] = dedupe(latest[key], extended[key], sealed[key])
    }
  }
  return modified
}

// 去重
function dedupe (latest, extended, sealed) {
  // compare latest and sealed to ensure lifecycle hooks won't be duplicated
  // between merges
  if (Array.isArray(latest)) {
    const res = []
    sealed = Array.isArray(sealed) ? sealed : [sealed]
    extended = Array.isArray(extended) ? extended : [extended]
    for (let i = 0; i < latest.length; i++) {
      // push original options and not sealed options to exclude duplicated options
      if (extended.indexOf(latest[i]) >= 0 || sealed.indexOf(latest[i]) < 0) {
        res.push(latest[i])
      }
    }
    return res
  } else {
    return latest
  }
}
