/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

// 全局绑定3个函数,set,delete,nextTick

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick
// 全局绑定一个options,这个options的原型对象为null
  Vue.options = Object.create(null)

// ASSET_TYPES = [
//   'component',
//   'directive',
//   'filter'
// ]
// 下面是在Vue上的options上面创建3个原型为null的属性,分别是components,directives,filters
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  // 在options._base中引用Vue构造函数,上面说的是用这个属性主要是为了分辨出这个base构造器,当通过Weex来继承一个plain-object的时候时候
  Vue.options._base = Vue

// 在options.components对象中扩展3个内建组件,它们是KeepAlive,Transition,TransitionGroup
  extend(Vue.options.components, builtInComponents)

// 下面初始化,他们的顺序不要颠倒
  initUse(Vue) // 在Vue上绑定Use方法,详细见Use.js
  initMixin(Vue) // 在Vue上绑定mixin方法,详细见mixin.js
  initExtend(Vue) // 在Vue上绑定extend方法,详细见Extend
  initAssetRegisters(Vue) // // 绑定了3个函数,Vue.component,Vue.directive,Vue.filter
}
