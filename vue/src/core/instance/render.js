/* @flow */

import {
  warn,
  nextTick,
  toNumber,
  toString,
  looseEqual,
  emptyObject,
  handleError,
  looseIndexOf,
  defineReactive
} from '../util/index'

import VNode, {
  cloneVNodes,
  createTextVNode,
  createEmptyVNode
} from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

import { createElement } from '../vdom/create-element'
import { renderList } from './render-helpers/render-list'
import { renderSlot } from './render-helpers/render-slot'
import { resolveFilter } from './render-helpers/resolve-filter'
import { checkKeyCodes } from './render-helpers/check-keycodes'
import { bindObjectProps } from './render-helpers/bind-object-props'
import { renderStatic, markOnce } from './render-helpers/render-static'
import { bindObjectListeners } from './render-helpers/bind-object-listeners'
import { resolveSlots, resolveScopedSlots } from './render-helpers/resolve-slots'

// 实例上初始化render
export function initRender (vm: Component) {
  // 先把_vnode初始化为null
  // 静态树设置为null
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null
  // 拿到自定义的vnode对象(tag为非内建标签)
  const parentVnode = vm.$vnode = vm.$options._parentVnode // the placeholder node in parent tree
  // 拿到父亲的上下文环境,这个context就是父Vue实例
  // 由于子组件需要new,那么很多关键的东西都是需要父子之间建立关联的比如slot
  // 父节点传入东西,子节点再去渲染,关键是要拿要到父节点才知道父节点传入了什么
  const renderContext = parentVnode && parentVnode.context
  // _renderChildren属性
  vm.$slots = resolveSlots(vm.$options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // so that we get proper render context inside it.
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // internal version is used by render functions compiled from templates

  //vm._c上面绑定createElment,传入false
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.

  // vm是上面绑定$createElement,传入true
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated

  // 拿到parentData,这个data是parent标签的一些标签类属性
  const parentData = parentVnode && parentVnode.data
  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', vm.$options._parentListeners, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    // 在vm上面的$attrs对象里面的属性,代理到父亲节点的attr
    // 在vm上面的$lister对象里面的属性,代理到父节点的_parentListeners
    defineReactive(vm, '$attrs', parentData && parentData.attrs, null, true)
    defineReactive(vm, '$listeners', vm.$options._parentListeners, null, true)
  }
}

// 原型上绑定nextTick
export function renderMixin (Vue: Class<Component>) {
  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }


  // 原型上绑定了_render的方法,返回一个VNode

  Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const {
      render,
      staticRenderFns,
      _parentVnode
    } = vm.$options

    if (vm._isMounted) {
      // clone slot nodes on re-renders
      for (const key in vm.$slots) {
        vm.$slots[key] = cloneVNodes(vm.$slots[key])
      }
    }

    vm.$scopedSlots = (_parentVnode && _parentVnode.data.scopedSlots) || emptyObject

    if (staticRenderFns && !vm._staticTrees) {
      vm._staticTrees = []
    }
    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    vm.$vnode = _parentVnode
    // render self
    let vnode
    try {
      // 通常情况下一个render函数是这么来写
      // render:function(h) {return h(参数)}
      // 之所以这里要传入一个h,是因为在调用render的时候需要用到createELement
      // 正好这个vm.$createElement作为参数被传入了
      // 如果用了tempalte,complier会生成自己的模板最后直接调用
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      handleError(e, vm, `render function`)
      // return error render result,
      // or previous vnode to prevent render error causing blank component
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        vnode = vm.$options.renderError
          ? vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
          : vm._vnode
      } else {
        vnode = vm._vnode
      }
    }
    // return empty vnode in case the render function errored out
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }

  // internal render helpers.
  // these are exposed on the instance prototype to reduce generated render
  // code size.
  Vue.prototype._o = markOnce
  Vue.prototype._n = toNumber
  Vue.prototype._s = toString
  Vue.prototype._l = renderList
  Vue.prototype._t = renderSlot
  Vue.prototype._q = looseEqual
  Vue.prototype._i = looseIndexOf
  Vue.prototype._m = renderStatic
  Vue.prototype._f = resolveFilter
  Vue.prototype._k = checkKeyCodes
  Vue.prototype._b = bindObjectProps
  Vue.prototype._v = createTextVNode
  Vue.prototype._e = createEmptyVNode
  Vue.prototype._u = resolveScopedSlots
  Vue.prototype._g = bindObjectListeners
}
