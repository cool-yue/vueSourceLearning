/* @flow */

import { isRegExp } from 'shared/util'
import { getFirstComponentChild } from 'core/vdom/helpers/index'

// Cache是一个key为string,值可以没有,如果有就是VNode
type VNodeCache = { [key: string]: ?VNode };

// keep-alive组件传入的属性的值的类型
const patternTypes: Array<Function> = [String, RegExp, Array]

// 取得组件名字
function getComponentName (opts: ?VNodeComponentOptions): ?string {
  return opts && (opts.Ctor.options.name || opts.tag)
}

// 检查组件的名字是否匹配pattern
function matches (pattern: string | RegExp | Array<string>, name: string): boolean {
  if (Array.isArray(pattern)) {
    return pattern.indexOf(name) > -1
  } else if (typeof pattern === 'string') {
    return pattern.split(',').indexOf(name) > -1
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  /* istanbul ignore next */
  return false
}

function pruneCache (cache: VNodeCache, current: VNode, filter: Function) {
  for (const key in cache) {
    const cachedNode: ?VNode = cache[key]
    if (cachedNode) {
      const name: ?string = getComponentName(cachedNode.componentOptions)
      if (name && !filter(name)) {
        // 这里表示有name存在,并且不缓存
        if (cachedNode !== current) {
          pruneCacheEntry(cachedNode)
        }
        cache[key] = null
      }
    }
  }
}

// 销毁组件,移除dom
function pruneCacheEntry (vnode: ?VNode) {
  if (vnode) {
    vnode.componentInstance.$destroy()
  }
}

export default {
  name: 'keep-alive',
  // 抽象组件
  abstract: true,

  // 字符串正则数组
  // 这里主要是作为是否缓存内部的组件通过名称来过滤
  props: {
    include: patternTypes,
    exclude: patternTypes
  },

  created () {
    this.cache = Object.create(null)
  },

  destroyed () {
    for (const key in this.cache) {
      pruneCacheEntry(this.cache[key])
    }
  },

  watch: {
    include (val: string | RegExp | Array<string>) {
      pruneCache(this.cache, this._vnode, name => matches(val, name))
    },
    exclude (val: string | RegExp | Array<string>) {
      pruneCache(this.cache, this._vnode, name => !matches(val, name))
    }
  },

  render () {
    // 在this.$slot.default中拿到第一个具有componentOpitons的vnode
    const vnode: VNode = getFirstComponentChild(this.$slots.default)
    // 拿到componentOptions
    const componentOptions: ?VNodeComponentOptions = vnode && vnode.componentOptions
    if (componentOptions) {
      // check pattern
      // 拿到组件名name
      const name: ?string = getComponentName(componentOptions)
      if (name && (
        (this.include && !matches(this.include, name)) ||
        (this.exclude && matches(this.exclude, name))
      )) {
        // 满足不缓存的条件,直接返回vnode
        return vnode
      }
      // 程序跑到这里来,证明已经需要缓存了
      // 如果有key就用key呗
      // 如果没有key,就要用cid+::tag
      // 同一个构造器可能会被注册为不同的本地组件
      const key: ?string = vnode.key == null
        // same constructor may get registered as different local components
        // so cid alone is not enough (#3269)
        // 这里之所以能够解决问题,是因为cid虽然可以一样
        // 但是对于自定义组件的tag,它是以vue-component-n-tag来进行命名的
        // 其中这个n属于自增长的整数,因此双重保险确保组件的唯一性
        ? componentOptions.Ctor.cid + (componentOptions.tag ? `::${componentOptions.tag}` : '')
        : vnode.key
      if (this.cache[key]) {
        // 如果cache中存在这个key
        // 那么就把vnode.componentInstance赋值为this.cache[key].componentInstance
        vnode.componentInstance = this.cache[key].componentInstance
      } else {
        // 缓存未命中
        // 存入vnode
        this.cache[key] = vnode
      }
      // 并且在data中方一个keepAlive的标志位
      vnode.data.keepAlive = true
    }
    return vnode
  }
}

// <keep-alive><abc></abc><bcd></bcd></keep-alive>
// 在render的时候,children会变成$slot.default
// 那么第一个children就是<abc></abc>
// 于是这个<keep-alive></keep-alive>组件返回的是第一个自定义组件
// 只要instance还在内存里面那么就可以认为状态是保持的
