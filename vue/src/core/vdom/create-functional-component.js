/* @flow */

import VNode from './vnode'
import { createElement } from './create-element'
import { resolveInject } from '../instance/inject'
import { resolveSlots } from '../instance/render-helpers/resolve-slots'

import {
  isDef,
  camelize,
  validateProp
} from '../util/index'

// 函数式组件,没有data,没有实例
export function createFunctionalComponent (
  Ctor: Class<Component>,
  propsData: ?Object,
  data: VNodeData,
  context: Component,
  children: ?Array<VNode>
): VNode | void {
  const props = {}
  const propOptions = Ctor.options.props
  if (isDef(propOptions)) {
    for (const key in propOptions) {
      props[key] = validateProp(key, propOptions, propsData || {})
    }
  } else {
    if (isDef(data.attrs)) mergeProps(props, data.attrs)
    if (isDef(data.props)) mergeProps(props, data.props)
  }
  // ensure the createElement function in functional components
  // gets a unique context - this is necessary for correct named slot check
  const _context = Object.create(context)
  const h = (a, b, c, d) => createElement(_context, a, b, c, d, true)
  // 这里是关键,这里的render的调用的第二个参数,把options里面的内容
  // 全部放进了第二对象中
  const vnode = Ctor.options.render.call(null, h, {
    data,
    props,
    children,
    parent: context,
    listeners: data.on || {},
    injections: resolveInject(Ctor.options.inject, context),
    slots: () => resolveSlots(children, context)
  })
  if (vnode instanceof VNode) {
    vnode.functionalContext = context
    vnode.functionalOptions = Ctor.options
    if (data.slot) {
      (vnode.data || (vnode.data = {})).slot = data.slot
    }
  }
  return vnode
}

function mergeProps (to, from) {
  for (const key in from) {
    to[camelize(key)] = from[key]
  }
}
