/* @flow */

import { warn } from '../util/index'
import { hasSymbol } from 'core/util/env'
import { defineReactive, observerState } from '../observer/index'

// provide和inject是一对使用
// 在elementUI中用于高阶组件的使用,用于表单,列表渲染
// 父组件提供provide
// 子组件进行inject注入对应的属性

// provide可以是一个函数,也可以是一个对象
// 总而言之把vm._provided作为存放provide内容的地方
export function initProvide (vm: Component) {
  const provide = vm.$options.provide
  if (provide) {
    vm._provided = typeof provide === 'function'
      ? provide.call(vm)
      : provide
  }
}

export function initInjections (vm: Component) {
  const result = resolveInject(vm.$options.inject, vm)
  if (result) {
    observerState.shouldConvert = false
    Object.keys(result).forEach(key => {
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        defineReactive(vm, key, result[key], () => {
          warn(
            `Avoid mutating an injected value directly since the changes will be ` +
            `overwritten whenever the provided component re-renders. ` +
            `injection being mutated: "${key}"`,
            vm
          )
        })
      } else {
        // 把抽取出来的值进行响应式的定义
        defineReactive(vm, key, result[key])
      }
    })
    observerState.shouldConvert = true
  }
}

export function resolveInject (inject: any, vm: Component): ?Object {
  if (inject) {
    // inject is :any because flow is not smart enough to figure out cached
    const result = Object.create(null)
    const keys = hasSymbol
        ? Reflect.ownKeys(inject)
        : Object.keys(inject)

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      const provideKey = inject[key]
      // 这里初始化起点
      let source = vm
      // 拿着inject里面的值,不同的循环去parent中找provide
      // 直到找到根元素
      while (source) {
        if (source._provided && provideKey in source._provided) {
          result[key] = source._provided[provideKey]
          // 注意这里用到了break,表示找到最近的具有同名的provide的parent
          break
        }
        source = source.$parent
      }
      if (process.env.NODE_ENV !== 'production' && !source) {
        warn(`Injection "${key}" not found`, vm)
      }
    }
    // 把provide的值和inject的整合到result中
    return result
  }
}
